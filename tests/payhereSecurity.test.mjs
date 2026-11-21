import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getPayherePlan, matchesPayhereAmount } from "../lib/payherePricing.js";
import { makePayhereCheckoutHash, normalizePayhereSecret, verifyPayhereIpn } from "../lib/payhereSignature.js";
import crypto from "node:crypto";

test("only known PayHere plans are accepted", () => {
  assert.equal(getPayherePlan("credits_5")?.amount, 500);
  assert.equal(getPayherePlan("premium_yearly")?.amount, 15000);
  assert.equal(getPayherePlan("__proto__"), null);
  assert.equal(getPayherePlan("constructor"), null);
  assert.equal(getPayherePlan(undefined), null);
});

test("PayHere settlement requires exact LKR amount", () => {
  assert.equal(matchesPayhereAmount("500.00", "LKR", 500), true);
  for (const [amount, currency] of [
    ["499.99", "LKR"], ["500.01", "LKR"], ["500", "LKR"],
    ["500.00", "USD"], ["-500.00", "LKR"], ["500.000", "LKR"],
    ["NaN", "LKR"], ["500.00x", "LKR"]
  ]) assert.equal(matchesPayhereAmount(amount, currency, 500), false);
});

test("checkout binds orders to authenticated accounts before redirect", () => {
  const source = readFileSync("app/api/(billing)/payments/payhere/initiate/route.js", "utf8");
  assert.match(source, /requireUserAuth\(req\)/);
  assert.match(source, /userEmail = authResult\.email/);
  assert.match(source, /status: "pending"/);
  assert.doesNotMatch(source, /const\s*\{[^}]*userEmail[^}]*\}\s*=\s*await req\.json/);
});

test("PayHere successful callbacks use a single atomic claim and credit statement", () => {
  const source = readFileSync("app/api/(billing)/payments/payhere/notify/route.js", "utf8");
  assert.match(source, /status !== "2"/);
  assert.match(source, /WITH matching AS/);
  assert.match(source, /claimed AS/);
  assert.match(source, /p\.status = 'pending'/);
  assert.match(source, /credited AS/);
  assert.match(source, /audit AS/);
  assert.match(source, /COUNT\(\*\) FROM matching/);
  assert.match(source, /verifyPayhereIpn/);
});

test("database diagnostics enforce super-admin authorization", () => {
  const source = readFileSync("app/api/(system)/debug/db-health/route.js", "utf8");
  assert.match(source, /await requireSuperAdmin\(\)/);
  assert.doesNotMatch(source, /req\.headers\.get\('x-admin-token'\)/);
});

test("manual credit granting is unavailable outside development", () => {
  const source = readFileSync("app/api/(billing)/payments/verify/route.js", "utf8");
  assert.match(source, /process\.env\.NODE_ENV !== 'development'/);
});

test("checkout signature matches PayHere protocol and changes with price", () => {
  const secret = "sandbox-merchant-secret";
  const input = ["123456", "ORDER_test", "500.00", "LKR"];
  const signature = makePayhereCheckoutHash(...input, secret);
  const secretDigest = crypto.createHash("md5").update(secret).digest("hex").toUpperCase();
  const expected = crypto.createHash("md5").update(input.join("") + secretDigest).digest("hex").toUpperCase();
  assert.equal(signature, expected);
  assert.notEqual(makePayhereCheckoutHash("123456", "ORDER_test", "501.00", "LKR", secret), signature);
});

test("signed IPN validates correct event and refuses tampering", () => {
  const secret = "sandbox-merchant-secret";
  const fields = { merchantId: "123456", orderId: "ORDER_test", amount: "500.00", currency: "LKR", status: "2" };
  const secretHash = crypto.createHash("md5").update(secret).digest("hex").toUpperCase();
  const signature = crypto.createHash("md5")
    .update(fields.merchantId + fields.orderId + fields.amount + fields.currency + fields.status + secretHash)
    .digest("hex").toUpperCase();
  assert.equal(verifyPayhereIpn({ ...fields, signature, secret }), true);
  for (const changed of [
    { amount: "501.00" }, { orderId: "ORDER_other" }, { status: "-1" },
    { currency: "USD" }, { merchantId: "654321" }, { signature: "0".repeat(32) }
  ]) assert.equal(verifyPayhereIpn({ ...fields, signature, secret, ...changed }), false);
  assert.equal(verifyPayhereIpn({ ...fields, signature: "invalid", secret }), false);
});

test("merchant secret encoding is explicit and validated", () => {
  assert.equal(normalizePayhereSecret(" raw-key ", "raw"), "raw-key");
  assert.equal(normalizePayhereSecret(Buffer.from("raw-key").toString("base64"), "base64"), "raw-key");
  assert.equal(normalizePayhereSecret("!not base64!", "base64"), null);
  assert.equal(normalizePayhereSecret("", "raw"), null);
});

