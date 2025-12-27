import { db } from "@/configs/db";
import { STUDENT_PROGRESS_TABLE, ASSIGNMENT_SUBMISSIONS_TABLE } from "@/configs/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

/**
 * POST /api/sync-progress
 * Recalculates and syncs student progress from all graded assignment submissions
 * This fixes any discrepancies between submission scores and progress tracking
 */
export async function POST(req) {
    try {
        const { courseId, studentEmail } = await req.json();

        if (!courseId || !studentEmail) {
            return NextResponse.json(
                { error: "Missing courseId or studentEmail" },
                { status: 400 }
            );
        }

        // Get all graded submissions for this student in this course
        const submissions = await db.select()
            .from(ASSIGNMENT_SUBMISSIONS_TABLE)
            .where(
                and(
                    eq(ASSIGNMENT_SUBMISSIONS_TABLE.courseId, courseId),
                    eq(ASSIGNMENT_SUBMISSIONS_TABLE.studentEmail, studentEmail)
                )
            );

        // Filter to only include graded submissions with valid scores
        const gradedSubmissions = submissions.filter(s => 
            (s.status === 'Graded' || s.status === 'ManuallyGraded') && 
            s.score !== null && 
            s.score !== undefined
        );

        // Build assignment scores object from submissions
        const assignmentScores = {};
        for (const sub of gradedSubmissions) {
            assignmentScores[sub.assignmentId] = sub.score;
        }

        // Get current progress record
        const progress = await db.select()
            .from(STUDENT_PROGRESS_TABLE)
            .where(
                and(
                    eq(STUDENT_PROGRESS_TABLE.courseId, courseId),
                    eq(STUDENT_PROGRESS_TABLE.studentEmail, studentEmail)
                )
            );

        if (progress.length === 0) {
            return NextResponse.json({ 
                error: "No progress record found",
                syncedAssignments: 0
            }, { status: 404 });
        }

        // Get existing quiz scores to include in final score calculation
        let quizScores;
        if (typeof progress[0].quizScores === 'string') {
            quizScores = JSON.parse(progress[0].quizScores || '{}');
        } else {
            quizScores = progress[0].quizScores || {};
        }

        // Calculate new final score
        const quizArray = Object.values(quizScores).filter(s => typeof s === 'number');
        const assignmentArray = Object.values(assignmentScores).filter(s => typeof s === 'number');
        const allScores = [...quizArray, ...assignmentArray];
        const finalScore = allScores.length > 0 
            ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
            : 0;

        // Update progress with synced data
        await db.update(STUDENT_PROGRESS_TABLE)
            .set({
                assignmentScores: JSON.stringify(assignmentScores),
                finalScore,
                lastActivityAt: new Date()
            })
            .where(
                and(
                    eq(STUDENT_PROGRESS_TABLE.courseId, courseId),
                    eq(STUDENT_PROGRESS_TABLE.studentEmail, studentEmail)
                )
            );

        return NextResponse.json({
            success: true,
            message: "Progress synced successfully",
            syncedAssignments: Object.keys(assignmentScores).length,
            assignmentScores,
            quizCount: quizArray.length,
            newFinalScore: finalScore,
            oldFinalScore: progress[0].finalScore
        });

    } catch (error) {
        console.error("Error syncing progress:", error);
        return NextResponse.json(
            { error: "Failed to sync progress", details: error.message },
            { status: 500 }
        );
    }
}
