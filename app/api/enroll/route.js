import { db } from "@/configs/db";
import { STUDY_MATERIAL_TABLE, USER_TABLE } from "@/configs/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { emailService } from "@/lib/emailService";

// POST: Enroll user in a course
export async function POST(req) {
  try {
    const { courseId, userEmail } = await req.json();

    if (!courseId || !userEmail) {
      return NextResponse.json(
        { error: 'courseId and userEmail are required' },
        { status: 400 }
      );
    }

    // Get course
    const course = await db
      .select()
      .from(STUDY_MATERIAL_TABLE)
      .where(eq(STUDY_MATERIAL_TABLE.courseId, courseId));

    if (!course || course.length === 0) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const currentCourse = course[0];

    // Check if already enrolled
    const enrolledUsers = currentCourse.enrolledUsers || [];
    if (enrolledUsers.includes(userEmail)) {
      return NextResponse.json({ message: 'Already enrolled', alreadyEnrolled: true });
    }

    // Add user to enrolled users
    const updatedEnrolledUsers = [...enrolledUsers, userEmail];

    await db
      .update(STUDY_MATERIAL_TABLE)
      .set({ enrolledUsers: updatedEnrolledUsers })
      .where(eq(STUDY_MATERIAL_TABLE.courseId, courseId));

    // Get user details for email
    try {
      const user = await db
        .select()
        .from(USER_TABLE)
        .where(eq(USER_TABLE.email, userEmail))
        .limit(1);

      if (user && user.length > 0) {
        // Send enrollment confirmation email
        await emailService.sendCourseEnrollmentEmail(
          userEmail,
          user[0].name || 'Student',
          currentCourse.courseName,
          currentCourse.instructorName || 'Instructor'
        );
      }
    } catch (emailError) {
      console.error('Enrollment email failed (non-fatal):', emailError?.message);
      // Don't fail the enrollment if email fails
    }

    return NextResponse.json({
      message: 'Successfully enrolled',
      enrolled: true
    });
  } catch (error) {
    console.error('Error enrolling user:', error);
    return NextResponse.json({ error: 'Failed to enroll' }, { status: 500 });
  }
}

// GET: Check if user is enrolled
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId');
    const userEmail = searchParams.get('userEmail');

    if (!courseId || !userEmail) {
      return NextResponse.json(
        { error: 'courseId and userEmail are required' },
        { status: 400 }
      );
    }

    const course = await db
      .select()
      .from(STUDY_MATERIAL_TABLE)
      .where(eq(STUDY_MATERIAL_TABLE.courseId, courseId));

    if (!course || course.length === 0) {
      return NextResponse.json({ enrolled: false });
    }

    const enrolledUsers = course[0].enrolledUsers || [];
    const isEnrolled = enrolledUsers.includes(userEmail);

    return NextResponse.json({ enrolled: isEnrolled });
  } catch (error) {
    console.error('Error checking enrollment:', error);
    return NextResponse.json({ error: 'Failed to check enrollment' }, { status: 500 });
  }
}
