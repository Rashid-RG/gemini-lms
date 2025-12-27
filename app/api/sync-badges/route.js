import { db } from "@/configs/db";
import { STUDENT_PROGRESS_TABLE, STUDY_MATERIAL_TABLE, USER_STREAK_TABLE } from "@/configs/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

/**
 * GET /api/sync-badges?studentEmail=xxx
 * Sync badges for a specific user based on their existing progress
 * This awards badges retroactively for activities already completed
 */
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const studentEmail = searchParams.get('studentEmail');

        if (!studentEmail) {
            return NextResponse.json(
                { error: "studentEmail is required" },
                { status: 400 }
            );
        }

        // Get all courses created by user
        const courses = await db
            .select()
            .from(STUDY_MATERIAL_TABLE)
            .where(eq(STUDY_MATERIAL_TABLE.createdBy, studentEmail));

        // Get all progress records for user
        const progressRecords = await db
            .select()
            .from(STUDENT_PROGRESS_TABLE)
            .where(eq(STUDENT_PROGRESS_TABLE.studentEmail, studentEmail));

        // Get user streak
        const streakRecords = await db
            .select()
            .from(USER_STREAK_TABLE)
            .where(eq(USER_STREAK_TABLE.studentEmail, studentEmail));

        const streak = streakRecords[0] || { streakCount: 0, longestStreak: 0 };

        // Calculate stats from existing data
        let stats = {
            coursesCreated: courses.length,
            coursesCompleted: 0,
            currentStreak: streak.streakCount || 0,
            longestStreak: streak.longestStreak || 0,
            perfectQuizzes: 0,
            highScoreQuizzes: 0, // 80%+ scores
            quizzesTaken: 0,
            completedNotes: 0,
            allNotesCompleted: 0,
            flashcardsCompleted: 0
        };

        progressRecords.forEach((p) => {
            // Parse completedChapters
            let completedChaptersArray = [];
            if (p.completedChapters) {
                if (typeof p.completedChapters === 'string') {
                    try {
                        completedChaptersArray = JSON.parse(p.completedChapters);
                    } catch (e) {
                        completedChaptersArray = [];
                    }
                } else if (Array.isArray(p.completedChapters)) {
                    completedChaptersArray = p.completedChapters;
                }
            }

            // Check course completion
            const completedCount = completedChaptersArray.length;
            if (
                (completedCount > 0 && p.totalChapters && completedCount >= p.totalChapters) ||
                p.status === 'Completed' ||
                p.progressPercentage >= 100
            ) {
                stats.coursesCompleted++;
            }

            // Quiz scores
            let quizScoresData = p.quizScores;
            if (typeof quizScoresData === 'string') {
                try {
                    quizScoresData = JSON.parse(quizScoresData);
                } catch (e) {
                    quizScoresData = {};
                }
            }

            if (quizScoresData) {
                const scores = Array.isArray(quizScoresData)
                    ? quizScoresData
                    : Object.values(quizScoresData);
                stats.quizzesTaken += scores.length;
                scores.forEach((score) => {
                    const scoreVal = typeof score === 'object' ? score.percentage : score;
                    if (scoreVal === 100) stats.perfectQuizzes++;
                    if (scoreVal >= 80) stats.highScoreQuizzes++; // Track 80%+ scores
                });
            }

            // Notes
            stats.completedNotes += p.completedNotes || 0;
            if (p.completedNotes && p.totalNotes && p.completedNotes >= p.totalNotes) {
                stats.allNotesCompleted++;
            }

            // Flashcards
            stats.flashcardsCompleted += p.completedFlashcards || 0;
        });

        // Define badges that user should have
        const earnedBadges = [];

        // Quick earn badges
        if (stats.coursesCreated >= 1) earnedBadges.push('welcome');
        if (stats.completedNotes >= 1) earnedBadges.push('curious-mind');
        if (stats.flashcardsCompleted >= 1) earnedBadges.push('first-flip');
        if (stats.quizzesTaken >= 1) earnedBadges.push('quiz-taker');
        if (stats.currentStreak >= 1) earnedBadges.push('streak-1');

        // Course badges
        if (stats.coursesCompleted >= 1) earnedBadges.push('first-course');
        if (stats.coursesCompleted >= 3) earnedBadges.push('courses-3');
        if (stats.coursesCompleted >= 5) earnedBadges.push('courses-5');
        if (stats.coursesCompleted >= 10) earnedBadges.push('courses-10');

        // Streak badges
        if (stats.currentStreak >= 3 || stats.longestStreak >= 3) earnedBadges.push('streak-3');
        if (stats.currentStreak >= 7 || stats.longestStreak >= 7) earnedBadges.push('streak-7');
        if (stats.currentStreak >= 14 || stats.longestStreak >= 14) earnedBadges.push('streak-14');
        if (stats.currentStreak >= 30 || stats.longestStreak >= 30) earnedBadges.push('streak-30');

        // Achievement badges
        if (stats.highScoreQuizzes >= 1) earnedBadges.push('high-achiever'); // 80%+ on any quiz
        if (stats.perfectQuizzes >= 1) earnedBadges.push('perfect-quiz');
        if (stats.quizzesTaken >= 10) earnedBadges.push('quiz-master');
        if (stats.allNotesCompleted >= 1) earnedBadges.push('all-notes');
        if (stats.flashcardsCompleted >= 10) earnedBadges.push('flashcard-10');
        if (stats.flashcardsCompleted >= 50) earnedBadges.push('flashcard-50');
        if (stats.flashcardsCompleted >= 100) earnedBadges.push('flashcard-master');

        // Update badges in all progress records for this user
        for (const progress of progressRecords) {
            // Get existing badges
            let existingBadges = [];
            if (progress.badges) {
                if (typeof progress.badges === 'string') {
                    try {
                        existingBadges = JSON.parse(progress.badges);
                    } catch (e) {
                        existingBadges = [];
                    }
                } else if (Array.isArray(progress.badges)) {
                    existingBadges = progress.badges;
                }
            }

            // Merge with new badges
            const allBadges = [...new Set([...existingBadges, ...earnedBadges])];

            // Update record
            await db
                .update(STUDENT_PROGRESS_TABLE)
                .set({ badges: JSON.stringify(allBadges) })
                .where(eq(STUDENT_PROGRESS_TABLE.id, progress.id));
        }

        // Also update user streak table badges if exists
        if (streakRecords.length > 0) {
            let existingBadges = [];
            if (streakRecords[0].badges) {
                if (typeof streakRecords[0].badges === 'string') {
                    try {
                        existingBadges = JSON.parse(streakRecords[0].badges);
                    } catch (e) {
                        existingBadges = [];
                    }
                } else if (Array.isArray(streakRecords[0].badges)) {
                    existingBadges = streakRecords[0].badges;
                }
            }

            const allBadges = [...new Set([...existingBadges, ...earnedBadges])];

            await db
                .update(USER_STREAK_TABLE)
                .set({ badges: JSON.stringify(allBadges) })
                .where(eq(USER_STREAK_TABLE.studentEmail, studentEmail));
        }

        return NextResponse.json({
            success: true,
            message: `Synced ${earnedBadges.length} badges for user`,
            stats,
            earnedBadges,
            totalBadges: earnedBadges.length
        });

    } catch (error) {
        console.error("Sync badges error:", error);
        return NextResponse.json(
            { error: "Failed to sync badges", details: error.message },
            { status: 500 }
        );
    }
}

