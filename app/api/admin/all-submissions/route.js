import { db } from "@/configs/db";
import { ASSIGNMENT_SUBMISSIONS_TABLE, COURSE_ASSIGNMENTS_TABLE, STUDY_MATERIAL_TABLE, USER_TABLE, STUDENT_PROGRESS_TABLE, ADMIN_ACTIVITY_LOG_TABLE } from "@/configs/schema";
import { eq, desc, and, or, ilike, sql } from "drizzle-orm";
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
 * Helper function to log admin activity
 */
async function logAdminActivity(adminEmail, action, targetType, targetId, details = {}, studentEmail = null, courseId = null, ipAddress = null) {
    try {
        await db.insert(ADMIN_ACTIVITY_LOG_TABLE).values({
            adminEmail,
            action,
            targetType,
            targetId: String(targetId),
            details: JSON.stringify(details),
            studentEmail,
            courseId,
            ipAddress,
            createdAt: new Date()
        });
    } catch (error) {
        console.error('Failed to log admin activity:', error);
    }
}

/**
 * GET /api/admin/all-submissions
 * Fetch all assignment submissions for admin to view/grade
 * Supports search and pagination
 */
export async function GET(req) {
    // Verify admin session
    const auth = await requireAdminAuth();
    if (!auth.authenticated) return auth.error;

    try {
        const { searchParams } = new URL(req.url);
        const search = searchParams.get('search') || '';
        const status = searchParams.get('status') || 'all';
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const offset = (page - 1) * limit;

        // Build query conditions
        let conditions = [];
        
        if (status !== 'all') {
            conditions.push(eq(ASSIGNMENT_SUBMISSIONS_TABLE.status, status));
        }

        // Get total count first (for pagination)
        let totalQuery = db.select({ count: sql`count(*)::int` }).from(ASSIGNMENT_SUBMISSIONS_TABLE);
        if (conditions.length > 0) {
            totalQuery = totalQuery.where(and(...conditions));
        }
        const totalResult = await totalQuery;
        let totalCount = totalResult[0]?.count || 0;

        // Get submissions with pagination
        let query = db
            .select()
            .from(ASSIGNMENT_SUBMISSIONS_TABLE)
            .orderBy(desc(ASSIGNMENT_SUBMISSIONS_TABLE.submittedAt))
            .limit(limit)
            .offset(offset);

        if (conditions.length > 0) {
            query = query.where(and(...conditions));
        }

        const submissions = await query;

        // Enrich with assignment and course details
        let enrichedSubmissions = await Promise.all(
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

        // Apply search filter on enriched data (client-side filtering for complex search)
        if (search) {
            const searchLower = search.toLowerCase();
            enrichedSubmissions = enrichedSubmissions.filter(sub => 
                sub.studentEmail?.toLowerCase().includes(searchLower) ||
                sub.course?.topic?.toLowerCase().includes(searchLower) ||
                sub.assignment?.title?.toLowerCase().includes(searchLower) ||
                sub.student?.name?.toLowerCase().includes(searchLower)
            );
            totalCount = enrichedSubmissions.length;
        }

        const totalPages = Math.ceil(totalCount / limit);

        return NextResponse.json({ 
            submissions: enrichedSubmissions,
            result: enrichedSubmissions,
            count: enrichedSubmissions.length,
            totalCount,
            page,
            limit,
            totalPages,
            hasMore: page < totalPages
        });

    } catch (error) {
        console.error("Error fetching all submissions:", error);
        return NextResponse.json(
            { error: "Failed to fetch submissions" },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/admin/all-submissions
 * Admin updates a submission's grade directly
 */
export async function PATCH(req) {
    // Verify admin session
    const auth = await requireAdminAuth();
    if (!auth.authenticated) return auth.error;

    try {
        const { submissionId, newScore, instructorNotes } = await req.json();
        const adminEmail = auth.admin?.email;

        if (!submissionId || newScore === undefined) {
            return NextResponse.json(
                { error: "Missing required fields: submissionId, newScore" },
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

        // Update the submission with admin grade
        const result = await db
            .update(ASSIGNMENT_SUBMISSIONS_TABLE)
            .set({
                score: parseInt(newScore),
                originalAiScore: submission.originalAiScore || submission.score, // Preserve original AI score if not already set
                reviewedBy: adminEmail,
                reviewedAt: new Date(),
                gradedBy: adminEmail,
                gradedAt: new Date(),
                instructorNotes: instructorNotes || submission.instructorNotes || null,
                status: 'ManuallyGraded',
                reviewRequested: false // Clear any review request
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

        // Log admin activity
        await logAdminActivity(
            adminEmail,
            'update_grade',
            'submission',
            submissionId,
            {
                oldScore: submission.score,
                newScore: parseInt(newScore),
                instructorNotes: instructorNotes || null
            },
            submission.studentEmail,
            submission.courseId
        );

        return NextResponse.json({ 
            result: result[0],
            message: "Grade updated successfully",
            progressUpdated: progressUpdate.success,
            newFinalScore: progressUpdate.finalScore
        });

    } catch (error) {
        console.error("Error updating submission grade:", error);
        return NextResponse.json(
            { error: "Failed to update grade" },
            { status: 500 }
        );
    }
}
