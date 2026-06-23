import { db } from "@/configs/db";
import { STUDY_MATERIAL_TABLE, CHAPTER_NOTES_TABLE, STUDY_TYPE_CONTENT_TABLE, STUDENT_PROGRESS_TABLE, COURSE_ASSIGNMENTS_TABLE, ASSIGNMENT_SUBMISSIONS_TABLE, CONTENT_REVIEW_TABLE } from "@/configs/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { refundCourseCredits } from "@/lib/credits";
import { auth } from "@clerk/nextjs/server";
import { getAuthEmail } from "@/lib/clerkUtils";

/**
 * DELETE /api/course/[courseId]
 * Deletes a course and all related data (notes, study content, progress, assignments)
 * Only allows deletion of courses in 'Generating', 'Error', or 'Failed' status
 * Refunds the user's credit via the proper credit transaction system
 */
export async function DELETE(req, { params }) {
    try {
        const { userId, sessionClaims } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const authEmail = await getAuthEmail(sessionClaims);

        const { courseId } = await params;
        const { userEmail } = await req.json();

        if (!courseId || !userEmail) {
            return NextResponse.json(
                { error: "courseId and userEmail are required" },
                { status: 400 }
            );
        }

        if (authEmail !== userEmail.trim().toLowerCase()) {
            return NextResponse.json(
                { error: "Forbidden" },
                { status: 403 }
            );
        }

        // 1. Get the course and verify ownership
        const course = await db.select()
            .from(STUDY_MATERIAL_TABLE)
            .where(eq(STUDY_MATERIAL_TABLE.courseId, courseId));

        if (course.length === 0) {
            return NextResponse.json(
                { error: "Course not found" },
                { status: 404 }
            );
        }

        const courseData = course[0];

        // Verify the user owns this course
        if (courseData.createdBy !== userEmail) {
            return NextResponse.json(
                { error: "You don't have permission to delete this course" },
                { status: 403 }
            );
        }

        // Only allow deletion of failed/stuck courses (not completed ones)
        // Allow: 'Generating', 'Error', 'Failed', or courses stuck for too long
        const allowedStatuses = ['Generating', 'Error', 'Failed'];
        const isStuckGenerating = courseData.status === 'Generating' && 
            courseData.createdAt && 
            (Date.now() - new Date(courseData.createdAt).getTime()) > 10 * 60 * 1000; // 10 minutes

        if (!allowedStatuses.includes(courseData.status) && !isStuckGenerating) {
            return NextResponse.json(
                { error: "Can only delete failed or stuck courses. Completed courses cannot be deleted." },
                { status: 400 }
            );
        }

        // 2. Delete all related data in order (foreign key constraints)
        
        // Delete assignment submissions for this course
        try {
            await db.delete(ASSIGNMENT_SUBMISSIONS_TABLE)
                .where(eq(ASSIGNMENT_SUBMISSIONS_TABLE.courseId, courseId));
        } catch (e) {
            console.log('No assignment submissions to delete or table not exists');
        }

        // Delete course assignments
        try {
            await db.delete(COURSE_ASSIGNMENTS_TABLE)
                .where(eq(COURSE_ASSIGNMENTS_TABLE.courseId, courseId));
        } catch (e) {
            console.log('No course assignments to delete or table not exists');
        }

        // Delete student progress
        try {
            await db.delete(STUDENT_PROGRESS_TABLE)
                .where(eq(STUDENT_PROGRESS_TABLE.courseId, courseId));
        } catch (e) {
            console.log('No student progress to delete');
        }

        // Delete study type content (flashcards, quiz, mcq, qa)
        await db.delete(STUDY_TYPE_CONTENT_TABLE)
            .where(eq(STUDY_TYPE_CONTENT_TABLE.courseId, courseId));

        // Delete chapter notes
        await db.delete(CHAPTER_NOTES_TABLE)
            .where(eq(CHAPTER_NOTES_TABLE.courseId, courseId));

        // Delete content reviews
        try {
            await db.delete(CONTENT_REVIEW_TABLE)
                .where(eq(CONTENT_REVIEW_TABLE.courseId, courseId));
        } catch (e) {
            console.log('No content review items to delete or table not exists');
        }

        // 3. Finally delete the course itself
        await db.delete(STUDY_MATERIAL_TABLE)
            .where(eq(STUDY_MATERIAL_TABLE.courseId, courseId));

        // 4. Refund the credit if not already refunded
        // Courses in 'Error' or 'Failed' status have already been refunded by the Inngest failure handler or cleanup cron job.
        const alreadyRefunded = courseData.status === 'Error' || courseData.status === 'Failed';
        
        let refundResult = { success: false, newBalance: null };
        if (!alreadyRefunded) {
            refundResult = await refundCourseCredits(
                userEmail,
                courseId,
                `Manual deletion: ${courseData.status} course - ${courseData.topic}`
            );
        } else {
            console.log(`Course ${courseId} has status ${courseData.status} and was already refunded. Skipping duplicate refund on delete.`);
            // Get current balance
            const userCreditsResult = await db.select({ credits: USER_TABLE.credits })
                .from(USER_TABLE)
                .where(eq(USER_TABLE.email, userEmail.trim().toLowerCase()))
                .limit(1);
            refundResult = { 
                success: true, 
                newBalance: userCreditsResult[0]?.credits ?? 0,
                alreadyRefunded: true 
            };
        }

        return NextResponse.json({
            success: true,
            message: refundResult.alreadyRefunded 
                ? "Course deleted successfully. (Credit was already refunded previously.)"
                : refundResult.success 
                    ? "Course deleted successfully. Credit has been refunded."
                    : "Course deleted but credit refund failed. Contact support.",
            deletedCourseId: courseId,
            creditRefunded: refundResult.alreadyRefunded ? false : refundResult.success,
            newCreditBalance: refundResult.newBalance
        });

    } catch (error) {
        console.error("Error deleting course:", error);
        return NextResponse.json(
            { error: "Failed to delete course. Please try again." },
            { status: 500 }
        );
    }
}
