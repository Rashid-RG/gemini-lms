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
        // The state change must be conditional on the canonical database row
        // *still* matching the committed ledger. The earlier JS comparison alone
        // is not sufficient if another request modifies either row concurrently.
        const transition = await db.execute(sql`
          UPDATE "trustedAssessmentAttempts" a
          SET "adaptiveSyncStatus" = 'ledgered'
          WHERE a."id" = ${attempt.id}
            AND a."status" = 'submitted'
            AND a."mlEligibility" = 'server_verified'
            AND a."adaptiveSyncStatus" = 'pending'
            AND EXISTS (
              SELECT 1 FROM "verifiedAssessmentProjection" p
              WHERE p."attemptId" = a."id"
                AND p."studentEmail" = a."studentEmail"
                AND p."courseId" = a."courseId"
                AND p."studyTypeContentId" = a."studyTypeContentId"
                AND p."score" = a."score"
                AND p."submittedAt" = a."submittedAt"
            )
          RETURNING a."id"
        `);
        // Only count rows actually transitioned by this invocation.
        if ((transition.rows || transition).length === 1) {
          ledgered++;
        } else {
          conflicts++;
        }
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
