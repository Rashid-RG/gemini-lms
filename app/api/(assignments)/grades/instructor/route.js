/**
 * API endpoint: Get all students' grades for a specific course (Instructor view)
 * Only course creator/instructor can access
 */
import { db } from "@/configs/db";
import { STUDENT_PROGRESS_TABLE, STUDY_MATERIAL_TABLE, ASSIGNMENT_SUBMISSIONS_TABLE } from "@/configs/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";

function dedupeProgressRows(progressRows) {
  const byEmail = new Map();

  for (const row of progressRows) {
    const normalizedEmail = String(row.studentEmail || '').trim().toLowerCase();
    if (!normalizedEmail) continue;

    const existing = byEmail.get(normalizedEmail);
    if (!existing) {
      byEmail.set(normalizedEmail, row);
      continue;
    }

    const existingActivity = existing.lastActivityAt ? new Date(existing.lastActivityAt).getTime() : 0;
    const currentActivity = row.lastActivityAt ? new Date(row.lastActivityAt).getTime() : 0;
    const existingProgress = Number(existing.progressPercentage || 0);
    const currentProgress = Number(row.progressPercentage || 0);

    if (currentActivity > existingActivity || (currentActivity === existingActivity && currentProgress >= existingProgress)) {
      byEmail.set(normalizedEmail, row);
    }
  }

  return Array.from(byEmail.values());
}

export async function GET(req) {
  try {
    const { userId, sessionClaims } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get courseId from query
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId");

    if (!courseId) {
      return NextResponse.json({ error: "courseId required" }, { status: 400 });
    }

    // Get user email
    const clerkUser = await currentUser();
    const instructorEmail = (
      sessionClaims?.email ||
      sessionClaims?.primaryEmailAddress?.emailAddress ||
      clerkUser?.primaryEmailAddress?.emailAddress ||
      clerkUser?.emailAddresses?.[0]?.emailAddress
    )?.toLowerCase();
    if (!instructorEmail) {
      return NextResponse.json({ error: "User email not found" }, { status: 400 });
    }

    // Verify course ownership/instructor access
    const course = await db
      .select()
      .from(STUDY_MATERIAL_TABLE)
      .where(eq(STUDY_MATERIAL_TABLE.courseId, courseId))
      .limit(1);

    if (!course || course.length === 0) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Check if user is instructor (course creator)
    if ((course[0].createdBy || "").toLowerCase() !== instructorEmail) {
      return NextResponse.json(
        { error: "Only course instructor can view grades" },
        { status: 403 }
      );
    }

    // Fetch all student progress for this course
    const studentProgress = await db
      .select()
      .from(STUDENT_PROGRESS_TABLE)
      .where(eq(STUDENT_PROGRESS_TABLE.courseId, courseId));

    const dedupedStudentProgress = dedupeProgressRows(studentProgress);

    // Enrich with submission details
    const studentGrades = await Promise.all(
      dedupedStudentProgress.map(async (progress) => {
        const submissions = await db
          .select()
          .from(ASSIGNMENT_SUBMISSIONS_TABLE)
          .where(
            and(
              eq(ASSIGNMENT_SUBMISSIONS_TABLE.studentEmail, progress.studentEmail),
              eq(ASSIGNMENT_SUBMISSIONS_TABLE.courseId, courseId)
            )
          );

        // Parse scores
        const quizScoresObj = typeof progress.quizScores === 'string' 
          ? JSON.parse(progress.quizScores || '{}') 
          : (progress.quizScores || {});
        const assignmentScoresObj = typeof progress.assignmentScores === 'string' 
          ? JSON.parse(progress.assignmentScores || '{}') 
          : (progress.assignmentScores || {});
        const mcqScoresObj = typeof progress.mcqScores === 'string' 
          ? JSON.parse(progress.mcqScores || '{}') 
          : (progress.mcqScores || {});

        // Calculate averages
        const quizScoresArray = Object.values(quizScoresObj).filter(v => typeof v === 'number');
        const quizAverage = quizScoresArray.length > 0
          ? Math.round(quizScoresArray.reduce((a, b) => a + b, 0) / quizScoresArray.length)
          : 0;

        const assignmentScoresArray = Object.values(assignmentScoresObj).filter(v => typeof v === 'number');
        const assignmentAverage = assignmentScoresArray.length > 0
          ? Math.round(assignmentScoresArray.reduce((a, b) => a + b, 0) / assignmentScoresArray.length)
          : 0;

        const mcqScoresArray = Object.values(mcqScoresObj).filter(v => typeof v === 'number');
        const mcqAverage = mcqScoresArray.length > 0
          ? Math.round(mcqScoresArray.reduce((a, b) => a + b, 0) / mcqScoresArray.length)
          : 0;

        // Weighted grade
        const weightedGrade = Math.round(
          (quizAverage * 0.30) + (assignmentAverage * 0.40) + (mcqAverage * 0.30)
        );

        // Count submissions
        const submittedCount = submissions.filter(s => s.status !== 'Submitted').length;

        return {
          studentEmail: progress.studentEmail,
          progressPercentage: progress.progressPercentage,
          status: progress.status,
          quizAverage,
          quizCount: quizScoresArray.length,
          assignmentAverage,
          assignmentCount: assignmentScoresArray.length,
          assignmentSubmitted: submittedCount,
          mcqAverage,
          mcqCount: mcqScoresArray.length,
          finalGrade: weightedGrade,
          startedAt: progress.startedAt,
          completedAt: progress.completedAt,
          lastActivityAt: progress.lastActivityAt,
        };
      })
    );

    // Sort by final grade (highest first)
    studentGrades.sort((a, b) => b.finalGrade - a.finalGrade);

    // Calculate class statistics
    const grades = studentGrades.map(g => g.finalGrade).filter(g => g > 0);
    const classStats = {
      totalStudents: studentGrades.length,
      completedStudents: studentGrades.filter(g => g.status === "Completed").length,
      inProgressStudents: studentGrades.filter(g => g.status === "In Progress").length,
      classAverage: grades.length > 0 ? Math.round(grades.reduce((a, b) => a + b, 0) / grades.length) : 0,
      highestGrade: Math.max(...grades, 0),
      lowestGrade: Math.min(...grades.filter(g => g > 0), 0),
      medianGrade: grades.length > 0 ? grades.sort((a, b) => a - b)[Math.floor(grades.length / 2)] : 0,
    };

    return NextResponse.json({
      result: {
        course: {
          courseId: course[0].courseId,
          courseName: course[0].topic,
          courseType: course[0].courseType,
          createdAt: course[0].createdAt,
        },
        students: studentGrades,
        statistics: classStats,
      },
    });
  } catch (error) {
    console.error("Error fetching class grades:", error);
    return NextResponse.json(
      { error: "Failed to fetch grades", details: error.message },
      { status: 500 }
    );
  }
}
