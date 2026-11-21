import { NextResponse } from "next/server";
import { db } from "@/configs/db";
import { PAYMENT_RECORD_TABLE } from "@/configs/schema";
import { and, eq } from "drizzle-orm";
import { requireUserAuth } from "@/lib/userApiAuth";

// Read-only order status: a browser redirect never authorizes credit grants.
export async function GET(req) {
  const identity = await requireUserAuth(req);
  if (!identity.authenticated || !identity.email) {
    return identity.error || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const orderId = new URL(req.url).searchParams.get("orderId");
  if (!orderId || !/^ORDER_[0-9a-f-]{36}$/i.test(orderId)) {
    return NextResponse.json({ error: "Invalid order reference" }, { status: 400 });
  }
  try {
    const [payment] = await db.select({
      sessionId: PAYMENT_RECORD_TABLE.sessionId,
      status: PAYMENT_RECORD_TABLE.status,
      plan: PAYMENT_RECORD_TABLE.plan,
      creditsAdded: PAYMENT_RECORD_TABLE.creditsAdded,
      planType: PAYMENT_RECORD_TABLE.planType
    }).from(PAYMENT_RECORD_TABLE).where(and(
      eq(PAYMENT_RECORD_TABLE.sessionId, orderId),
      eq(PAYMENT_RECORD_TABLE.userEmail, identity.email),
      eq(PAYMENT_RECORD_TABLE.paymentMethod, "payhere")
    )).limit(2);
    if (!payment) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    return NextResponse.json({
      success: true,
      status: payment.status,
      planId: payment.plan,
      creditsAdded: payment.status === "completed" ? payment.creditsAdded : 0,
      isMember: payment.status === "completed" && payment.planType === "subscription"
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Payment status lookup error:", error);
    return NextResponse.json({ error: "Unable to retrieve payment status" }, { status: 500 });
  }
}
