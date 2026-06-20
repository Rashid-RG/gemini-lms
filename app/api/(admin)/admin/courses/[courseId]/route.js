import { NextResponse } from "next/server";
import { db } from "@/configs/db";
import { STUDY_MATERIAL_TABLE } from "@/configs/schema";
import { eq } from "drizzle-orm";
import { requireAdminOrAbove } from "@/lib/adminApiAuth";

export async function GET(req, { params }) {
  const authResult = await requireAdminOrAbove();
  if (!authResult.authenticated) return authResult.error;

  try {
    const { courseId } = params;

    // Get course details
    const course = await db.select()
      .from(STUDY_MATERIAL_TABLE)
      .where(eq(STUDY_MATERIAL_TABLE.courseId, courseId));

    if (course.length === 0) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      course: course[0]
    });

  } catch (error) {
    console.error("Error fetching course:", error);
    return NextResponse.json(
      { error: "Failed to fetch course" },
      { status: 500 }
    );
  }
}
