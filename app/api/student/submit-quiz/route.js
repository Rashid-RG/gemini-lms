import { NextResponse } from "next/server";
import { db } from "@/configs/db";
import {
  STUDY_TYPE_CONTENT_TABLE,
  COURSE_ENROLLMENT_TABLE,
  STUDENT_PROGRESS_TABLE
} from "@/configs/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { gradeQuiz, calculateProgress } from "@/lib/gradingEngine";

/**
 * POST /api/student/submit-quiz
 * Student submits quiz answers
 */
export async function POST(req) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clerkUser = await auth();
    const studentEmail = clerkUser?.user?.emailAddresses?.[0]?.emailAddress;

    if (!studentEmail) {
      return NextResponse.json({ error: "Student email not found" }, { status: 400 });
    }

    const { courseId, chapterId, questions, answers, timeSpentSeconds } = await req.json();

    if (!courseId || !questions || !answers) {
      return NextResponse.json(
        { error: "Missing required fields: courseId, questions, answers" },
        { status: 400 }
      );
    }

    // Verify student is enrolled
    const enrollment = await db.select().from(COURSE_ENROLLMENT_TABLE)
      .where(and(
        eq(COURSE_ENROLLMENT_TABLE.courseId, courseId),
        eq(COURSE_ENROLLMENT_TABLE.studentEmail, studentEmail)
      ));

    if (enrollment.length === 0) {
      return NextResponse.json(
        { error: "Not enrolled in this course" },
        { status: 403 }
      );
    }

    // Grade the quiz
    const gradeResult = gradeQuiz(questions, answers);

    // Update student progress
    const courseProgress = await db.select().from(STUDENT_PROGRESS_TABLE)
      .where(and(
        eq(STUDENT_PROGRESS_TABLE.courseId, courseId),
        eq(STUDENT_PROGRESS_TABLE.studentEmail, studentEmail)
      ));

    const currentProgress = courseProgress.length > 0 ? courseProgress[0] : null;
    const newTimeSpent = (currentProgress?.totalTimeSpent || 0) + Math.round(timeSpentSeconds / 60);

    // Update or create progress record
    if (currentProgress) {
      const updatedMcqScores = { ...currentProgress.mcqScores, [chapterId]: gradeResult.averageScore };
      
      await db.update(STUDENT_PROGRESS_TABLE)
        .set({
          mcqScores: updatedMcqScores,
          totalTimeSpent: newTimeSpent,
          lastActivityAt: new Date(),
          finalScore: Math.round(
            Object.values(updatedMcqScores).reduce((a, b) => a + b, 0) / Object.keys(updatedMcqScores).length
          )
        })
        .where(and(
          eq(STUDENT_PROGRESS_TABLE.courseId, courseId),
          eq(STUDENT_PROGRESS_TABLE.studentEmail, studentEmail)
        ));
    } else {
      await db.insert(STUDENT_PROGRESS_TABLE).values({
        courseId,
        studentEmail,
        mcqScores: { [chapterId]: gradeResult.averageScore },
        totalTimeSpent: newTimeSpent,
        completedChapters: chapterId ? [chapterId] : [],
        totalChapters: 0,
        finalScore: gradeResult.averageScore,
        lastActivityAt: new Date()
      });
    }

    // Update enrollment with new scores
    await db.update(COURSE_ENROLLMENT_TABLE)
      .set({
        performanceScore: gradeResult.averageScore,
        totalTimeSpent: newTimeSpent,
        lastAccessedAt: new Date()
      })
      .where(and(
        eq(COURSE_ENROLLMENT_TABLE.courseId, courseId),
        eq(COURSE_ENROLLMENT_TABLE.studentEmail, studentEmail)
      ));

    return NextResponse.json({
      success: true,
      gradeResult: {
        averageScore: gradeResult.averageScore,
        totalScore: gradeResult.totalScore,
        totalPoints: gradeResult.totalPoints,
        isPassed: gradeResult.isPassed,
        feedback: gradeResult.feedback,
        pendingReview: gradeResult.pendingReview
      },
      results: gradeResult.results,
      message: gradeResult.feedback
    });

  } catch (error) {
    console.error("Error submitting quiz:", error);
    return NextResponse.json(
      { error: "Failed to submit quiz: " + error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/student/quiz-result/[courseId]
 * Get student's latest quiz result
 */
export async function GET(req, { params }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clerkUser = await auth();
    const studentEmail = clerkUser?.user?.emailAddresses?.[0]?.emailAddress;
    const { courseId } = params;

    if (!courseId) {
      return NextResponse.json({ error: "courseId is required" }, { status: 400 });
    }

    // Get student progress
    const progress = await db.select().from(STUDENT_PROGRESS_TABLE)
      .where(and(
        eq(STUDENT_PROGRESS_TABLE.courseId, courseId),
        eq(STUDENT_PROGRESS_TABLE.studentEmail, studentEmail)
      ));

    if (progress.length === 0) {
      return NextResponse.json(
        { message: "No quiz attempts yet" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      progress: progress[0],
      finalScore: progress[0].finalScore,
      totalTimeSpent: progress[0].totalTimeSpent,
      completedChapters: progress[0].completedChapters
    });

  } catch (error) {
    console.error("Error fetching quiz result:", error);
    return NextResponse.json(
      { error: "Failed to fetch result" },
      { status: 500 }
    );
  }
}
