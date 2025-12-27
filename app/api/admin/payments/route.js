import { NextResponse } from "next/server";
import { db } from "@/configs/db";
import { PAYMENT_RECORD_TABLE, USER_TABLE } from "@/configs/schema";
import { eq, desc, sql, gte, and, between } from "drizzle-orm";

/**
 * GET /api/admin/payments
 * Get payment records with analytics
 */
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const period = searchParams.get('period') || 'all'; // 'today', 'week', 'month', 'year', 'all'
        const status = searchParams.get('status'); // 'completed', 'pending', 'failed', 'refunded'
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');

        // Calculate date range based on period
        const now = new Date();
        let startDate = null;

        switch (period) {
            case 'today':
                startDate = new Date(now.setHours(0, 0, 0, 0));
                break;
            case 'week':
                startDate = new Date(now.setDate(now.getDate() - 7));
                break;
            case 'month':
                startDate = new Date(now.setMonth(now.getMonth() - 1));
                break;
            case 'year':
                startDate = new Date(now.setFullYear(now.getFullYear() - 1));
                break;
        }

        // Build conditions
        const conditions = [];
        if (startDate) {
            conditions.push(gte(PAYMENT_RECORD_TABLE.createdAt, startDate));
        }
        if (status) {
            conditions.push(eq(PAYMENT_RECORD_TABLE.status, status));
        }

        // Get payments
        let payments;
        if (conditions.length > 0) {
            payments = await db.select()
                .from(PAYMENT_RECORD_TABLE)
                .where(and(...conditions))
                .orderBy(desc(PAYMENT_RECORD_TABLE.createdAt))
                .limit(limit)
                .offset(offset);
        } else {
            payments = await db.select()
                .from(PAYMENT_RECORD_TABLE)
                .orderBy(desc(PAYMENT_RECORD_TABLE.createdAt))
                .limit(limit)
                .offset(offset);
        }

        // Calculate analytics
        const allPayments = await db.select()
            .from(PAYMENT_RECORD_TABLE)
            .where(eq(PAYMENT_RECORD_TABLE.status, 'completed'));

        const totalRevenue = allPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
        const totalTransactions = allPayments.length;

        // This month's revenue
        const thisMonthStart = new Date();
        thisMonthStart.setDate(1);
        thisMonthStart.setHours(0, 0, 0, 0);

        const monthlyPayments = await db.select()
            .from(PAYMENT_RECORD_TABLE)
            .where(and(
                eq(PAYMENT_RECORD_TABLE.status, 'completed'),
                gte(PAYMENT_RECORD_TABLE.createdAt, thisMonthStart)
            ));

        const monthlyRevenue = monthlyPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

        // Today's revenue
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const todayPayments = await db.select()
            .from(PAYMENT_RECORD_TABLE)
            .where(and(
                eq(PAYMENT_RECORD_TABLE.status, 'completed'),
                gte(PAYMENT_RECORD_TABLE.createdAt, todayStart)
            ));

        const todayRevenue = todayPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

        // Revenue by plan
        const revenueByPlan = {};
        allPayments.forEach(p => {
            const plan = p.plan || 'unknown';
            revenueByPlan[plan] = (revenueByPlan[plan] || 0) + parseFloat(p.amount || 0);
        });

        // Monthly trend (last 6 months)
        const monthlyTrend = [];
        for (let i = 5; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
            const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

            const monthPayments = allPayments.filter(p => {
                const pDate = new Date(p.createdAt);
                return pDate >= monthStart && pDate <= monthEnd;
            });

            monthlyTrend.push({
                month: monthStart.toLocaleString('default', { month: 'short', year: 'numeric' }),
                revenue: monthPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0),
                count: monthPayments.length
            });
        }

        // Paying users count
        const payingUsers = await db.select({ count: sql`count(distinct ${PAYMENT_RECORD_TABLE.userEmail})` })
            .from(PAYMENT_RECORD_TABLE)
            .where(eq(PAYMENT_RECORD_TABLE.status, 'completed'));

        return NextResponse.json({
            payments,
            analytics: {
                totalRevenue: totalRevenue.toFixed(2),
                totalTransactions,
                monthlyRevenue: monthlyRevenue.toFixed(2),
                todayRevenue: todayRevenue.toFixed(2),
                payingUsers: parseInt(payingUsers[0]?.count || 0),
                averageOrderValue: totalTransactions > 0 ? (totalRevenue / totalTransactions).toFixed(2) : '0.00',
                revenueByPlan,
                monthlyTrend
            }
        });
    } catch (error) {
        console.error('Error fetching payments:', error);
        return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
    }
}

/**
 * POST /api/admin/payments
 * Manually record a payment (for admin use)
 */
export async function POST(req) {
    try {
        const {
            userEmail,
            amount,
            currency = 'lkr',
            plan,
            planType = 'one_time',
            creditsAdded = 0,
            status = 'completed',
            paymentMethod,
            notes,
            adminEmail
        } = await req.json();

        if (!userEmail || !amount || !plan) {
            return NextResponse.json({ error: 'User email, amount, and plan are required' }, { status: 400 });
        }

        // Record the payment
        const result = await db.insert(PAYMENT_RECORD_TABLE).values({
            userEmail,
            amount: amount.toString(),
            currency,
            plan,
            planType,
            creditsAdded,
            status,
            paymentMethod,
            metadata: { notes, recordedBy: adminEmail, manual: true }
        }).returning();

        // If credits were added and payment is completed, update user credits
        if (creditsAdded > 0 && status === 'completed') {
            await db.update(USER_TABLE)
                .set({
                    credits: sql`${USER_TABLE.credits} + ${creditsAdded}`,
                    isMember: true,
                    updatedAt: new Date()
                })
                .where(eq(USER_TABLE.email, userEmail));
        }

        return NextResponse.json({
            success: true,
            payment: result[0]
        });
    } catch (error) {
        console.error('Error recording payment:', error);
        return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 });
    }
}

/**
 * PUT /api/admin/payments
 * Update payment status (refund, etc.)
 */
export async function PUT(req) {
    try {
        const { id, status, adminEmail } = await req.json();

        if (!id || !status) {
            return NextResponse.json({ error: 'Payment ID and status are required' }, { status: 400 });
        }

        const result = await db.update(PAYMENT_RECORD_TABLE)
            .set({
                status,
                updatedAt: new Date(),
                metadata: sql`jsonb_set(COALESCE(metadata, '{}'), '{updatedBy}', ${JSON.stringify(adminEmail)})`
            })
            .where(eq(PAYMENT_RECORD_TABLE.id, id))
            .returning();

        return NextResponse.json({
            success: true,
            payment: result[0]
        });
    } catch (error) {
        console.error('Error updating payment:', error);
        return NextResponse.json({ error: 'Failed to update payment' }, { status: 500 });
    }
}
