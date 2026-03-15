import { NextResponse } from "next/server";
import { db } from "@/configs/db";
import { COURSE_ANALYTICS_TABLE } from "@/configs/schema";
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
        { error: "Only tutors can view analytics" },
        { status: 403 }
      );
    }

    // Get analytics for course
    const analytics = await db.select()
      .from(COURSE_ANALYTICS_TABLE)
      .where(eq(COURSE_ANALYTICS_TABLE.courseId, courseId));

    if (analytics.length === 0) {
      return NextResponse.json({
        analytics: {
          courseId,
          totalEnrollments: 0,
          totalCompleted: 0,
          totalDropped: 0,
          averageCompletionTime: 0,
          averageScore: 0,
          totalRevenue: 0
        }
      });
    }

    return NextResponse.json({
      analytics: analytics[0]
    });

  } catch (error) {
    console.error("Error fetching course analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
