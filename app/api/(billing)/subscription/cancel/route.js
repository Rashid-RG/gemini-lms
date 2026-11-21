import { NextResponse } from "next/server";
import { db } from "@/configs/db";
import { USER_TABLE, PAYMENT_RECORD_TABLE, SUPPORT_TICKETS_TABLE } from "@/configs/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireUserAuth } from "@/lib/userApiAuth";

// A request to cancel is NOT a payment-provider refund or subscription termination.
// Until PayHere gateway cancellation is integrated, fail safely without changing
// account balances, subscription access, or payment records.
export async function POST(req) {
  const access = await requireUserAuth(req);
  if (!access.authenticated || !access.email) {
    return access.error || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const [user] = await db.select({ isMember: USER_TABLE.isMember })
    .from(USER_TABLE).where(eq(USER_TABLE.email, access.email)).limit(1);
  if (!user) return NextResponse.json({ error: "Account not found" }, { status: 404 });
  if (!user.isMember) return NextResponse.json({ error: "No active premium membership" }, { status: 409 });

  const payload = await req.json().catch(() => ({}));
  const reason = typeof payload.reason === "string" ? payload.reason.trim().slice(0, 500) : "";
  const existing = await db.select({ id: SUPPORT_TICKETS_TABLE.id })
    .from(SUPPORT_TICKETS_TABLE).where(and(
      eq(SUPPORT_TICKETS_TABLE.userEmail, access.email),
      eq(SUPPORT_TICKETS_TABLE.category, "Subscription Cancellation"),
      eq(SUPPORT_TICKETS_TABLE.status, "Open")
    )).limit(1);
  if (existing.length) {
    return NextResponse.json({
      success: true, status: "review_pending", requestId: existing[0].id,
      message: "A cancellation request is already under review. No refund or entitlement change has been made."
    }, { status: 202 });
  }
  const [ticket] = await db.insert(SUPPORT_TICKETS_TABLE).values({
    userEmail: access.email,
    subject: "Subscription cancellation request",
    message: reason || "Customer requests review of premium membership cancellation.",
    category: "Subscription Cancellation",
    status: "Open",
    source: "subscription",
    metadata: { refundRequested: false, gatewayRefundVerified: false, generatedBy: "subscription-cancel" }
  }).returning({ id: SUPPORT_TICKETS_TABLE.id });
  return NextResponse.json({
    success: true, status: "review_pending", requestId: ticket.id,
    message: "Your cancellation request was submitted for review. No refund or entitlement change has been made.",
    supportUrl: "/dashboard/support"
  }, { status: 202 });
}

export async function GET(req) {
  const access = await requireUserAuth(req);
  if (!access.authenticated || !access.email) {
    return access.error || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const [user] = await db.select({
    name: USER_TABLE.name,
    email: USER_TABLE.email,
    isMember: USER_TABLE.isMember,
    joinedAt: USER_TABLE.createdAt
  }).from(USER_TABLE).where(eq(USER_TABLE.email, access.email)).limit(1);
  if (!user) return NextResponse.json({ error: "Account not found" }, { status: 404 });
  const [lastPayment] = await db.select({
    amount: PAYMENT_RECORD_TABLE.amount,
    plan: PAYMENT_RECORD_TABLE.plan,
    createdAt: PAYMENT_RECORD_TABLE.createdAt,
    status: PAYMENT_RECORD_TABLE.status
  }).from(PAYMENT_RECORD_TABLE).where(and(
    eq(PAYMENT_RECORD_TABLE.userEmail, access.email),
    eq(PAYMENT_RECORD_TABLE.status, "completed"),
    eq(PAYMENT_RECORD_TABLE.planType, "subscription")
  )).orderBy(desc(PAYMENT_RECORD_TABLE.createdAt)).limit(1);
  return NextResponse.json({
    user,
    lastPayment: lastPayment || null,
    automaticCancellationAvailable: false,
    refundStatus: "not_initiated"
  }, { headers: { "Cache-Control": "no-store" } });
}
