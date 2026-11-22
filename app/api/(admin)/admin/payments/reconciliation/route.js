import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/configs/db";
import { requireSuperAdmin } from "@/lib/adminApiAuth";

// Read-only payment integrity assessment. No gateway calls, settlement or account writes.
// Each category is bounded to keep the endpoint predictable for admin diagnostics.
export async function GET() {
  const access = await requireSuperAdmin();
  if (!access.authenticated) return access.error;
  try {
    const results = await db.execute(sql`
      WITH duplicate_orders AS (
        SELECT 'duplicate_order' AS issue, "sessionId" AS reference, COUNT(*)::int AS occurrences
        FROM "paymentRecord"
        WHERE "paymentMethod" = 'payhere' AND "sessionId" IS NOT NULL
        GROUP BY "sessionId" HAVING COUNT(*) > 1
        ORDER BY COUNT(*) DESC LIMIT 50
      ),
      duplicate_gateway_ids AS (
        SELECT 'duplicate_gateway_payment' AS issue, "gatewayPaymentId" AS reference, COUNT(*)::int AS occurrences
        FROM "paymentRecord"
        WHERE "paymentMethod" = 'payhere' AND "gatewayPaymentId" IS NOT NULL
        GROUP BY "gatewayPaymentId" HAVING COUNT(*) > 1
        ORDER BY COUNT(*) DESC LIMIT 50
      ),
      aged_pending AS (
        SELECT 'pending_over_24h' AS issue, "sessionId" AS reference, 1::int AS occurrences
        FROM "paymentRecord"
        WHERE "paymentMethod" = 'payhere' AND status = 'pending'
          AND "createdAt" < NOW() - INTERVAL '24 hours'
        ORDER BY "createdAt" ASC LIMIT 50
      ),
      completed_without_gateway AS (
        SELECT 'completed_without_gateway_id' AS issue, "sessionId" AS reference, 1::int AS occurrences
        FROM "paymentRecord"
        WHERE "paymentMethod" = 'payhere' AND status = 'completed'
          AND ("gatewayPaymentId" IS NULL OR "gatewayPaymentId" = '')
        ORDER BY "createdAt" DESC LIMIT 50
      )
      SELECT issue, reference, occurrences FROM duplicate_orders
      UNION ALL SELECT issue, reference, occurrences FROM duplicate_gateway_ids
      UNION ALL SELECT issue, reference, occurrences FROM aged_pending
      UNION ALL SELECT issue, reference, occurrences FROM completed_without_gateway
    `);
    const rows = results.rows || results;
    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      readOnly: true,
      perCategoryLimit: 50,
      note: "Sampled anomalies only. Review against PayHere before refunding or changing entitlements.",
      issues: rows
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Payment reconciliation report error:", error);
    return NextResponse.json({ error: "Unable to generate reconciliation report" }, { status: 500 });
  }
}
