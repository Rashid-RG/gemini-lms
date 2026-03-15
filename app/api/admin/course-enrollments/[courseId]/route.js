import { NextResponse } from "next/server";
import { db } from "@/configs/db";
import { COURSE_ENROLLMENT_TABLE } from "@/configs/schema";
import { eq } from "drizzle-orm";
import { verifyAdminSession } from "@/lib/adminAuth";
import { cookies } from "next/headers";

export async function GET(req, { params }) {
  try {
    const { courseId } = params;

    // Verify session
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_session')?.value;
    
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await verifyAdminSession(token);
    if (!session.valid || session.admin.role !== 'tutor') {
      return NextResponse.json(
        { error: "Only tutors can view enrollments" },
        { status: 403 }
      );
    }

    // Get enrollments for course
    const enrollments = await db.select()
      .from(COURSE_ENROLLMENT_TABLE)
      .where(eq(COURSE_ENROLLMENT_TABLE.courseId, courseId));

    return NextResponse.json({
      enrollments: enrollments || []
    });

  } catch (error) {
    console.error("Error fetching course enrollments:", error);
    return NextResponse.json(
      { error: "Failed to fetch enrollments" },
      { status: 500 }
    );
  }
}