/**
 * POST /api/sync-badges
 * Sync badges for ALL users in the system
 */
export async function POST(req) {
    try {
        // Get all unique student emails from progress table
        const allProgress = await db.select().from(STUDENT_PROGRESS_TABLE);
        const uniqueEmails = [...new Set(allProgress.map(p => p.studentEmail))];

        const results = [];

        for (const email of uniqueEmails) {
            try {
                // Call GET handler logic for each user
                const courses = await db
                    .select()
                    .from(STUDY_MATERIAL_TABLE)
                    .where(eq(STUDY_MATERIAL_TABLE.createdBy, email));

                const progressRecords = await db
                    .select()
                    .from(STUDENT_PROGRESS_TABLE)
                    .where(eq(STUDENT_PROGRESS_TABLE.studentEmail, email));

                const streakRecords = await db
                    .select()
                    .from(USER_STREAK_TABLE)
                    .where(eq(USER_STREAK_TABLE.studentEmail, email));

                const streak = streakRecords[0] || { streakCount: 0, longestStreak: 0 };

                // Calculate stats
                let stats = {
                    coursesCreated: courses.length,
                    coursesCompleted: 0,
                    currentStreak: streak.streakCount || 0,
                    longestStreak: streak.longestStreak || 0,
                    perfectQuizzes: 0,
                    quizzesTaken: 0,
                    completedNotes: 0,
                    allNotesCompleted: 0,
                    flashcardsCompleted: 0
                };

                progressRecords.forEach((p) => {
                    let completedChaptersArray = [];
                    if (p.completedChapters) {
                        if (typeof p.completedChapters === 'string') {
                            try { completedChaptersArray = JSON.parse(p.completedChapters); } catch (e) { }
                        } else if (Array.isArray(p.completedChapters)) {
                            completedChaptersArray = p.completedChapters;
                        }
                    }

                    const completedCount = completedChaptersArray.length;
                    if ((completedCount > 0 && p.totalChapters && completedCount >= p.totalChapters) ||
                        p.status === 'Completed' || p.progressPercentage >= 100) {
                        stats.coursesCompleted++;
                    }

                    let quizScoresData = p.quizScores;
                    if (typeof quizScoresData === 'string') {
                        try { quizScoresData = JSON.parse(quizScoresData); } catch (e) { quizScoresData = {}; }
                    }
                    if (quizScoresData) {
                        const scores = Array.isArray(quizScoresData) ? quizScoresData : Object.values(quizScoresData);
                        stats.quizzesTaken += scores.length;
                        scores.forEach((score) => {
                            const scoreVal = typeof score === 'object' ? score.percentage : score;
                            if (scoreVal === 100) stats.perfectQuizzes++;
                        });
                    }

                    stats.completedNotes += p.completedNotes || 0;
                    if (p.completedNotes && p.totalNotes && p.completedNotes >= p.totalNotes) {
                        stats.allNotesCompleted++;
                    }
                    stats.flashcardsCompleted += p.completedFlashcards || 0;
                });

                // Calculate earned badges
                const earnedBadges = [];
                if (stats.coursesCreated >= 1) earnedBadges.push('welcome');
                if (stats.completedNotes >= 1) earnedBadges.push('curious-mind');
                if (stats.flashcardsCompleted >= 1) earnedBadges.push('first-flip');
                if (stats.quizzesTaken >= 1) earnedBadges.push('quiz-taker');
                if (stats.currentStreak >= 1) earnedBadges.push('streak-1');
                if (stats.coursesCompleted >= 1) earnedBadges.push('first-course');
                if (stats.coursesCompleted >= 3) earnedBadges.push('courses-3');
                if (stats.coursesCompleted >= 5) earnedBadges.push('courses-5');
                if (stats.coursesCompleted >= 10) earnedBadges.push('courses-10');
                if (stats.currentStreak >= 3 || stats.longestStreak >= 3) earnedBadges.push('streak-3');
                if (stats.currentStreak >= 7 || stats.longestStreak >= 7) earnedBadges.push('streak-7');
                if (stats.currentStreak >= 14 || stats.longestStreak >= 14) earnedBadges.push('streak-14');
                if (stats.currentStreak >= 30 || stats.longestStreak >= 30) earnedBadges.push('streak-30');
                if (stats.perfectQuizzes >= 1) earnedBadges.push('perfect-quiz');
                if (stats.quizzesTaken >= 10) earnedBadges.push('quiz-master');
                if (stats.allNotesCompleted >= 1) earnedBadges.push('all-notes');
                if (stats.flashcardsCompleted >= 10) earnedBadges.push('flashcard-10');
                if (stats.flashcardsCompleted >= 50) earnedBadges.push('flashcard-50');
                if (stats.flashcardsCompleted >= 100) earnedBadges.push('flashcard-master');

                // Update all progress records
                for (const progress of progressRecords) {
                    let existingBadges = [];
                    if (progress.badges) {
                        if (typeof progress.badges === 'string') {
                            try { existingBadges = JSON.parse(progress.badges); } catch (e) { }
                        } else if (Array.isArray(progress.badges)) {
                            existingBadges = progress.badges;
                        }
                    }
                    const allBadges = [...new Set([...existingBadges, ...earnedBadges])];
                    await db.update(STUDENT_PROGRESS_TABLE).set({ badges: JSON.stringify(allBadges) }).where(eq(STUDENT_PROGRESS_TABLE.id, progress.id));
                }

                results.push({ email, badgesAwarded: earnedBadges.length, badges: earnedBadges });
            } catch (err) {
                results.push({ email, error: err.message });
            }
        }

        return NextResponse.json({
            success: true,
            message: `Synced badges for ${uniqueEmails.length} users`,
            totalUsers: uniqueEmails.length,
            results
        });

    } catch (error) {
        console.error("Sync all badges error:", error);
        return NextResponse.json(
            { error: "Failed to sync badges", details: error.message },
            { status: 500 }
        );
    }
}
