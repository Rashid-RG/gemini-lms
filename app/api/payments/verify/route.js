import { NextResponse } from "next/server";
import { db } from "@/configs/db";
import { PAYMENT_RECORD_TABLE, USER_TABLE, CREDIT_TRANSACTION_TABLE } from "@/configs/schema";
import { eq, sql, desc } from "drizzle-orm";
import { invalidateUserCache } from "@/lib/cache";
import { captureMessage, startTimer, SEVERITY } from "@/lib/monitoring";

/**
 * POST /api/payments/verify
 * Verify payment and update credits (for local testing when IPN can't reach)
 * This simulates what the PayHere notify endpoint does
 */

const PRICING = {
    premium_monthly: { credits: 999999, isMember: true, name: "Premium Monthly" },
    premium_yearly: { credits: 999999, isMember: true, name: "Premium Yearly" },
    credits_5: { credits: 5, isMember: false, name: "5 Credits" },
    credits_15: { credits: 15, isMember: false, name: "15 Credits" },
    credits_30: { credits: 30, isMember: false, name: "30 Credits" }
};

export async function POST(req) {
    const timer = startTimer('payment-verify');
    captureMessage('Payment Verify API Called', {}, SEVERITY.INFO);
    
    try {
        const { orderId, userEmail, planId } = await req.json();
        captureMessage('Verify request received', { orderId, userEmail, planId }, SEVERITY.INFO);

        if (!userEmail || !planId) {
            return NextResponse.json({ error: 'User email and plan ID are required' }, { status: 400 });
        }

        const plan = PRICING[planId];
        if (!plan) {
            console.log('Invalid plan:', planId);
            return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
        }

        // Check if this order was already processed
        if (orderId) {
            const existingPayment = await db.select()
                .from(PAYMENT_RECORD_TABLE)
                .where(eq(PAYMENT_RECORD_TABLE.sessionId, orderId))
                .limit(1);

            if (existingPayment.length > 0 && existingPayment[0].status === 'completed') {
                return NextResponse.json({ 
                    success: true, 
                    message: 'Payment already processed',
                    alreadyProcessed: true
                });
            }
        }

        // Get current user
        const user = await db.select()
            .from(USER_TABLE)
            .where(eq(USER_TABLE.email, userEmail))
            .limit(1);

        if (user.length === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const currentCredits = user[0].credits || 0;
        let newCredits = currentCredits;

        if (plan.isMember) {
            // Premium subscription
            newCredits = 999999;
            await db.update(USER_TABLE)
                .set({
                    isMember: true,
                    credits: 999999,
                    updatedAt: new Date()
                })
                .where(eq(USER_TABLE.email, userEmail));
        } else {
            // Credit pack
            newCredits = currentCredits + plan.credits;
            await db.update(USER_TABLE)
                .set({
                    credits: sql`${USER_TABLE.credits} + ${plan.credits}`,
                    updatedAt: new Date()
                })
                .where(eq(USER_TABLE.email, userEmail));
        }

        // Log credit transaction
        await db.insert(CREDIT_TRANSACTION_TABLE).values({
            userEmail: userEmail,
            amount: plan.credits,
            type: 'purchase',
            reason: `Purchased ${plan.name} via PayHere`,
            balanceBefore: currentCredits,
            balanceAfter: newCredits,
            createdBy: 'system'
        });

        // Record payment if orderId provided
        if (orderId) {
            await db.insert(PAYMENT_RECORD_TABLE).values({
                userEmail: userEmail,
                amount: '0', // We don't have the actual amount here
                currency: 'lkr',
                plan: planId,
                planType: plan.isMember ? 'subscription' : 'credits',
                creditsAdded: plan.credits,
                status: 'completed',
                paymentMethod: 'payhere',
                sessionId: orderId,
                metadata: { verifiedManually: true }
            }).onConflictDoNothing();
        }

        // Invalidate user cache so sidebar shows updated credits immediately
        invalidateUserCache(userEmail);

        captureMessage('Payment verified successfully', {
            userEmail,
            plan: plan.name,
            previousCredits: currentCredits,
            newCredits
        }, SEVERITY.INFO);

        timer.end({ success: true, plan: planId });

        return NextResponse.json({
            success: true,
            message: 'Credits updated successfully',
            previousCredits: currentCredits,
            newCredits: newCredits,
            creditsAdded: plan.credits,
            isMember: plan.isMember
        });

    } catch (error) {
        timer.end({ success: false, error: error.message });
        captureMessage('Payment verification failed', { error: error.message }, SEVERITY.ERROR);
        return NextResponse.json({ error: 'Failed to verify payment' }, { status: 500 });
    }
}
