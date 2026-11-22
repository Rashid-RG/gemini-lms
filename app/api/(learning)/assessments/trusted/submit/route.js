import { NextResponse } from "next/server";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/configs/db";
import { TRUSTED_ASSESSMENT_ATTEMPT_TABLE } from "@/configs/schema";
import { requireUserAuth } from "@/lib/userApiAuth";
import { gradeAssessment } from "@/lib/trustedAssessment";

// Only scores calculated from a server-stored attempt may enter the trusted dataset.
export async function POST(req) {
  if (process.env.TRUSTED_ASSESSMENTS_ENABLED !== "true") {
    return NextResponse.json({ error: "Trusted assessments not yet enabled" }, { status: 503 });
  }
  // Never silently grade unbound attempts if immutable revision enforcement is
  // switched on before publishing, snapshot binding and migration are reviewed.
  if (process.env.TRUSTED_COURSE_REVISIONS_ENABLED === "true") {
    return NextResponse.json({
      error: "Revision-bound assessment workflow is not yet available"
    }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  const access = await requireUserAuth(req);
  if (!access.authenticated || !access.email) {
    return access.error || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { attemptId, responses } = await req.json();
    if (typeof attemptId !== "string" || !/^[0-9a-f-]{36}$/i.test(attemptId) ||
        !Array.isArray(responses) || responses.length > 100) {
      return NextResponse.json({ error: "Invalid attempt submission" }, { status: 400 });
    }
    const [attempt] = await db.select().from(TRUSTED_ASSESSMENT_ATTEMPT_TABLE).where(and(
      eq(TRUSTED_ASSESSMENT_ATTEMPT_TABLE.id, attemptId),
      eq(TRUSTED_ASSESSMENT_ATTEMPT_TABLE.studentEmail, access.email)
    )).limit(1);
    if (!attempt) return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    if (attempt.status !== "started" || new Date(attempt.expiresAt).getTime() <= Date.now()) {
      return NextResponse.json({ error: "Attempt expired or already submitted" }, { status: 409 });
    }
    const result = gradeAssessment(attempt.questionSnapshot, responses);
    // Atomic claim: only one concurrent request can successfully transition started -> submitted.
    const [submitted] = await db.update(TRUSTED_ASSESSMENT_ATTEMPT_TABLE).set({
      status: "submitted",
      answers: responses,
      gradeDetails: result.details,
      score: result.score,
      correctCount: result.correctCount,
      mlEligibility: "server_verified",
      submittedAt: new Date()
    }).where(and(
      eq(TRUSTED_ASSESSMENT_ATTEMPT_TABLE.id, attemptId),
      eq(TRUSTED_ASSESSMENT_ATTEMPT_TABLE.studentEmail, access.email),
      eq(TRUSTED_ASSESSMENT_ATTEMPT_TABLE.status, "started"),
      gt(TRUSTED_ASSESSMENT_ATTEMPT_TABLE.expiresAt, new Date())
    )).returning({ id: TRUSTED_ASSESSMENT_ATTEMPT_TABLE.id });
    if (!submitted) return NextResponse.json({ error: "Attempt already submitted or expired" }, { status: 409 });

    // Deliberately leave adaptiveSyncStatus = "pending".
    // Until a durable, attempt-idempotent projection worker exists, updating here
    // could double count an assessment after a partial failure and retry.
    // The authoritative graded attempt remains stored once for later reconciliation.
    return NextResponse.json({
      attemptId,
      gradingVersion: "trusted-v1",
      verified: true,
      score: result.score,
      correctCount: result.correctCount,
      totalQuestions: result.totalQuestions,
      questionOutcomes: result.details.map(({ questionId, isCorrect }) => ({ questionId, isCorrect }))
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof TypeError) return NextResponse.json({ error: "Invalid response format" }, { status: 400 });
    console.error("Trusted assessment submit failed:", error);
    return NextResponse.json({ error: "Unable to submit assessment" }, { status: 500 });
  }
}
