import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/configs/db";
import {
  STUDY_MATERIAL_TABLE, STUDY_TYPE_CONTENT_TABLE, COURSE_ASSIGNMENTS_TABLE
} from "@/configs/schema";
import { requireUserAuth } from "@/lib/userApiAuth";
import { fingerprintCourseManifest } from "@/lib/trustedCourseManifest";

// Instructor-only read-only prepublication review. No answers, rubrics, chapter
// content or private snapshots are returned. This CANNOT publish a revision.
// A later database-atomic publication operation must revalidate its source data.
export async function GET(req) {
  if (process.env.TRUSTED_COURSE_PUBLISHING_PREVIEW_ENABLED !== "true") {
    return NextResponse.json({ error: "Course publishing preview disabled" },
      { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  const user = await requireUserAuth(req);
  if (!user.authenticated || !user.email) return user.error ||
    NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const courseId = new URL(req.url).searchParams.get("courseId");
  if (typeof courseId !== "string" || !courseId.trim() || courseId.length > 255) {
    return NextResponse.json({ error: "Invalid course" }, { status: 400 });
  }
  try {
    // Authorization precedes all reads of private assessment content.
    const [course] = await db.select({
      courseId: STUDY_MATERIAL_TABLE.courseId,
      createdBy: STUDY_MATERIAL_TABLE.createdBy,
      courseLayout: STUDY_MATERIAL_TABLE.courseLayout,
      hasAssignments: STUDY_MATERIAL_TABLE.hasAssignments,
      assignmentCount: STUDY_MATERIAL_TABLE.assignmentCount
    }).from(STUDY_MATERIAL_TABLE).where(and(
      eq(STUDY_MATERIAL_TABLE.courseId, courseId),
      eq(STUDY_MATERIAL_TABLE.createdBy, user.email)
    )).limit(1);
    if (!course) return NextResponse.json({ error: "Course unavailable" },
      { status: 404, headers: { "Cache-Control": "no-store" } });

    const [rawAssessments, assignments] = await Promise.all([
      db.select({
        id: STUDY_TYPE_CONTENT_TABLE.id,
        chapterId: STUDY_TYPE_CONTENT_TABLE.chapterId,
        type: STUDY_TYPE_CONTENT_TABLE.type,
        status: STUDY_TYPE_CONTENT_TABLE.status,
        content: STUDY_TYPE_CONTENT_TABLE.content
      }).from(STUDY_TYPE_CONTENT_TABLE).where(and(
        eq(STUDY_TYPE_CONTENT_TABLE.courseId, courseId),
        inArray(STUDY_TYPE_CONTENT_TABLE.type, ["Quiz", "MCQ"])
      )).limit(201),
      db.select({
        assignmentId: COURSE_ASSIGNMENTS_TABLE.assignmentId,
        title: COURSE_ASSIGNMENTS_TABLE.title,
        description: COURSE_ASSIGNMENTS_TABLE.description,
        rubric: COURSE_ASSIGNMENTS_TABLE.rubric,
        totalPoints: COURSE_ASSIGNMENTS_TABLE.totalPoints
      }).from(COURSE_ASSIGNMENTS_TABLE)
        .where(eq(COURSE_ASSIGNMENTS_TABLE.courseId, courseId)).limit(201)
    ]);
    const unpublishedAssessments = rawAssessments.some(a => a.status !== "Ready");
    const incomplete = rawAssessments.length > 200 || assignments.length > 200 ||
      unpublishedAssessments || (course.hasAssignments === true &&
        assignments.length < Math.max(1, course.assignmentCount || 0));
    const preview = fingerprintCourseManifest({
      courseId, courseLayout: course.courseLayout,
      assessments: rawAssessments.filter(a => a.status === "Ready"),
      assignments, incomplete
    });
    const status = preview.status === "provisional_unfrozen" ? "review_required" : "incomplete_data";
    return NextResponse.json({
      courseId,
      status,
      manifestVersion: preview.version,
      provisionalFingerprint: preview.fingerprint,
      assessmentCount: rawAssessments.length,
      assignmentCount: assignments.length,
      unpublishedAssessments,
      frozen: false,
      canPublish: false,
      reason: status === "review_required"
        ? "Atomic publishing and immutable-revision approval are not enabled"
        : "Course requirements are incomplete or invalid"
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Instructor publication review failed", error);
    return NextResponse.json({ error: "Unable to review course for publication" },
      { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
