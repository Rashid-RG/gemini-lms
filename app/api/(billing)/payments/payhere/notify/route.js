import crypto from "node:crypto";
import { db } from "@/configs/db";
import { sql } from "drizzle-orm";
import { emailService } from "@/lib/emailService";
import { getPayherePlan, matchesPayhereAmount } from "@/lib/payherePricing";

// PayHere signatures are MD5 per gateway protocol. Do not use MD5 for application secrets.
function verifyPayhereSignature({ merchantId, orderId, amount, currency, status, signature, secret }) {
    if (![merchantId, orderId, amount, currency, status, signature, secret].every(
        value => typeof value === "string" && value.length > 0
    )) return false;
    const raw = secret.trim();
    const encoding = (process.env.PAYHERE_MERCHANT_SECRET_ENCODING || "raw").toLowerCase();
    const candidates = [raw];
    if (encoding === "base64") {
        try { candidates.unshift(Buffer.from(raw, "base64").toString("utf8").trim()); }
        catch { return false; }
    }
    return candidates.some(candidate => {
        const secretHash = crypto.createHash("md5").update(candidate).digest("hex").toUpperCase();
        const calculated = crypto.createHash("md5")
            .update(merchantId + orderId + amount + currency + status + secretHash)
            .digest("hex").toUpperCase();
        const expected = Buffer.from(calculated, "ascii");
        const received = Buffer.from(signature.toUpperCase(), "ascii");
        return expected.length === received.length && crypto.timingSafeEqual(expected, received);
    });
}

export async function POST(req) {
    try {
        const configuredMerchantId = process.env.PAYHERE_MERCHANT_ID;
        const secret = process.env.PAYHERE_MERCHANT_SECRET;
        if (!configuredMerchantId || !secret) return new Response("Gateway not configured", { status: 503 });
        const form = await req.formData();
        const merchantId = form.get("merchant_id");
        const orderId = form.get("order_id");
        const paymentId = form.get("payment_id");
        const amount = form.get("payhere_amount");
        const currency = form.get("payhere_currency");
        const status = form.get("status_code");
        const signature = form.get("md5sig");
        const planId = form.get("custom_1");
        const userEmail = form.get("custom_2");
        const plan = getPayherePlan(planId);
        if (merchantId !== configuredMerchantId || !plan || typeof orderId !== "string" ||
            !orderId.startsWith("ORDER_") || typeof paymentId !== "string" ||
            !paymentId || typeof userEmail !== "string" ||
            !matchesPayhereAmount(amount, currency, plan.amount)) {
            return new Response("Invalid payment details", { status: 400 });
        }
        if (!verifyPayhereSignature({
            merchantId, orderId, amount, currency, status, signature, secret
        })) return new Response("Invalid signature", { status: 400 });

        // A signed non-success callback must never grant credits.
        // Leave the order pending for gateway reconciliation / subsequent verified success.
        if (status !== "2") return new Response("OK", { status: 200 });

        // Exactly one SQL statement makes claiming, awarding and auditing atomic.
        // Updating a single pending row serializes simultaneous callback attempts under
        // PostgreSQL row locking. Neither duplicate nor unknown orders can award credits.
        const membership = plan.isMember;
        const result = await db.execute(sql`
            WITH matching AS (
                SELECT id FROM "paymentRecord"
                WHERE "sessionId" = ${orderId} AND "paymentMethod" = 'payhere'
            ),
            claimed AS (
                UPDATE "paymentRecord" p SET
                    status = 'completed',
                    "gatewayPaymentId" = ${paymentId},
                    "updatedAt" = NOW()
                WHERE p.id = (SELECT id FROM matching LIMIT 1)
                  AND (SELECT COUNT(*) FROM matching) = 1
                  AND p.status = 'pending'
                  AND p."userEmail" = ${userEmail}
                  AND p.plan = ${planId}
                  AND p.amount = ${plan.amount.toFixed(2)}
                  AND LOWER(p.currency) = 'lkr'
                  AND EXISTS (SELECT 1 FROM users u WHERE u.email = p."userEmail")
                RETURNING p."userEmail"
            ),
            credited AS (
                UPDATE users u SET
                    credits = CASE WHEN ${membership} THEN 999999 ELSE COALESCE(u.credits, 0) + ${plan.credits} END,
                    "isMember" = CASE WHEN ${membership} THEN TRUE ELSE COALESCE(u."isMember", FALSE) END,
                    "updatedAt" = NOW()
                WHERE u.email = (SELECT "userEmail" FROM claimed LIMIT 1)
                RETURNING u.email, u.name, u.credits AS new_balance
            ),
            audit AS (
                INSERT INTO "creditTransactions" (
                    "userEmail", amount, type, reason, "balanceBefore", "balanceAfter", "createdBy"
                )
                SELECT email, ${plan.credits}, 'purchase', ${"Purchased " + plan.name + " via PayHere"},
                    CASE WHEN ${membership} THEN new_balance ELSE new_balance - ${plan.credits} END,
                    new_balance, 'system'
                FROM credited RETURNING id
            )
            SELECT
                (SELECT COUNT(*) FROM claimed)::int AS claimed_count,
                (SELECT COUNT(*) FROM audit)::int AS audit_count,
                (SELECT email FROM credited LIMIT 1) AS email,
                (SELECT name FROM credited LIMIT 1) AS name
        `);
        const row = result.rows?.[0] || result[0];
        if (Number(row?.claimed_count) === 0) {
            // Distinguish a replay from unmatched orders for reconciliation.
            const existing = await db.execute(sql`
                SELECT status FROM "paymentRecord"
                WHERE "sessionId" = ${orderId} AND "userEmail" = ${userEmail}
                  AND plan = ${planId} AND "paymentMethod" = 'payhere'
                LIMIT 2
            `);
            const matches = existing.rows || existing;
            if (matches.length === 1 && matches[0].status === "completed") return new Response("OK", { status: 200 });
            return new Response("Unknown or mismatched order", { status: 409 });
        }
        if (Number(row?.audit_count) !== 1) throw new Error("Payment claim did not create exactly one audit entry");

        // Email is intentionally outside the settlement SQL; failures do not grant more credits.
        try {
            await emailService.sendPaymentConfirmationEmail(
                row.email, row.name || "Student", amount, paymentId, plan.planType
            );
        } catch (error) {
            console.error("Payment confirmation email failed:", error);
        }
        return new Response("OK", { status: 200 });
    } catch (error) {
        console.error("PayHere callback error:", error);
        return new Response("Server error", { status: 500 });
    }
}

export async function GET() {
    return new Response("PayHere notification endpoint active", { status: 200 });
}
