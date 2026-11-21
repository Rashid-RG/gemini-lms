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
