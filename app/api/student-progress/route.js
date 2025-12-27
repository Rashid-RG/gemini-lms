import { db } from "@/configs/db";
import { STUDENT_PROGRESS_TABLE, STUDY_MATERIAL_TABLE, USER_STREAK_TABLE } from "@/configs/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

/**
 * GET /api/student-progress?courseId=xyz&studentEmail=abc@example.com
 * Retrieves student's progress in a course
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId");
    const studentEmail = searchParams.get("studentEmail");

    if (!courseId || !studentEmail) {
      return NextResponse.json(
        { error: "Missing courseId or studentEmail" },
        { status: 400 }
      );
    }

    // Get or create progress record
    let progress = await db
      .select()
      .from(STUDENT_PROGRESS_TABLE)
      .where(
        and(
          eq(STUDENT_PROGRESS_TABLE.courseId, courseId),
          eq(STUDENT_PROGRESS_TABLE.studentEmail, studentEmail)
        )
      );

    if (progress.length === 0) {
      // Create new progress record
      const course = await db
        .select()
        .from(STUDY_MATERIAL_TABLE)
        .where(eq(STUDY_MATERIAL_TABLE.courseId, courseId));

      const totalChapters = course[0]?.courseLayout?.chapters?.length || 0;

      const newProgress = await db
        .insert(STUDENT_PROGRESS_TABLE)
        .values({
          courseId,
          studentEmail,
          totalChapters,
          completedChapters: JSON.stringify([]),
          quizScores: JSON.stringify({}),
          assignmentScores: JSON.stringify({}),
          mcqScores: JSON.stringify({}),
        })
        .returning();

      progress = newProgress;
    }

    return NextResponse.json({ result: progress[0] });
  } catch (err) {
    console.error("Progress API Error:", err);
    return NextResponse.json(
      { error: "Failed to get progress" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/student-progress
 * Create or update student progress
 * Also updates global user streak across all courses
 */
