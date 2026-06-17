import { db } from "@/configs/db";
import { ASSIGNMENT_SUBMISSIONS_TABLE, STUDY_MATERIAL_TABLE, STUDENT_PROGRESS_TABLE, COURSE_ASSIGNMENTS_TABLE } from "@/configs/schema";
import { eq, and } from "drizzle-orm";
import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * GET /api/grades/assignment-breakdown?courseId=xxx
 * Get detailed assignment scores for a student in a course
 */
export async function GET(req) {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clerkUser = await currentUser();
    const requesterEmail = (
      sessionClaims?.email ||
      sessionClaims?.primaryEmailAddress?.emailAddress ||
      clerkUser?.primaryEmailAddress?.emailAddress ||
      clerkUser?.emailAddresses?.[0]?.emailAddress
    )?.toLowerCase();

    if (!requesterEmail) {
      return NextResponse.json({ error: "User email not found" }, { status: 400 });
    }

    const url = new URL(req.url);
    const courseId = url.searchParams.get("courseId");
    const requestedStudentEmail = url.searchParams.get("studentEmail")?.toLowerCase();
    const studentEmail = requestedStudentEmail || requesterEmail;

    if (!courseId) {
      return NextResponse.json(
        { error: "courseId is required" },
        { status: 400 }
      );
    }

    // Get course details
    const course = await db
      .select()
      .from(STUDY_MATERIAL_TABLE)
      .where(eq(STUDY_MATERIAL_TABLE.courseId, courseId));

    if (!course.length) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Get all assignments for the course
    const assignments = await db
      .select()
      .from(COURSE_ASSIGNMENTS_TABLE)
      .where(eq(COURSE_ASSIGNMENTS_TABLE.courseId, courseId));

    if (requestedStudentEmail && requestedStudentEmail !== requesterEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get submissions for the logged-in student only
    const whereConditions = [eq(ASSIGNMENT_SUBMISSIONS_TABLE.courseId, courseId)];
    whereConditions.push(
      eq(ASSIGNMENT_SUBMISSIONS_TABLE.studentEmail, studentEmail)
    );

    const submissions = await db
      .select()
      .from(ASSIGNMENT_SUBMISSIONS_TABLE)
      .where(and(...whereConditions));

    // Format response
    const assignmentBreakdown = assignments.map((assignment) => {
      const studentSubmission = submissions.find(
        (sub) => sub.assignmentId === assignment.assignmentId
      );

      return {
        assignmentId: assignment.assignmentId,
        title: assignment.title,
        description: assignment.description,
        totalPoints: assignment.totalPoints,
        dueDate: assignment.dueDate,
        rubric: assignment.rubric,
        submitted: !!studentSubmission,
        submissionDetails: studentSubmission ? {
          studentEmail: studentSubmission.studentEmail,
          score: studentSubmission.score,
          maxScore: assignment.totalPoints,
          percentage: studentSubmission.score
            ? Math.round((studentSubmission.score / assignment.totalPoints) * 100)
            : 0,
          status: studentSubmission.status,
          submittedAt: studentSubmission.submittedAt,
          gradedAt: studentSubmission.gradedAt,
          feedback: studentSubmission.feedback,
          gradedBy: studentSubmission.gradedBy,
          isLate: studentSubmission.submittedAt > assignment.dueDate,
          lateBy: studentSubmission.submittedAt > assignment.dueDate ?
            Math.round((studentSubmission.submittedAt - assignment.dueDate) / (1000 * 60 * 60)) + " hours" :
            null,
          strengths: studentSubmission.strengths,
          improvements: studentSubmission.improvements,
        } : null,
      };
    });

    // Calculate statistics
    const submittedCount = assignmentBreakdown.filter((a) => a.submitted).length;
    const totalPoints = assignmentBreakdown.reduce((sum, a) => sum + a.totalPoints, 0);
    const earnedPoints = assignmentBreakdown.reduce(
      (sum, a) => sum + (a.submissionDetails?.score || 0),
      0
    );
    const overallPercentage = totalPoints > 0
      ? Math.round((earnedPoints / totalPoints) * 100)
      : 0;

    return NextResponse.json({
      courseId,
      courseName: course[0].topic,
      assignments: assignmentBreakdown,
      statistics: {
        totalAssignments: assignments.length,
        submittedAssignments: submittedCount,
        totalPoints,
        earnedPoints,
        overallPercentage,
      },
    });
  } catch (error) {
    console.error("Error fetching assignment breakdown:", error);
    return NextResponse.json(
      {
        result: {
          assignments: [],
          statistics: {
            totalAssignments: 0,
            submittedAssignments: 0,
            totalPoints: 0,
            earnedPoints: 0,
            overallPercentage: 0,
          },
        },
      },
      { status: 500 }
    );
  }
}
