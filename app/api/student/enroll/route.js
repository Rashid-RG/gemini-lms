import { NextResponse } from "next/server";
import { db } from "@/configs/db";
import { COURSE_ENROLLMENT_TABLE, STUDY_MATERIAL_TABLE, USER_TABLE } from "@/configs/schema";
import { eq, and } from "drizzle-orm";
import { auth, currentUser } from "@clerk/nextjs/server";
import { evaluateStudentProfileCompleteness } from "@/lib/studentProfile";

/**
 * POST /api/student/enroll
 * Student enrolls in a course
 */
export async function POST(req) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { courseId } = await req.json();
    if (!courseId) {
      return NextResponse.json({ error: "courseId is required" }, { status: 400 });
    }

    // Get user email from Clerk
    const clerkUser = await currentUser();
    const userEmail = (
      clerkUser?.primaryEmailAddress?.emailAddress ||
      clerkUser?.emailAddresses?.[0]?.emailAddress
    )?.toLowerCase();
    
    if (!userEmail) {
      return NextResponse.json({ error: "User email not found" }, { status: 400 });
    }

    const profile = await db.select().from(USER_TABLE)
      .where(eq(USER_TABLE.email, userEmail))
      .limit(1);

    const completeness = evaluateStudentProfileCompleteness(profile[0] || {});
    if (!completeness.isComplete) {
      return NextResponse.json(
        {
          error: "Complete your student profile before enrolling.",
          code: "PROFILE_INCOMPLETE",
          missingFields: completeness.missingLabels,
        },
        { status: 400 }
      );
    }

    // Check if course exists
    const course = await db.select().from(STUDY_MATERIAL_TABLE)
      .where(eq(STUDY_MATERIAL_TABLE.courseId, courseId));

    if (course.length === 0) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Check enrollment limit
    if (course[0].enrollmentLimit) {
      const enrollmentCount = await db.select().from(COURSE_ENROLLMENT_TABLE)
        .where(and(
          eq(COURSE_ENROLLMENT_TABLE.courseId, courseId),
          eq(COURSE_ENROLLMENT_TABLE.status, 'Active')
        ));

      if (enrollmentCount.length >= course[0].enrollmentLimit) {
        return NextResponse.json(
          { error: "Course enrollment is full" },
          { status: 400 }
        );
      }
    }

    // Check if already enrolled
    const existing = await db.select().from(COURSE_ENROLLMENT_TABLE)
      .where(and(
        eq(COURSE_ENROLLMENT_TABLE.courseId, courseId),
        eq(COURSE_ENROLLMENT_TABLE.studentEmail, userEmail)
      ));

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Already enrolled in this course" },
        { status: 400 }
      );
    }

    // Create enrollment
    const enrollment = await db.insert(COURSE_ENROLLMENT_TABLE).values({
      courseId,
      studentEmail: userEmail,
      enrolledAt: new Date(),
      status: 'Active',
      completionPercentage: 0,
      totalTimeSpent: 0
    }).returning();

    return NextResponse.json({
      success: true,
      enrollment: enrollment[0],
      message: "Successfully enrolled in course"
    });

  } catch (error) {
    console.error("Error enrolling in course:", error);
    return NextResponse.json(
      { error: "Failed to enroll in course" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/student/enrollments
 * Get all student enrollments
 */
export async function GET(req) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clerkUser = await currentUser();
    const userEmail = (
      clerkUser?.primaryEmailAddress?.emailAddress ||
      clerkUser?.emailAddresses?.[0]?.emailAddress
    )?.toLowerCase();

    if (!userEmail) {
      return NextResponse.json({ error: "User email not found" }, { status: 400 });
    }

    // Get all enrollments for student
    const enrollments = await db.select().from(COURSE_ENROLLMENT_TABLE)
      .where(eq(COURSE_ENROLLMENT_TABLE.studentEmail, userEmail));

    return NextResponse.json({
      enrollments: enrollments || []
    });

  } catch (error) {
    console.error("Error fetching enrollments:", error);
    return NextResponse.json(
      { error: "Failed to fetch enrollments" },
      { status: 500 }
    );
  }
}
