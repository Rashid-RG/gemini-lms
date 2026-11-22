import { NextResponse } from "next/server";
import { and, eq, or, sql } from "drizzle-orm";
import { db } from "@/configs/db";
import { STUDY_MATERIAL_TABLE, STUDY_TYPE_CONTENT_TABLE } from "@/configs/schema";
import { requireUserAuth } from "@/lib/userApiAuth";

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
    const [course] = await db.select({ courseId: STUDY_MATERIAL_TABLE.courseId })
      .from(STUDY_MATERIAL_TABLE).where(and(
        eq(STUDY_MATERIAL_TABLE.courseId, courseId),
        or(
          eq(STUDY_MATERIAL_TABLE.createdBy, access.email),
          and(
          eq(STUDY_MATERIAL_TABLE.isPublic, true),
          sql`COALESCE(${STUDY_MATERIAL_TABLE.price}, 0) = 0`
        ),
          sql`EXISTS (SELECT 1 FROM "courseEnrollments" e
            WHERE e."courseId" = ${courseId} AND e."studentEmail" = ${access.email}
              AND e.status = 'Active')`
        )
      )).limit(1);
    if (!course) return NextResponse.json({ error: "Course not available" }, { status: 404 });
    const assessments = await db.select({
      assessmentId: STUDY_TYPE_CONTENT_TABLE.id,
      type: STUDY_TYPE_CONTENT_TABLE.type,
      chapterId: STUDY_TYPE_CONTENT_TABLE.chapterId,
      difficulty: STUDY_TYPE_CONTENT_TABLE.difficulty
    }).from(STUDY_TYPE_CONTENT_TABLE).where(and(
      eq(STUDY_TYPE_CONTENT_TABLE.courseId, courseId),
      eq(STUDY_TYPE_CONTENT_TABLE.status, "Ready"),
      or(eq(STUDY_TYPE_CONTENT_TABLE.type, "Quiz"), eq(STUDY_TYPE_CONTENT_TABLE.type, "MCQ"))
    )).limit(50);
    return NextResponse.json({ assessments }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Trusted assessment catalog failed:", error);
    return NextResponse.json({ error: "Unable to load assessments" }, { status: 500 });
  }
}
