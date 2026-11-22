import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/configs/db";
import { TRUSTED_ASSESSMENT_ATTEMPT_TABLE } from "@/configs/schema";
import { requireUserAuth } from "@/lib/userApiAuth";
import { summarizeVerifiedAttempts } from "@/lib/verifiedAssessmentSummary";

// Read-only derived performance: never grants credits, modifies gradebook,
// or increments adaptive counters. Duplicate HTTP calls return the same result.
export async function GET(req) {
  if (process.env.TRUSTED_ASSESSMENTS_ENABLED !== "true") {
    return NextResponse.json({ error: "Trusted assessments not yet enabled" }, { status: 503 });
  }
  const access = await requireUserAuth(req);
  if (!access.authenticated || !access.email) {
    return access.error || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const courseId = new URL(req.url).searchParams.get("courseId");
  if (!courseId || courseId.length > 255) {
    return NextResponse.json({ error: "Invalid course" }, { status: 400 });
  }
  try {
    // Bounded recent verified attempts, ordered newest-first. The response clearly
    // labels truncation; a full research dataset must use an audited pagination/export pipeline.
    const attempts = await db.select({
      id: TRUSTED_ASSESSMENT_ATTEMPT_TABLE.id,
      studyTypeContentId: TRUSTED_ASSESSMENT_ATTEMPT_TABLE.studyTypeContentId,
      score: TRUSTED_ASSESSMENT_ATTEMPT_TABLE.score,
      submittedAt: TRUSTED_ASSESSMENT_ATTEMPT_TABLE.submittedAt,
      status: TRUSTED_ASSESSMENT_ATTEMPT_TABLE.status,
      mlEligibility: TRUSTED_ASSESSMENT_ATTEMPT_TABLE.mlEligibility
    }).from(TRUSTED_ASSESSMENT_ATTEMPT_TABLE).where(and(
      eq(TRUSTED_ASSESSMENT_ATTEMPT_TABLE.studentEmail, access.email),
      eq(TRUSTED_ASSESSMENT_ATTEMPT_TABLE.courseId, courseId),
      eq(TRUSTED_ASSESSMENT_ATTEMPT_TABLE.status, "submitted"),
      eq(TRUSTED_ASSESSMENT_ATTEMPT_TABLE.mlEligibility, "server_verified")
    )).orderBy(desc(TRUSTED_ASSESSMENT_ATTEMPT_TABLE.submittedAt))
      .limit(501);
    const truncated = attempts.length > 500;
    const assessments = summarizeVerifiedAttempts(attempts.slice(0, 500));
    return NextResponse.json({
      courseId, assessments, source: "verified_attempts", window: "latest_500",
      truncated, totalSampled: Math.min(attempts.length, 500),
      note: truncated ? "Only the most recent 500 verified attempts are included." : null
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Verified performance summary error:", error);
    return NextResponse.json({ error: "Unable to read verified assessment performance" }, { status: 500 });
  }
}
