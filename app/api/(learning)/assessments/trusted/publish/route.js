import { NextResponse } from "next/server";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/configs/db";
import {
  STUDY_MATERIAL_TABLE, STUDY_TYPE_CONTENT_TABLE, COURSE_ASSIGNMENTS_TABLE
} from "@/configs/schema";
import { requireUserAuth } from "@/lib/userApiAuth";
import {
  fingerprintCourseManifest, buildPrivateCourseManifestSnapshot
} from "@/lib/trustedCourseManifest";

// Privileged experimental publication route. Must remain OFF until the proposed
// DB function/migrations and real Clerk+Neon tests are independently approved.
// The DB function re-reads and locks source tables before appending a revision.
export async function POST(req) {
  if (process.env.TRUSTED_ASSESSMENTS_ENABLED !== "true" ||
      process.env.TRUSTED_COURSE_REVISIONS_ENABLED !== "true" ||
      process.env.TRUSTED_COURSE_PUBLISHING_ENABLED !== "true") {
    return NextResponse.json({ error: "Immutable course publishing disabled" },
      { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  const access = await requireUserAuth(req);
  if (!access.authenticated || !access.email) return access.error ||
    NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let input;
  try { input = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request JSON" }, { status: 400 });
  }
  const courseId = input?.courseId;
  const expectedFingerprint = input?.expectedFingerprint;
  if (typeof courseId !== "string" || !courseId.trim() || courseId.length > 255 ||
      typeof expectedFingerprint !== "string" || !/^[a-f0-9]{64}$/.test(expectedFingerprint)) {
    return NextResponse.json({ error: "A reviewed course fingerprint is required" },
      { status: 400 });
  }
  try {
    const [course] = await db.select({
      courseId: STUDY_MATERIAL_TABLE.courseId,
      courseLayout: STUDY_MATERIAL_TABLE.courseLayout,
      hasAssignments: STUDY_MATERIAL_TABLE.hasAssignments,
      assignmentCount: STUDY_MATERIAL_TABLE.assignmentCount
    }).from(STUDY_MATERIAL_TABLE).where(and(
      eq(STUDY_MATERIAL_TABLE.courseId, courseId),
      eq(STUDY_MATERIAL_TABLE.createdBy, access.email)
    )).limit(1);
    if (!course) return NextResponse.json({ error: "Course unavailable" }, { status: 404 });

    const [assessments, assignments] = await Promise.all([
      db.select({
        id: STUDY_TYPE_CONTENT_TABLE.id,
        chapterId: STUDY_TYPE_CONTENT_TABLE.chapterId,
        type: STUDY_TYPE_CONTENT_TABLE.type,
        content: STUDY_TYPE_CONTENT_TABLE.content,
        status: STUDY_TYPE_CONTENT_TABLE.status
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
    const incomplete = assessments.length > 200 || assignments.length > 200 ||
      assessments.some(a => a.status !== "Ready") ||
      (course.hasAssignments === true &&
        assignments.length < Math.max(1, course.assignmentCount || 0));
    const readyAssessments = assessments.filter(a => a.status === "Ready");
    const current = fingerprintCourseManifest({
      courseId, courseLayout: course.courseLayout,
      assessments: readyAssessments, assignments, incomplete
    });
    if (current.status !== "provisional_unfrozen" ||
        current.fingerprint !== expectedFingerprint) {
      return NextResponse.json({ error: "Reviewed course fingerprint is stale or incomplete" },
        { status: 409, headers: { "Cache-Control": "no-store" } });
    }

    // PRIVATE and never returned. The single SQL function revalidates against
    // locked live source rows, rejecting concurrent instructor edits.
    const snapshot = buildPrivateCourseManifestSnapshot({
      courseId, courseLayout: course.courseLayout,
      assessments: readyAssessments, assignments
    });
    const result = await db.execute(sql`
      SELECT trusted_publish_course_revision(
        ${courseId}, ${access.email}, ${JSON.stringify(snapshot)}::jsonb,
        ${current.fingerprint}
      ) AS revision
    `);
    const published = result?.rows?.[0]?.revision ?? result?.[0]?.revision;
    if (!published || published.fingerprint !== current.fingerprint ||
        !Number.isSafeInteger(published.revisionNumber) ||
        typeof published.revisionId !== "string") {
      throw new Error("Publisher returned an invalid revision");
    }
    return NextResponse.json({
      published: true,
      courseId,
      revisionId: published.revisionId,
      revisionNumber: published.revisionNumber,
      fingerprint: published.fingerprint,
      manifestVersion: published.manifestVersion
    }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    // Never print private question or rubric data from failed SQL statements.
    console.error("Immutable course publishing failed", error?.code || error?.name || "unknown");
    return NextResponse.json({ error: "Course publication failed; review current requirements" },
      { status: 409, headers: { "Cache-Control": "no-store" } });
  }
}
