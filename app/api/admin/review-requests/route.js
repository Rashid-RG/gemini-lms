import { db } from "@/configs/db";
import { ASSIGNMENT_SUBMISSIONS_TABLE, COURSE_ASSIGNMENTS_TABLE, STUDY_MATERIAL_TABLE, USER_TABLE, STUDENT_PROGRESS_TABLE } from "@/configs/schema";
import { eq, and, desc, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/adminApiAuth";

/**
 * Helper function to update student progress with new assignment score
 */
async function updateStudentProgressWithScore(courseId, studentEmail, assignmentId, newScore) {
    try {
        const progress = await db.select().from(STUDENT_PROGRESS_TABLE)
            .where(
                and(
                    eq(STUDENT_PROGRESS_TABLE.courseId, courseId),
                    eq(STUDENT_PROGRESS_TABLE.studentEmail, studentEmail)
                )
            );

        if (progress.length > 0) {
            // Parse assignmentScores
            let assignmentScores;
            if (typeof progress[0].assignmentScores === 'string') {
                assignmentScores = JSON.parse(progress[0].assignmentScores || '{}');
            } else {
                assignmentScores = progress[0].assignmentScores || {};
            }
            
            // Update the score for this assignment
            assignmentScores[assignmentId] = newScore;
            
            // Calculate new final score
            let quizScores;
            if (typeof progress[0].quizScores === 'string') {
                quizScores = JSON.parse(progress[0].quizScores || '{}');
            } else {
                quizScores = progress[0].quizScores || {};
            }
            
            const quizArray = Object.values(quizScores).filter(s => typeof s === 'number');
            const assignmentArray = Object.values(assignmentScores).filter(s => typeof s === 'number');
            const allScores = [...quizArray, ...assignmentArray];
            const finalScore = allScores.length > 0 
                ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
                : 0;

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
            
            console.log(`Updated student progress: ${studentEmail} - Assignment ${assignmentId} = ${newScore}, Final = ${finalScore}`);
            return { success: true, finalScore };
        }
        return { success: false, message: 'No progress record found' };
    } catch (error) {
        console.error('Error updating student progress:', error);
        return { success: false, error: error.message };
    }
}

/**
 * GET /api/admin/review-requests
 * Fetch all pending review requests for admin (both user-requested and AI fallback)
 */
export async function GET(req) {
    // Verify admin session
    const auth = await requireAdminAuth();
    if (!auth.authenticated) return auth.error;

    try {
        // Get all submissions that need manual review:
        // 1. User explicitly requested review (reviewRequested = true)
        // 2. AI grading failed and needs manual review (status = 'PendingReview')
        const submissions = await db
            .select()
            .from(ASSIGNMENT_SUBMISSIONS_TABLE)
            .where(
                or(
                    eq(ASSIGNMENT_SUBMISSIONS_TABLE.reviewRequested, true),
                    eq(ASSIGNMENT_SUBMISSIONS_TABLE.status, 'PendingReview')
                )
            )
            .orderBy(desc(ASSIGNMENT_SUBMISSIONS_TABLE.submittedAt));

        // Enrich with assignment and course details
        const enrichedSubmissions = await Promise.all(
            submissions.map(async (submission) => {
                // Get assignment details
                const assignment = await db
                    .select()
                    .from(COURSE_ASSIGNMENTS_TABLE)
                    .where(eq(COURSE_ASSIGNMENTS_TABLE.assignmentId, submission.assignmentId));

                // Get course details
                const course = await db
                    .select()
                    .from(STUDY_MATERIAL_TABLE)
                    .where(eq(STUDY_MATERIAL_TABLE.courseId, submission.courseId));

                // Get student details
                const student = await db
                    .select()
                    .from(USER_TABLE)
                    .where(eq(USER_TABLE.email, submission.studentEmail));

                return {
                    ...submission,
                    assignment: assignment[0] || null,
                    course: course[0] || null,
                    student: student[0] || null
                };
            })
        );

        return NextResponse.json({ 
            requests: enrichedSubmissions,
            result: enrichedSubmissions,
            count: enrichedSubmissions.length
        });

    } catch (error) {
        console.error("Error fetching review requests:", error);
        return NextResponse.json(
            { error: "Failed to fetch review requests" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/admin/review-requests
 * Admin submits their review/grade update
 */
export async function POST(req) {
    // Verify admin session
    const auth = await requireAdminAuth();
    if (!auth.authenticated) return auth.error;

    try {
        const { submissionId, newScore, instructorNotes } = await req.json();
        const adminEmail = auth.admin?.email;

        if (!submissionId || newScore === undefined) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Get the current submission
        const existing = await db
            .select()
            .from(ASSIGNMENT_SUBMISSIONS_TABLE)
            .where(eq(ASSIGNMENT_SUBMISSIONS_TABLE.id, submissionId));

        if (existing.length === 0) {
            return NextResponse.json(
                { error: "Submission not found" },
                { status: 404 }
            );
        }

        const submission = existing[0];

        // Only preserve original AI score if not already set (first manual review)
        const originalScore = submission.originalAiScore !== null && submission.originalAiScore !== undefined 
            ? submission.originalAiScore 
            : submission.score;

        // Update the submission with admin review
        const result = await db
            .update(ASSIGNMENT_SUBMISSIONS_TABLE)
            .set({
                score: parseInt(newScore),
                originalAiScore: originalScore, // Preserve original AI score (only on first review)
                reviewedBy: adminEmail,
                reviewedAt: new Date(),
                gradedBy: adminEmail,
                gradedAt: new Date(),
                instructorNotes: instructorNotes || null,
                status: 'ManuallyGraded',
                reviewRequested: false // Clear the review request
            })
            .where(eq(ASSIGNMENT_SUBMISSIONS_TABLE.id, submissionId))
            .returning();

        // IMPORTANT: Also update student progress with the new score
        const progressUpdate = await updateStudentProgressWithScore(
            submission.courseId,
            submission.studentEmail,
            submission.assignmentId,
            parseInt(newScore)
        );

        return NextResponse.json({ 
            result: result[0],
            message: "Review submitted successfully",
            progressUpdated: progressUpdate.success,
            newFinalScore: progressUpdate.finalScore
        });

    } catch (error) {
        console.error("Error submitting review:", error);
        return NextResponse.json(
            { error: "Failed to submit review" },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/admin/review-requests
 * Admin dismisses a review request without changing grade (only for ReviewRequested, not PendingReview)
 */
export async function DELETE(req) {
    // Verify admin session
    const auth = await requireAdminAuth();
    if (!auth.authenticated) return auth.error;

    try {
        const { submissionId, dismissReason } = await req.json();
        const adminEmail = auth.admin?.email;

        if (!submissionId) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Get the current submission to check its status
        const existing = await db
            .select()
            .from(ASSIGNMENT_SUBMISSIONS_TABLE)
            .where(eq(ASSIGNMENT_SUBMISSIONS_TABLE.id, submissionId));

        if (existing.length === 0) {
            return NextResponse.json(
                { error: "Submission not found" },
                { status: 404 }
            );
        }

        const submission = existing[0];

        // If it's a PendingReview (AI failed), we can't just dismiss - admin must provide a score
        if (submission.status === 'PendingReview' && (submission.score === null || submission.score === undefined)) {
            return NextResponse.json(
                { error: "Cannot dismiss without score. This submission has no AI score - please use 'Update Score' to grade it." },
                { status: 400 }
            );
        }

        // Update the submission to dismiss review request - revert to Graded status
        const result = await db
            .update(ASSIGNMENT_SUBMISSIONS_TABLE)
            .set({
                reviewRequested: false,
                reviewedBy: adminEmail,
                reviewedAt: new Date(),
                instructorNotes: dismissReason || "Review request dismissed - AI grade confirmed",
                status: 'Graded' // Revert back to Graded status
            })
            .where(eq(ASSIGNMENT_SUBMISSIONS_TABLE.id, submissionId))
            .returning();

        return NextResponse.json({ 
            result: result[0],
            message: "Review request dismissed" 
        });

    } catch (error) {
        console.error("Error dismissing review:", error);
        return NextResponse.json(
            { error: "Failed to dismiss review" },
            { status: 500 }
        );
    }
}
