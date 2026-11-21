import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { makePayhereCheckoutHash, normalizePayhereSecret } from "@/lib/payhereSignature";
import { db } from "@/configs/db";
import { PAYMENT_RECORD_TABLE, USER_TABLE } from "@/configs/schema";
import { eq } from "drizzle-orm";
import { requireUserAuth } from "@/lib/userApiAuth";
import { getPayherePlan } from "@/lib/payherePricing";

/**
 * PayHere Payment Initiation API
 * Generates the hash and returns payment form data
 * 
 * PayHere Documentation: https://support.payhere.lk/api-&-mobile-sdk/payhere-checkout
 */

export async function POST(req) {
    try {
        const authResult = await requireUserAuth(req);
        if (!authResult.authenticated || !authResult.email) {
            return authResult.error || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const userEmail = authResult.email;
        const { 
            planId,

            userPhone = '',
            userAddress = '',
            userCity = ''
        } = await req.json();

        // Validate plan
        const plan = getPayherePlan(planId);
        if (!plan) {
            return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 });
        }

        const [user] = await db.select().from(USER_TABLE)
            .where(eq(USER_TABLE.email, userEmail)).limit(1);
        if (!user) return NextResponse.json({ error: "User account not found" }, { status: 404 });
        const userName = user.name || "Student";

        // PayHere credentials from environment
        const merchantId = process.env.PAYHERE_MERCHANT_ID;
        const merchantSecretRaw = process.env.PAYHERE_MERCHANT_SECRET;
        const merchantSecret = normalizePayhereSecret(merchantSecretRaw, process.env.PAYHERE_MERCHANT_SECRET_ENCODING || "raw");
        const isProduction = process.env.PAYHERE_PRODUCTION === 'true';


        if (!merchantId || !merchantSecret || merchantSecretRaw.includes('REPLACE_WITH_')) {
            return NextResponse.json({ error: 'Payment gateway not configured: set valid PAYHERE merchant credentials for this domain' }, { status: 500 });
        }

        // Generate unique order ID
        const orderId = `ORDER_${crypto.randomUUID()}`;
        const currency = 'LKR';
        const amount = plan.amount;

        // Persist the expected owner, price and plan BEFORE redirecting to PayHere.
        // Callback settlement only accepts a matching pending order.
        await db.insert(PAYMENT_RECORD_TABLE).values({
            sessionId: orderId, userEmail, amount: amount.toFixed(2),
            currency: "lkr", plan: planId, planType: plan.planType,
            creditsAdded: plan.credits, status: "pending", paymentMethod: "payhere",
            metadata: { gateway: "payhere", initiatedAt: new Date().toISOString() }
        });

        // Generate hash
        const hash = makePayhereCheckoutHash(merchantId, orderId, amount.toFixed(2), currency, merchantSecret);

        // Base URL for callbacks
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

        // PayHere form data
        const paymentData = {
            // PayHere required fields
            merchant_id: merchantId,
            return_url: `${baseUrl}/dashboard/upgrade/success?plan=${planId}`,
            cancel_url: `${baseUrl}/dashboard/upgrade/cancel`,
            notify_url: `${baseUrl}/api/payments/payhere/notify`,
            
            // Order details
            order_id: orderId,
            items: plan.name,
            currency: currency,
            amount: amount.toFixed(2),
            
            // Customer details
            first_name: userName.split(' ')[0] || userName,
            last_name: userName.split(' ').slice(1).join(' ') || '',
            email: userEmail,
            phone: userPhone || '0000000000',
            address: userAddress || 'N/A',
            city: userCity || 'Colombo',
            country: 'Sri Lanka',
            
            // Security
            hash: hash,

            // Custom fields for our reference
            custom_1: planId,
            custom_2: userEmail,
        };

        // PayHere checkout URL
        const checkoutUrl = isProduction 
            ? 'https://www.payhere.lk/pay/checkout'
            : 'https://sandbox.payhere.lk/pay/checkout';

        return NextResponse.json({
            success: true,
            paymentData,
            checkoutUrl,
            orderId
        });

    } catch (error) {
        console.error('PayHere initiation error:', error);
        return NextResponse.json({ error: 'Failed to initiate payment' }, { status: 500 });
    }
}
