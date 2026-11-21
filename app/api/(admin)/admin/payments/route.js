import { NextResponse } from "next/server";
import { db } from "@/configs/db";
import { PAYMENT_RECORD_TABLE, USER_TABLE, CREDIT_TRANSACTION_TABLE } from "@/configs/schema";
import { eq, desc, sql, gte, and, between } from "drizzle-orm";
import { requireAdminOrAbove, requireSuperAdmin } from "@/lib/adminApiAuth";

/**
 * GET /api/admin/payments
 * Get payment records with analytics
 */
export async function GET(req) {
    const authResult = await requireAdminOrAbove();
    if (!authResult.authenticated) return authResult.error;

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

        // Perform integer addition on cents to prevent float rounding issues
        const totalRevenueCents = allPayments.reduce((sum, p) => sum + Math.round(parseFloat(p.amount || 0) * 100), 0);
        const totalRevenue = totalRevenueCents / 100;
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

        const monthlyRevenueCents = monthlyPayments.reduce((sum, p) => sum + Math.round(parseFloat(p.amount || 0) * 100), 0);
        const monthlyRevenue = monthlyRevenueCents / 100;

        // Today's revenue
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const todayPayments = await db.select()
            .from(PAYMENT_RECORD_TABLE)
            .where(and(
                eq(PAYMENT_RECORD_TABLE.status, 'completed'),
                gte(PAYMENT_RECORD_TABLE.createdAt, todayStart)
            ));

        const todayRevenueCents = todayPayments.reduce((sum, p) => sum + Math.round(parseFloat(p.amount || 0) * 100), 0);
        const todayRevenue = todayRevenueCents / 100;

        // Revenue by plan
        const revenueByPlan = {};
        allPayments.forEach(p => {
            const plan = p.plan || 'unknown';
            const currentAmountCents = Math.round(parseFloat(p.amount || 0) * 100);
            const existingAmountCents = Math.round((revenueByPlan[plan] || 0) * 100);
            revenueByPlan[plan] = parseFloat(((existingAmountCents + currentAmountCents) / 100).toFixed(2));
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

            const monthRevenueCents = monthPayments.reduce((sum, p) => sum + Math.round(parseFloat(p.amount || 0) * 100), 0);

            monthlyTrend.push({
                month: monthStart.toLocaleString('default', { month: 'short', year: 'numeric' }),
                revenue: parseFloat((monthRevenueCents / 100).toFixed(2)),
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
 * Financial modifications cannot be treated as gateway settlements.
 * Refuse manual "completed/refunded" writes until a provider-confirmed,
 * auditable refund/adjustment workflow is implemented.
 */
export async function POST() {
    const access = await requireSuperAdmin();
    if (!access.authenticated) return access.error;
    return NextResponse.json({
        error: "Manual payment awards are disabled pending audited reconciliation",
        supportAction: "Use the read-only reconciliation report"
    }, { status: 409 });
}

export async function PUT() {
    const access = await requireSuperAdmin();
    if (!access.authenticated) return access.error;
    return NextResponse.json({
        error: "Payment status changes and refunds require verified gateway reconciliation",
        supportAction: "Use the read-only reconciliation report"
    }, { status: 409 });
}
