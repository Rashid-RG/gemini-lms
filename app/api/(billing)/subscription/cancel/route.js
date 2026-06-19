import { NextResponse } from "next/server";
import { db } from "@/configs/db";
import { USER_TABLE, PAYMENT_RECORD_TABLE, CREDIT_TRANSACTION_TABLE } from "@/configs/schema";
import { eq } from "drizzle-orm";
import { withDbRetry } from "@/lib/dbUtils";
import { inngest } from "@/inngest/client";

/**
 * POST /api/subscription/cancel
 * Cancel user's premium subscription
 * Automatically refund remaining credits
 */
export async function POST(req) {
  try {
    const { userEmail, reason = 'User requested cancellation' } = await req.json();

    if (!userEmail) {
      return NextResponse.json(
        { error: "User email is required" },
        { status: 400 }
      );
    }

    // Get user data
    const userResult = await withDbRetry(() =>
      db.select().from(USER_TABLE).where(eq(USER_TABLE.email, userEmail))
    );

    if (userResult.length === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const user = userResult[0];

    // Check if user is actually a premium member
    if (!user.isMember) {
      return NextResponse.json(
        { error: "User is not a premium member" },
        { status: 400 }
      );
    }

    // Get last payment (to refund it)
    const lastPayment = await withDbRetry(() =>
      db.select()
        .from(PAYMENT_RECORD_TABLE)
        .where(eq(PAYMENT_RECORD_TABLE.userEmail, userEmail))
        .orderBy((table) => table.createdAt)
        .limit(1)
    );

    const refundAmount = lastPayment.length > 0 ? lastPayment[0].amount : 0;
    const paymentId = lastPayment.length > 0 ? lastPayment[0].id : null;

    // Downgrade user: remove premium status, reset credits to 0
    await withDbRetry(() =>
      db.update(USER_TABLE)
        .set({
          isMember: false,
          credits: 0,
          updatedAt: new Date()
        })
        .where(eq(USER_TABLE.email, userEmail))
    );

    // Mark payment as refunded if it exists
    if (paymentId) {
      await withDbRetry(() =>
        db.update(PAYMENT_RECORD_TABLE)
          .set({
            status: 'refunded',
            metadata: {
              ...lastPayment[0].metadata,
              refund_reason: reason,
              refunded_at: new Date().toISOString()
            }
          })
          .where(eq(PAYMENT_RECORD_TABLE.id, paymentId))
      );
    }

    // Log refund transaction
    await withDbRetry(() =>
      db.insert(CREDIT_TRANSACTION_TABLE).values({
        userEmail: userEmail,
        amount: -999999, // Marking unlimited credits as removed
        type: 'refund',
        reason: `Subscription cancellation - ${reason}`,
        balanceBefore: 999999,
        balanceAfter: 0,
        createdBy: 'system'
      })
    );

    // Send cancellation confirmation email via Inngest
    await inngest.send({
      name: 'subscription.cancelled',
      data: {
        userEmail: userEmail,
        userName: user.name,
        refundAmount: refundAmount,
        reason: reason,
        cancelledAt: new Date()
      }
    });

    console.log(`Subscription cancelled for ${userEmail}. Refund: Rs.${refundAmount}`);

    return NextResponse.json({
      success: true,
      message: 'Subscription cancelled successfully',
      refundAmount: refundAmount
    });

  } catch (error) {
    console.error('Subscription cancellation error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/subscription/cancel
 * Get subscription info before cancellation
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const userEmail = searchParams.get('email');

    if (!userEmail) {
      return NextResponse.json(
        { error: "User email is required" },
        { status: 400 }
      );
    }

    // Get user and payment info
    const userResult = await withDbRetry(() =>
      db.select().from(USER_TABLE).where(eq(USER_TABLE.email, userEmail))
    );

    if (userResult.length === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const user = userResult[0];

    // Get last payment
    const lastPayment = await withDbRetry(() =>
      db.select()
        .from(PAYMENT_RECORD_TABLE)
        .where(eq(PAYMENT_RECORD_TABLE.userEmail, userEmail))
        .orderBy((table) => table.createdAt)
        .limit(1)
    );

    return NextResponse.json({
      user: {
        name: user.name,
        email: user.email,
        isMember: user.isMember,
        joinedAt: user.createdAt
      },
      lastPayment: lastPayment.length > 0 ? {
        amount: lastPayment[0].amount,
        plan: lastPayment[0].plan,
        createdAt: lastPayment[0].createdAt,
        status: lastPayment[0].status
      } : null
    });

  } catch (error) {
    console.error('Get subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription info' },
      { status: 500 }
    );
  }
}