test("payment redirect never awards credits; status lookup is read-only", () => {
  const page = readFileSync("app/dashboard/upgrade/success/page.jsx", "utf8");
  const route = readFileSync("app/api/(billing)/payments/payhere/status/route.js", "utf8");
  assert.doesNotMatch(page, /axios\.post\(["']\/api\/payments\/verify/);
  assert.match(page, /\/api\/payments\/payhere\/status/);
  assert.match(page, /response\.data\.status === "completed"/);
  assert.match(route, /requireUserAuth\(req\)/);
  assert.match(route, /PAYMENT_RECORD_TABLE\.userEmail, identity\.email/);
  assert.match(route, /Cache-Control": "no-store"/);
  assert.doesNotMatch(route, /db\.update\(|db\.insert\(/);
});

test("PayHere initiation returns a durable order identifier", () => {
  const source = readFileSync("app/api/(billing)/payments/payhere/initiate/route.js", "utf8");
  assert.match(source, /crypto\.randomUUID\(\)/);
  assert.match(source, /order_id=\$\{encodeURIComponent\(orderId\)\}/);
  assert.match(source, /NEXT_PUBLIC_APP_URL/);
});

test("checkout validates a secure callback origin before writing pending orders", () => {
  const source = readFileSync("app/api/(billing)/payments/payhere/initiate/route.js", "utf8");
  assert.match(source, /new URL\(rawBaseUrl\)/);
  assert.match(source, /parsed\.protocol === "https:"/);
  assert.match(source, /const localDevelopment/);
  const validation = source.indexOf("new URL(rawBaseUrl)");
  const insert = source.indexOf("db.insert(PAYMENT_RECORD_TABLE)");
  assert.ok(validation >= 0 && insert > validation);
});

test("IPN replay is bound to the exact gateway payment ID, amount and plan", () => {
  const source = readFileSync("app/api/(billing)/payments/payhere/notify/route.js", "utf8");
  assert.match(source, /matches\[0\]\.gatewayPaymentId === paymentId/);
  assert.match(source, /Number\(matches\[0\]\.amount\) === plan\.amount/);
  assert.match(source, /matches\[0\]\.creditsAdded === plan\.credits/);
  assert.match(source, /p\."gatewayPaymentId" IS NULL/);
});

test("payment status fails closed on duplicate order records", () => {
  const source = readFileSync("app/api/(billing)/payments/payhere/status/route.js", "utf8");
  assert.match(source, /payments\.length !== 1/);
  assert.match(source, /Order requires review/);
});

test("subscription cancellation requires account identity and never fabricates refunds", () => {
  const route = readFileSync("app/api/(billing)/subscription/cancel/route.js", "utf8");
  assert.match(route, /requireUserAuth\(req\)/);
  assert.match(route, /access\.email/);
  assert.match(route, /status: "review_pending"/);
  assert.match(route, /SUPPORT_TICKETS_TABLE/);
  assert.doesNotMatch(route, /db\.update\(/);
  assert.doesNotMatch(route, /status:\s*['"]refunded['"]/);
});

test("admin cannot fabricate completed or refunded payments using manual routes", () => {
  const route = readFileSync("app/api/(admin)/admin/payments/route.js", "utf8");
  assert.match(route, /export async function POST\(\)/);
  assert.match(route, /export async function PUT\(\)/);
  assert.match(route, /requireSuperAdmin\(\)/);
  assert.match(route, /Manual payment awards are disabled/);
  assert.match(route, /Payment status changes and refunds require verified gateway reconciliation/);
  assert.doesNotMatch(route, /db\.update\(|db\.insert\(/);
});

test("financial reconciliation report requires super-admin and never writes", () => {
  const route = readFileSync("app/api/(admin)/admin/payments/reconciliation/route.js", "utf8");
  assert.match(route, /requireSuperAdmin\(\)/);
  for (const issue of ["duplicate_order","duplicate_gateway_payment","pending_over_24h","completed_without_gateway_id"]) {
    assert.ok(route.includes(issue));
  }
  assert.doesNotMatch(route, /db\.update\(|db\.insert\(/);
  assert.match(route, /Cache-Control": "no-store"/);
});

test("cancellation request creates a support ticket without changing financial records", () => {
  const route = readFileSync("app/api/(billing)/subscription/cancel/route.js", "utf8");
  assert.match(route, /eq\(SUPPORT_TICKETS_TABLE\.userEmail, access\.email\)/);
  assert.match(route, /db\.insert\(SUPPORT_TICKETS_TABLE\)/);
  assert.match(route, /gatewayRefundVerified: false/);
  assert.doesNotMatch(route, /db\.update\(PAYMENT_RECORD_TABLE\)/);
  assert.doesNotMatch(route, /db\.update\(USER_TABLE\)/);
});

test("admin payments enforce bounded pagination and supported filters", () => {
  const route = readFileSync("app/api/(admin)/admin/payments/route.js", "utf8");
  assert.match(route, /Number\.isSafeInteger\(requestedLimit\)/);
  assert.match(route, /requestedLimit > 100/);
  assert.match(route, /requestedOffset > 10000/);
  assert.match(route, /allowedPeriods\.has\(requestedPeriod\)/);
  assert.match(route, /allowedStatuses\.has\(requestedStatus\)/);
});
