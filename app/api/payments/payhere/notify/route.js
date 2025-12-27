import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/configs/db";
import { PAYMENT_RECORD_TABLE, USER_TABLE, CREDIT_TRANSACTION_TABLE } from "@/configs/schema";
import { eq, sql } from "drizzle-orm";

/**
 * PayHere Payment Notification API (IPN - Instant Payment Notification)
 * This is called by PayHere's servers when payment status changes
 * 
 * PayHere will POST to this URL with payment result
 */

// Pricing configuration (must match initiate route)
const PRICING = {
    premium_monthly: {
        name: "Premium Monthly",
        amount: 1500.00,
        credits: 999999,
        isMember: true,
        planType: 'subscription'
    },
    premium_yearly: {
        name: "Premium Yearly", 
        amount: 15000.00,
        credits: 999999,
        isMember: true,
        planType: 'subscription'
    },
    credits_5: {
        name: "5 Course Credits",
        amount: 500.00,
        credits: 5,
        isMember: false,
        planType: 'credits'
    },
    credits_15: {
        name: "15 Course Credits",
        amount: 1200.00,
        credits: 15,
        isMember: false,
        planType: 'credits'
    },
    credits_30: {
        name: "30 Course Credits",
        amount: 2100.00,
        credits: 30,
        isMember: false,
        planType: 'credits'
    }
};

function verifyPayHereSignature(merchantId, orderId, paymentId, amount, currency, statusCode, merchantSecret, receivedMd5sig) {
    // PayHere verification: md5(merchant_id + order_id + payhere_amount + payhere_currency + status_code + md5(merchant_secret))
    const secretHash = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();
    const localMd5sig = crypto.createHash('md5')
        .update(merchantId + orderId + amount + currency + statusCode + secretHash)
        .digest('hex')
        .toUpperCase();
    
    return localMd5sig === receivedMd5sig.toUpperCase();
}

export async function POST(req) {
    try {
        // Parse form data from PayHere
        const formData = await req.formData();
        
        const merchantId = formData.get('merchant_id');
        const orderId = formData.get('order_id');
        const paymentId = formData.get('payment_id');
        const payhereAmount = formData.get('payhere_amount');
        const payhereCurrency = formData.get('payhere_currency');
        const statusCode = formData.get('status_code');
        const md5sig = formData.get('md5sig');
        const method = formData.get('method');
        const statusMessage = formData.get('status_message');
        
        // Custom fields
        const planId = formData.get('custom_1');
        const userEmail = formData.get('custom_2');

        console.log('PayHere notification received:', {
            orderId,
            paymentId,
            statusCode,
            statusMessage,
            planId,
            userEmail
        });

        // Verify signature
        const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET;
        const isValid = verifyPayHereSignature(
            merchantId,
            orderId,
            paymentId,
            payhereAmount,
            payhereCurrency,
            statusCode,
            merchantSecret,
            md5sig
        );

        if (!isValid) {
            console.error('Invalid PayHere signature');
            return new Response('Invalid signature', { status: 400 });
        }

        // Get plan details
        const plan = PRICING[planId];
        if (!plan) {
            console.error('Invalid plan ID:', planId);
            return new Response('Invalid plan', { status: 400 });
        }

        // Determine payment status
        let paymentStatus = 'pending';
        if (statusCode === '2') {
            paymentStatus = 'completed';
        } else if (statusCode === '-1') {
            paymentStatus = 'canceled';
        } else if (statusCode === '-2') {
            paymentStatus = 'failed';
        } else if (statusCode === '-3') {
            paymentStatus = 'chargedback';
        } else if (statusCode === '0') {
            paymentStatus = 'pending';
        }

        // Record payment in database
        await db.insert(PAYMENT_RECORD_TABLE).values({
            userEmail: userEmail,
            amount: payhereAmount,
            currency: payhereCurrency.toLowerCase(),
            plan: planId,
            planType: plan.planType,
            creditsAdded: plan.credits,
            status: paymentStatus,
            paymentMethod: method || 'payhere',
            stripePaymentId: paymentId, // Using this field for PayHere payment ID
            sessionId: orderId,
            metadata: {
                statusCode,
                statusMessage,
                gateway: 'payhere'
            }
        });

        // If payment is successful, update user credits/membership
        if (paymentStatus === 'completed' && userEmail) {
            // Get current user
            const user = await db.select()
                .from(USER_TABLE)
                .where(eq(USER_TABLE.email, userEmail))
                .limit(1);

            if (user.length > 0) {
                const currentCredits = user[0].credits || 0;

                if (plan.isMember) {
                    // Premium subscription - set unlimited credits and member status
                    await db.update(USER_TABLE)
                        .set({
                            isMember: true,
                            credits: 999999,
                            updatedAt: new Date()
                        })
                        .where(eq(USER_TABLE.email, userEmail));
                } else {
                    // Credit pack - add credits
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
                    balanceAfter: plan.isMember ? 999999 : currentCredits + plan.credits,
                    createdBy: 'system'
                });

                console.log(`Payment successful: ${userEmail} purchased ${plan.name}`);
            }
        }

        // PayHere expects a 200 OK response
        return new Response('OK', { status: 200 });

    } catch (error) {
        console.error('PayHere notification error:', error);
        return new Response('Server error', { status: 500 });
    }
}

// Also handle GET for testing
export async function GET() {
    return NextResponse.json({ message: 'PayHere notification endpoint active' });
}
