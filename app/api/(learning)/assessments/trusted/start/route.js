import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { and, desc, eq, or, sql } from "drizzle-orm";
import { db } from "@/configs/db";
import {
  STUDY_MATERIAL_TABLE, COURSE_ENROLLMENT_TABLE, STUDY_TYPE_CONTENT_TABLE,
  TRUSTED_ASSESSMENT_ATTEMPT_TABLE, TRUSTED_COURSE_REVISION_TABLE
} from "@/configs/schema";
import { requireUserAuth } from "@/lib/userApiAuth";
import { checkRateLimit } from "@/lib/rateLimit";
import { parseAssessmentQuestions, publicAssessmentQuestions } from "@/lib/trustedAssessment";
import { fingerprintCourseManifest } from "@/lib/trustedCourseManifest";

export async function POST(req) {
  if (process.env.TRUSTED_ASSESSMENTS_ENABLED !== "true") {
    return NextResponse.json({ error: "Trusted assessments not yet enabled" }, { status: 503 });
  }
  const access = await requireUserAuth(req);
  if (!access.authenticated || !access.email) {
    return access.error || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Defense-in-depth only. In-memory throttling is not a distributed attempt quota.
  const throttle = checkRateLimit(access.userId || access.email, "assignment");
  if (throttle.limited) {
    return NextResponse.json({ error: "Too many assessment starts. Please try again later." }, {
      status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil(throttle.resetIn / 1000))) }
    });
  }
  try {
    const { courseId, assessmentId } = await req.json();
    if (typeof courseId !== "string" || !courseId.trim() || courseId.length > 255 ||
        !Number.isSafeInteger(assessmentId) || assessmentId < 1) {
      return NextResponse.json({ error: "Invalid assessment reference" }, { status: 400 });
    }
    // Student must be the course creator, an enrolled user, or have access to a public course.
    const [course] = await db.select({
      courseId: STUDY_MATERIAL_TABLE.courseId
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
    if (!course) return NextResponse.json({ error: "Assessment not available" }, { status: 404 });

    const enforceRevisions = process.env.TRUSTED_COURSE_REVISIONS_ENABLED === "true";
    let material;
    let courseRevisionId = null;
    if (enforceRevisions) {
      // The source of truth is a PRIVATE immutable published snapshot, not
      // mutable studyTypeContent. Historical unbound attempts stay separate.
      const [revision] = await db.select({
        id: TRUSTED_COURSE_REVISION_TABLE.id,
        fingerprint: TRUSTED_COURSE_REVISION_TABLE.fingerprint,
        manifestVersion: TRUSTED_COURSE_REVISION_TABLE.manifestVersion,
        manifestSnapshot: TRUSTED_COURSE_REVISION_TABLE.manifestSnapshot
      }).from(TRUSTED_COURSE_REVISION_TABLE)
        .where(eq(TRUSTED_COURSE_REVISION_TABLE.courseId, courseId))
        .orderBy(desc(TRUSTED_COURSE_REVISION_TABLE.revisionNumber)).limit(1);
      if (!revision) return NextResponse.json({
        error: "No published revision for this course"
      }, { status: 409 });
      const m = revision.manifestSnapshot;
      if (!m || m.courseId !== courseId || !Array.isArray(m.assessments) ||
          !Array.isArray(m.assignments) || !m.courseLayout ||
          revision.manifestVersion !== "course-manifest-sha256-v1") {
        return NextResponse.json({ error: "Invalid published revision" }, { status: 409 });
      }
      const check = fingerprintCourseManifest({
        courseId, courseLayout: m.courseLayout,
        assessments: m.assessments, assignments: m.assignments
      });
      if (check.status !== "provisional_unfrozen" || check.fingerprint !== revision.fingerprint) {
        return NextResponse.json({ error: "Published revision integrity check failed" }, { status: 409 });
      }
      material = m.assessments.find(a => a.id === assessmentId &&
        ["Quiz", "MCQ"].includes(a.type));
      courseRevisionId = revision.id;
    } else {
      const [current] = await db.select({
        id: STUDY_TYPE_CONTENT_TABLE.id,
        content: STUDY_TYPE_CONTENT_TABLE.content
      }).from(STUDY_TYPE_CONTENT_TABLE).where(and(
        eq(STUDY_TYPE_CONTENT_TABLE.id, assessmentId),
        eq(STUDY_TYPE_CONTENT_TABLE.courseId, courseId),
        or(eq(STUDY_TYPE_CONTENT_TABLE.type, "Quiz"), eq(STUDY_TYPE_CONTENT_TABLE.type, "MCQ")),
        eq(STUDY_TYPE_CONTENT_TABLE.status, "Ready")
      )).limit(1);
      material = current;
    }
    if (!material) return NextResponse.json({ error: "Assessment not ready" }, { status: 404 });

    const snapshot = parseAssessmentQuestions(material.content);
    const attemptId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + Math.min(60, Math.max(5, snapshot.length)) * 60_000);
    await db.insert(TRUSTED_ASSESSMENT_ATTEMPT_TABLE).values({
      id: attemptId,
      studentEmail: access.email,
      courseId,
      studyTypeContentId: material.id,
      ...(enforceRevisions && { courseRevisionId }),
      questionSnapshot: snapshot,
      questionCount: snapshot.length,
      expiresAt
    });
    return NextResponse.json({
      attemptId,
      ...(enforceRevisions && { courseRevisionId }),
      expiresAt: expiresAt.toISOString(),
      questionCount: snapshot.length,
      questions: publicAssessmentQuestions(snapshot)
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof TypeError) {
      return NextResponse.json({ error: "Assessment content is not supported" }, { status: 422 });
    }
    console.error("Trusted assessment start failed:", error);
    return NextResponse.json({ error: "Unable to start assessment" }, { status: 500 });
  }
}
