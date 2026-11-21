import { NextResponse } from "next/server";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/configs/db";
import {
  TRUSTED_ASSESSMENT_ATTEMPT_TABLE,
  VERIFIED_ASSESSMENT_PROJECTION_TABLE
} from "@/configs/schema";
import { requireSuperAdmin } from "@/lib/adminApiAuth";
import { matchesVerifiedProjection } from "@/lib/verifiedProjection";

// Manually triggered, super-admin-only pilot reconciliation.
// No scheduled worker, training job or legacy counter mutation is enabled.
export async function POST() {
  const access = await requireSuperAdmin();
  if (!access.authenticated) return access.error;
  if (process.env.TRUSTED_ASSESSMENTS_ENABLED !== "true" ||
      process.env.TRUSTED_ASSESSMENT_SYNC_ENABLED !== "true") {
    return NextResponse.json({ error: "Verified projection synchronization disabled" }, { status: 503 });
  }
  try {
    const pending = await db.select().from(TRUSTED_ASSESSMENT_ATTEMPT_TABLE)
      .where(and(
        eq(TRUSTED_ASSESSMENT_ATTEMPT_TABLE.status, "submitted"),
        eq(TRUSTED_ASSESSMENT_ATTEMPT_TABLE.mlEligibility, "server_verified"),
        eq(TRUSTED_ASSESSMENT_ATTEMPT_TABLE.adaptiveSyncStatus, "pending")
      )).orderBy(asc(TRUSTED_ASSESSMENT_ATTEMPT_TABLE.submittedAt)).limit(25);

    let ledgered = 0;
    let conflicts = 0;
    let failures = 0;
    for (const attempt of pending) {
      try {
        // A committed INSERT is an idempotent checkpoint. Concurrent invocations
        // cannot create duplicate rows because attemptId is a primary key.
        await db.execute(sql`
          INSERT INTO "verifiedAssessmentProjection"
            ("attemptId", "studentEmail", "courseId", "studyTypeContentId", "score", "submittedAt")
          SELECT a."id", a."studentEmail", a."courseId", a."studyTypeContentId",
                 a."score", a."submittedAt"
          FROM "trustedAssessmentAttempts" a
          WHERE a."id" = ${attempt.id}
            AND a."status" = 'submitted'
            AND a."mlEligibility" = 'server_verified'
            AND a."score" BETWEEN 0 AND 100
            AND a."submittedAt" IS NOT NULL
          ON CONFLICT ("attemptId") DO NOTHING
        `);
        const [projection] = await db.select().from(VERIFIED_ASSESSMENT_PROJECTION_TABLE)
          .where(eq(VERIFIED_ASSESSMENT_PROJECTION_TABLE.attemptId, attempt.id)).limit(1);
        if (!matchesVerifiedProjection(attempt, projection)) {
          conflicts++;
          continue;
        }
        await db.update(TRUSTED_ASSESSMENT_ATTEMPT_TABLE)
          .set({ adaptiveSyncStatus: "ledgered" })
          .where(and(
            eq(TRUSTED_ASSESSMENT_ATTEMPT_TABLE.id, attempt.id),
            eq(TRUSTED_ASSESSMENT_ATTEMPT_TABLE.status, "submitted"),
            eq(TRUSTED_ASSESSMENT_ATTEMPT_TABLE.mlEligibility, "server_verified"),
            eq(TRUSTED_ASSESSMENT_ATTEMPT_TABLE.adaptiveSyncStatus, "pending")
          ));
        ledgered++;
      } catch (error) {
        failures++;
        console.error("Verified attempt projection failed", { attemptId: attempt.id, error });
      }
    }
    return NextResponse.json({
      processed: pending.length, ledgered, conflicts, failures,
      source: "server_verified_attempts", ledger: "verifiedAssessmentProjection",
      legacyAdaptiveCountersUpdated: false, batchLimit: 25
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Verified projection reconciliation failed:", error);
    return NextResponse.json({ error: "Unable to reconcile verified attempts" }, { status: 500 });
  }
}