export async function POST(req) {
  try {
    const { courseId, studentEmail, completedChapters, quizScores, assignmentScores, mcqScores, progressPercentage, activityType, completedNotes, totalNotes, completedFlashcards, totalFlashcards } = await req.json();

    if (!courseId || !studentEmail) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Update or create progress
    const existing = await db
      .select()
      .from(STUDENT_PROGRESS_TABLE)
      .where(
        and(
          eq(STUDENT_PROGRESS_TABLE.courseId, courseId),
          eq(STUDENT_PROGRESS_TABLE.studentEmail, studentEmail)
        )
      );

    let result;
    if (existing.length > 0) {
      const prev = existing[0];
      const now = new Date();
      const prevStreakDate = prev.lastStreakAt || prev.lastActivityAt;
      let streakCount = prev.streakCount || 0;
      let longestStreak = prev.longestStreak || 0;

      if (prevStreakDate) {
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfPrev = new Date(prevStreakDate.getFullYear(), prevStreakDate.getMonth(), prevStreakDate.getDate());
        const diffDays = Math.floor((startOfToday - startOfPrev) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
          // same day, keep current streak (if it's their first activity ever, set to 1)
          streakCount = streakCount || 1;
        } else if (diffDays === 1) {
          // consecutive day, increment streak
          streakCount = (streakCount || 1) + 1;
        } else {
          // missed days, reset streak to 1
          streakCount = 1;
        }
      } else {
        // first activity ever
        streakCount = 1;
      }

      longestStreak = Math.max(longestStreak, streakCount);

      const newBadges = new Set(Array.isArray(prev.badges) ? prev.badges : []);
      [3, 7, 14, 30].forEach((threshold) => {
        if (streakCount >= threshold) newBadges.add(`streak-${threshold}`);
      });

      // Calculate final score (average of quiz and assignment scores)
      const quizArray = Object.values(quizScores || {});
      const assignmentArray = Object.values(assignmentScores || {});
      const allScores = [...quizArray, ...assignmentArray];
      const finalScore = allScores.length > 0 
        ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
        : 0;

      result = await db
        .update(STUDENT_PROGRESS_TABLE)
        .set({
          completedChapters: JSON.stringify(completedChapters || []),
          quizScores: JSON.stringify(quizScores || {}),
          assignmentScores: JSON.stringify(assignmentScores || {}),
          mcqScores: JSON.stringify(mcqScores || {}),
          progressPercentage: progressPercentage || 0,
          finalScore,
          streakCount,
          longestStreak,
          lastStreakAt: now,
          badges: JSON.stringify(Array.from(newBadges)),
          lastActivityAt: now,
          // Notes and Flashcards tracking
          ...(completedNotes !== undefined && { completedNotes }),
          ...(totalNotes !== undefined && { totalNotes }),
          ...(completedFlashcards !== undefined && { completedFlashcards }),
          ...(totalFlashcards !== undefined && { totalFlashcards }),
        })
        .where(
          and(
            eq(STUDENT_PROGRESS_TABLE.courseId, courseId),
            eq(STUDENT_PROGRESS_TABLE.studentEmail, studentEmail)
          )
        )
        .returning();
    } else {
      result = await db
        .insert(STUDENT_PROGRESS_TABLE)
        .values({
          courseId,
          studentEmail,
          completedChapters: JSON.stringify(completedChapters || []),
          quizScores: JSON.stringify(quizScores || {}),
          assignmentScores: JSON.stringify(assignmentScores || {}),
          mcqScores: JSON.stringify(mcqScores || {}),
          progressPercentage: progressPercentage || 0,
          finalScore: 0,
          totalChapters: 0,
          streakCount: 1,
          longestStreak: 1,
          lastStreakAt: new Date(),
          badges: JSON.stringify([]),
          // Notes and Flashcards tracking
          completedNotes: completedNotes || 0,
          totalNotes: totalNotes || 0,
          completedFlashcards: completedFlashcards || 0,
          totalFlashcards: totalFlashcards || 0,
        })
        .returning();
    }

    // 🔥 Update global user streak across all courses
    try {
      const existingStreak = await db
        .select()
        .from(USER_STREAK_TABLE)
        .where(eq(USER_STREAK_TABLE.studentEmail, studentEmail));

      const now = new Date();
      
      if (existingStreak.length > 0) {
        const prev = existingStreak[0];
        const prevStreakDate = prev.lastStreakAt || prev.lastActivityAt;
        let streakCount = prev.streakCount || 0;
        let longestStreak = prev.longestStreak || 0;
        let totalActivities = (prev.totalActivities || 0) + 1;

        if (prevStreakDate) {
          const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const startOfPrev = new Date(prevStreakDate.getFullYear(), prevStreakDate.getMonth(), prevStreakDate.getDate());
          const diffDays = Math.floor((startOfToday - startOfPrev) / (1000 * 60 * 60 * 24));

          if (diffDays === 0) {
            streakCount = streakCount || 1;
          } else if (diffDays === 1) {
            streakCount = (streakCount || 1) + 1;
          } else {
            streakCount = 1;
          }
        } else {
          streakCount = 1;
        }

        longestStreak = Math.max(longestStreak, streakCount);

        const newBadges = new Set(Array.isArray(prev.badges) ? prev.badges : JSON.parse(prev.badges || '[]'));
        [3, 7, 14, 30, 60, 100].forEach((threshold) => {
          if (streakCount >= threshold) newBadges.add(`streak-${threshold}`);
        });
        [10, 50, 100, 250, 500].forEach((threshold) => {
          if (totalActivities >= threshold) newBadges.add(`activities-${threshold}`);
        });

        await db
          .update(USER_STREAK_TABLE)
          .set({
            streakCount,
            longestStreak,
            lastStreakAt: now,
            lastActivityAt: now,
            badges: JSON.stringify(Array.from(newBadges)),
            totalActivities,
            updatedAt: now,
          })
          .where(eq(USER_STREAK_TABLE.studentEmail, studentEmail));

        console.log(`✅ Global streak updated: ${streakCount} days (Activity: ${activityType || 'course-activity'})`);
      } else {
        await db
          .insert(USER_STREAK_TABLE)
          .values({
            studentEmail,
            streakCount: 1,
            longestStreak: 1,
            lastStreakAt: now,
            lastActivityAt: now,
            badges: JSON.stringify([]),
            totalActivities: 1,
          });

        console.log(`✨ New streak started: 1 day (Activity: ${activityType || 'course-activity'})`);
      }
    } catch (streakError) {
      console.error("Streak update failed (non-critical):", streakError);
      // Don't fail the main request if streak update fails
    }

    return NextResponse.json({ result: result[0] });
  } catch (err) {
    console.error("Progress Update Error:", err);
    return NextResponse.json(
      { error: "Failed to update progress" },
      { status: 500 }
    );
  }
}
