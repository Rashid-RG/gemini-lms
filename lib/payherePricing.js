// Shared server-side PayHere catalogue. Never trust callback-supplied prices or plan details.
export const PAYHERE_PRICING = Object.freeze({
  premium_monthly: { name: "Premium Monthly", amount: 1500, credits: 999999, isMember: true, planType: "subscription" },
  premium_yearly: { name: "Premium Yearly", amount: 15000, credits: 999999, isMember: true, planType: "subscription" },
  credits_5: { name: "5 Course Credits", amount: 500, credits: 5, isMember: false, planType: "credits" },
  credits_15: { name: "15 Course Credits", amount: 1200, credits: 15, isMember: false, planType: "credits" },
  credits_30: { name: "30 Course Credits", amount: 2100, credits: 30, isMember: false, planType: "credits" },
});
export function getPayherePlan(planId) {
  return typeof planId === "string" && Object.hasOwn(PAYHERE_PRICING, planId)
    ? PAYHERE_PRICING[planId] : null;
}
export function matchesPayhereAmount(amount, currency, expectedAmount) {
  if (currency !== "LKR" || typeof amount !== "string" || !/^\d+\.\d{2}$/.test(amount)) return false;
  return Number.isSafeInteger(Number(amount.replace(".", ""))) && Number(amount) === expectedAmount;
}
