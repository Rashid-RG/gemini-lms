import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getPayherePlan, matchesPayhereAmount } from "../lib/payherePricing.js";

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
  assert.match(source, /verifyPayhereSignature/);
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
