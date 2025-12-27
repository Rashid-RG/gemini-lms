import { db } from "@/configs/db";
import { USER_STREAK_TABLE } from "@/configs/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { withDbRetry } from "@/lib/dbUtils";

export const maxDuration = 15;

/**
 * GET /api/user-streak?studentEmail=abc@example.com
 * Retrieves user's global streak across all courses
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const studentEmail = searchParams.get("studentEmail");

    if (!studentEmail) {
      return NextResponse.json(
        { error: "Missing studentEmail" },
        { status: 400 }
      );
    }

    // Get or create streak record with retry
    let streak = await withDbRetry(async () => {
      return db
        .select()
        .from(USER_STREAK_TABLE)
        .where(eq(USER_STREAK_TABLE.studentEmail, studentEmail));
    }, { maxRetries: 2, delayMs: 300 });

    if (streak.length === 0) {
      // Create new streak record - use upsert pattern to handle race conditions
      try {
        const newStreak = await withDbRetry(async () => {
          return db
            .insert(USER_STREAK_TABLE)
            .values({
              studentEmail,
              streakCount: 0,
              longestStreak: 0,
              badges: JSON.stringify([]),
              totalActivities: 0,
            })
            .onConflictDoNothing({ target: USER_STREAK_TABLE.studentEmail })
            .returning();
        });

        // If insert succeeded, use the new record
        if (newStreak && newStreak.length > 0) {
          streak = newStreak;
        } else {
          // Another request created it - fetch the existing record
          streak = await withDbRetry(async () => {
            return db
              .select()
              .from(USER_STREAK_TABLE)
              .where(eq(USER_STREAK_TABLE.studentEmail, studentEmail));
          }, { maxRetries: 2, delayMs: 100 });
        }
      } catch (insertErr) {
        // If duplicate key error, just fetch the existing record
        if (insertErr?.code === '23505') {
          streak = await withDbRetry(async () => {
            return db
              .select()
              .from(USER_STREAK_TABLE)
              .where(eq(USER_STREAK_TABLE.studentEmail, studentEmail));
          }, { maxRetries: 2, delayMs: 100 });
        } else {
          throw insertErr;
        }
      }
    }

    return NextResponse.json(
      { result: streak[0] },
      {
        headers: {
          'Cache-Control': 'private, max-age=60, stale-while-revalidate=120'
        }
      }
    );
  } catch (err) {
    console.error("User Streak GET Error:", err);
    return NextResponse.json(
      { error: "Failed to get user streak" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user-streak
 * Update user's global streak on any learning activity
 * Called whenever user completes: chapter, quiz, assignment, or any course content
 */
export async function POST(req) {
  try {
    const { studentEmail, activityType } = await req.json();

    if (!studentEmail) {
      return NextResponse.json(
        { error: "Missing studentEmail" },
        { status: 400 }
      );
    }

    // Get existing streak
    const existing = await db
      .select()
      .from(USER_STREAK_TABLE)
      .where(eq(USER_STREAK_TABLE.studentEmail, studentEmail));

    let result;
    const now = new Date();

    if (existing.length > 0) {
      const prev = existing[0];
      const prevStreakDate = prev.lastStreakAt || prev.lastActivityAt;
      let streakCount = prev.streakCount || 0;
      let longestStreak = prev.longestStreak || 0;
      let totalActivities = (prev.totalActivities || 0) + 1;

      // Calculate streak based on last activity date
      if (prevStreakDate) {
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfPrev = new Date(prevStreakDate.getFullYear(), prevStreakDate.getMonth(), prevStreakDate.getDate());
        const diffDays = Math.floor((startOfToday - startOfPrev) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
          // Same day activity - maintain streak (initialize to 1 if first activity)
          streakCount = streakCount || 1;
        } else if (diffDays === 1) {
          // Consecutive day - increment streak
          streakCount = (streakCount || 1) + 1;
        } else {
          // Missed days - reset streak to 1
          streakCount = 1;
        }
      } else {
        // First activity ever
        streakCount = 1;
      }

      // Update longest streak
      longestStreak = Math.max(longestStreak, streakCount);

      // Award badges based on streak milestones
      const newBadges = new Set(Array.isArray(prev.badges) ? prev.badges : JSON.parse(prev.badges || '[]'));
      [3, 7, 14, 30, 60, 100].forEach((threshold) => {
        if (streakCount >= threshold) newBadges.add(`streak-${threshold}`);
      });

      // Award activity count badges
      [10, 50, 100, 250, 500].forEach((threshold) => {
        if (totalActivities >= threshold) newBadges.add(`activities-${threshold}`);
      });

      // Update streak record
      result = await db
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
        .where(eq(USER_STREAK_TABLE.studentEmail, studentEmail))
        .returning();

      console.log(`✅ Streak updated for ${studentEmail}: ${streakCount} days (Activity: ${activityType || 'unknown'})`);
    } else {
      // Create new streak record (first activity ever)
      result = await db
        .insert(USER_STREAK_TABLE)
        .values({
          studentEmail,
          streakCount: 1,
          longestStreak: 1,
          lastStreakAt: now,
          lastActivityAt: now,
          badges: JSON.stringify([]),
          totalActivities: 1,
        })
        .returning();

      console.log(`✨ New streak started for ${studentEmail} (Activity: ${activityType || 'unknown'})`);
    }

    return NextResponse.json({ result: result[0] });
  } catch (err) {
    console.error("User Streak POST Error:", err);
    return NextResponse.json(
      { error: "Failed to update user streak" },
      { status: 500 }
    );
  }
}
