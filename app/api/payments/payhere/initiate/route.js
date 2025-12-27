import { NextResponse } from "next/server";
import crypto from "crypto";

/**
 * PayHere Payment Initiation API
 * Generates the hash and returns payment form data
 * 
 * PayHere Documentation: https://support.payhere.lk/api-&-mobile-sdk/payhere-checkout
 */

// Pricing configuration
const PRICING = {
    premium_monthly: {
        name: "Premium Monthly",
        amount: 1500.00,
        credits: 999999, // Unlimited
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

function generatePayHereHash(merchantId, orderId, amount, currency, merchantSecret) {
    // PayHere hash formula:
    // md5(merchant_id + order_id + amount + currency + md5(merchant_secret).toUpperCase()).toUpperCase()
    
    // Amount must be formatted with exactly 2 decimal places
    const amountFormatted = Number(amount).toFixed(2);
    
    // Step 1: MD5 hash of merchant secret (uppercase)
    const secretMd5 = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();
    
    // Step 2: Concatenate all values
    const stringToHash = merchantId + orderId + amountFormatted + currency + secretMd5;
    
    // Step 3: MD5 hash of concatenated string (uppercase)
    const hash = crypto.createHash('md5').update(stringToHash).digest('hex').toUpperCase();
    
    console.log('PayHere Hash Debug:', { 
        merchantId, 
        orderId, 
        amountFormatted, 
        currency,
        secretMd5: secretMd5.substring(0, 10) + '...',
        hash 
    });
    
    return hash;
}

export async function POST(req) {
    try {
        const { 
            planId, 
            userEmail, 
            userName, 
            userPhone = '',
            userAddress = '',
            userCity = ''
        } = await req.json();

        // Validate plan
        const plan = PRICING[planId];
        if (!plan) {
            return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 });
        }

        if (!userEmail || !userName) {
            return NextResponse.json({ error: 'User email and name are required' }, { status: 400 });
        }

        // PayHere credentials from environment
        const merchantId = process.env.PAYHERE_MERCHANT_ID;
        const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET;
        const isProduction = process.env.PAYHERE_PRODUCTION === 'true';

        console.log('PayHere Config:', { 
            merchantId, 
            secretLength: merchantSecret?.length,
            isProduction 
        });

        if (!merchantId || !merchantSecret) {
            return NextResponse.json({ error: 'Payment gateway not configured' }, { status: 500 });
        }

        // Generate unique order ID
        const orderId = `ORDER_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const currency = 'LKR';
        const amount = plan.amount;

        // Generate hash
        const hash = generatePayHereHash(merchantId, orderId, amount, currency, merchantSecret);

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
