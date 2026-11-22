import { NextResponse } from "next/server";
import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "@/configs/db";
import {
  STUDY_MATERIAL_TABLE, COURSE_ENROLLMENT_TABLE, STUDY_TYPE_CONTENT_TABLE,
  COURSE_ASSIGNMENTS_TABLE, ASSIGNMENT_SUBMISSIONS_TABLE,
  TRUSTED_ASSESSMENT_ATTEMPT_TABLE, TRUSTED_CHAPTER_SESSION_TABLE
} from "@/configs/schema";
import { requireUserAuth } from "@/lib/userApiAuth";
import { evaluateTrustedCourseAssessments } from "@/lib/trustedCoursePolicy";
import { summarizeTrustedChapterEvidence } from "@/lib/trustedChapterEvidence";
import { buildChapterCompletionReview } from "@/lib/trustedChapterReview";
import { fingerprintCourseManifest, compareCourseFingerprint } from "@/lib/trustedCourseManifest";

// Read-only student assessment review. No official grade or certificate updates.
export async function GET(req) {
  if (process.env.TRUSTED_ASSESSMENTS_ENABLED !== "true") {
    return NextResponse.json({ error: "Trusted assessments disabled" }, { status: 503 });
  }
  const access = await requireUserAuth(req);
  if (!access.authenticated || !access.email) {
    return access.error || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const query = new URL(req.url).searchParams;
  const courseId = query.get("courseId");
  const referenceFingerprint = query.get("expectedFingerprint");
  if (!courseId || courseId.length > 255) {
    return NextResponse.json({ error: "Invalid course ID" }, { status: 400 });
  }
  try {
    const [course] = await db.select({
      id: STUDY_MATERIAL_TABLE.courseId,
      assignmentCount: STUDY_MATERIAL_TABLE.assignmentCount,
      hasAssignments: STUDY_MATERIAL_TABLE.hasAssignments,
      courseLayout: STUDY_MATERIAL_TABLE.courseLayout
    }).from(STUDY_MATERIAL_TABLE).where(and(
      eq(STUDY_MATERIAL_TABLE.courseId, courseId),
      or(
        eq(STUDY_MATERIAL_TABLE.createdBy, access.email),
        and(
          eq(STUDY_MATERIAL_TABLE.isPublic, true),
          sql`COALESCE(${STUDY_MATERIAL_TABLE.price}, 0) = 0`
        ),
        sql`EXISTS (
          SELECT 1 FROM "courseEnrollments" e
          WHERE e."courseId" = ${courseId} AND e."studentEmail" = ${access.email}
            AND e.status = 'Active'
        )`
      )
    )).limit(1);
    if (!course) return NextResponse.json({ error: "Course not available" }, { status: 404 });

    const [assessments, assignments, attempts, submissions] = await Promise.all([
      db.select({
        id: STUDY_TYPE_CONTENT_TABLE.id, type: STUDY_TYPE_CONTENT_TABLE.type,
        chapterId: STUDY_TYPE_CONTENT_TABLE.chapterId,
        content: STUDY_TYPE_CONTENT_TABLE.content
      }).from(STUDY_TYPE_CONTENT_TABLE).where(and(
        eq(STUDY_TYPE_CONTENT_TABLE.courseId, courseId),
        inArray(STUDY_TYPE_CONTENT_TABLE.type, ["Quiz", "MCQ"]),
        eq(STUDY_TYPE_CONTENT_TABLE.status, "Ready")
      )).limit(201),
      db.select({ assignmentId: COURSE_ASSIGNMENTS_TABLE.assignmentId,
        title: COURSE_ASSIGNMENTS_TABLE.title,
        description: COURSE_ASSIGNMENTS_TABLE.description,
        rubric: COURSE_ASSIGNMENTS_TABLE.rubric,
        totalPoints: COURSE_ASSIGNMENTS_TABLE.totalPoints })
        .from(COURSE_ASSIGNMENTS_TABLE)
        .where(eq(COURSE_ASSIGNMENTS_TABLE.courseId, courseId)).limit(201),
      db.select({
        id: TRUSTED_ASSESSMENT_ATTEMPT_TABLE.id,
        studyTypeContentId: TRUSTED_ASSESSMENT_ATTEMPT_TABLE.studyTypeContentId,
        score: TRUSTED_ASSESSMENT_ATTEMPT_TABLE.score,
        status: TRUSTED_ASSESSMENT_ATTEMPT_TABLE.status,
        mlEligibility: TRUSTED_ASSESSMENT_ATTEMPT_TABLE.mlEligibility,
        submittedAt: TRUSTED_ASSESSMENT_ATTEMPT_TABLE.submittedAt
      }).from(TRUSTED_ASSESSMENT_ATTEMPT_TABLE).where(and(
        eq(TRUSTED_ASSESSMENT_ATTEMPT_TABLE.courseId, courseId),
        eq(TRUSTED_ASSESSMENT_ATTEMPT_TABLE.studentEmail, access.email),
        eq(TRUSTED_ASSESSMENT_ATTEMPT_TABLE.status, "submitted"),
        eq(TRUSTED_ASSESSMENT_ATTEMPT_TABLE.mlEligibility, "server_verified")
      )).orderBy(desc(TRUSTED_ASSESSMENT_ATTEMPT_TABLE.submittedAt)).limit(1001),
      db.select({
        id: ASSIGNMENT_SUBMISSIONS_TABLE.id,
        assignmentId: ASSIGNMENT_SUBMISSIONS_TABLE.assignmentId,
        score: ASSIGNMENT_SUBMISSIONS_TABLE.score,
        status: ASSIGNMENT_SUBMISSIONS_TABLE.status,
        gradedBy: ASSIGNMENT_SUBMISSIONS_TABLE.gradedBy,
        gradedAt: ASSIGNMENT_SUBMISSIONS_TABLE.gradedAt,
        reviewedBy: ASSIGNMENT_SUBMISSIONS_TABLE.reviewedBy,
        reviewedAt: ASSIGNMENT_SUBMISSIONS_TABLE.reviewedAt
      }).from(ASSIGNMENT_SUBMISSIONS_TABLE).where(and(
        eq(ASSIGNMENT_SUBMISSIONS_TABLE.courseId, courseId),
        eq(ASSIGNMENT_SUBMISSIONS_TABLE.studentEmail, access.email)
      )).orderBy(desc(ASSIGNMENT_SUBMISSIONS_TABLE.submittedAt)).limit(1001)
    ]);
    const truncated = assessments.length > 200 || assignments.length > 200 ||
      attempts.length > 1000 || submissions.length > 1000 ||
      (course.hasAssignments === true &&
       assignments.length < Math.max(1, course.assignmentCount || 0));
    // Fingerprint the current course requirements including private assessment
    // content, but NEVER expose that content in the response. This is NOT a
    // persisted/signed immutable course version or official completion proof.
    const manifest = fingerprintCourseManifest({
      courseId,
      courseLayout: course.courseLayout,
      assessments: assessments.slice(0, 200),
      assignments: assignments.slice(0, 200),
      incomplete: truncated
    });
    const manifestComparison = compareCourseFingerprint(manifest, referenceFingerprint);
    const policy = evaluateTrustedCourseAssessments({
      assessments: assessments.slice(0, 200),
      assignments: assignments.slice(0, 200),
      attempts: attempts.slice(0, 1000),
      submissions: submissions.slice(0, 1000),
      truncated
    });
    // Chapter indices are a provisional mapping from the current course layout.
    // This is assessment evidence only; no verified reading/completion event exists.
    // Missing or inconsistent mappings must never produce an official award.
    const configuredChapters = course.courseLayout?.chapters;
    const chapterCatalogValid = Array.isArray(configuredChapters) &&
      configuredChapters.length > 0 && configuredChapters.length <= 200;
    let chapterEvidence = {
      evidenceStatus: "unverified_chapter_mapping",
      allAssessmentCheckpointsPassed: false,
      chapterCompletionVerified: false,
      chapters: []
    };
    if (chapterCatalogValid) {
      const chapterAssessments = assessments.slice(0, 200);
      const mappingValid = chapterAssessments.every(item =>
        Number.isSafeInteger(item.chapterId) &&
        item.chapterId >= 0 && item.chapterId < configuredChapters.length);
      if (mappingValid) {
        chapterEvidence = summarizeTrustedChapterEvidence({
          chapters: configuredChapters.map((_, index) => index),
          assessments: chapterAssessments,
          attempts: attempts.slice(0, 1000),
          truncated
        });
      }
    }
    // Activity pilot data is queried only behind its separate flag. It is an
    // advisory audit signal and must never establish chapter completion.
    const activityEnabled = process.env.TRUSTED_CHAPTER_ACTIVITY_ENABLED === "true";
    const activitySessions = activityEnabled ? await db.select({
      chapterIndex: TRUSTED_CHAPTER_SESSION_TABLE.chapterIndex,
      heartbeatCount: TRUSTED_CHAPTER_SESSION_TABLE.heartbeatCount,
      startedAt: TRUSTED_CHAPTER_SESSION_TABLE.startedAt,
      expiresAt: TRUSTED_CHAPTER_SESSION_TABLE.expiresAt,
      closedAt: TRUSTED_CHAPTER_SESSION_TABLE.closedAt
    }).from(TRUSTED_CHAPTER_SESSION_TABLE).where(and(
      eq(TRUSTED_CHAPTER_SESSION_TABLE.studentEmail, access.email),
      eq(TRUSTED_CHAPTER_SESSION_TABLE.courseId, courseId)
    )).limit(501) : [];
    const chapterReview = buildChapterCompletionReview({
      chapterEvidence, activityEnabled,
      sessions: activitySessions.slice(0, 500),
      truncated: truncated || activitySessions.length > 500
    });
    return NextResponse.json({
      chapterReview,
      chapterEvidence,
      courseManifest: { ...manifest, comparison: manifestComparison },
      courseId, ...policy,
      officialGrade: null, certificateIssuanceEnabled: false
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Trusted course policy read failed:", error);
    return NextResponse.json({ error: "Unable to evaluate course assessments" }, { status: 500 });
  }
}
