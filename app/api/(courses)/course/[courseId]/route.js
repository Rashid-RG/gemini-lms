import { db } from "@/configs/db";
import { STUDY_MATERIAL_TABLE, CHAPTER_NOTES_TABLE, STUDY_TYPE_CONTENT_TABLE, STUDENT_PROGRESS_TABLE, COURSE_ASSIGNMENTS_TABLE, ASSIGNMENT_SUBMISSIONS_TABLE } from "@/configs/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { refundCourseCredits } from "@/lib/credits";

/**
 * DELETE /api/course/[courseId]
 * Deletes a course and all related data (notes, study content, progress, assignments)
 * Only allows deletion of courses in 'Generating', 'Error', or 'Failed' status
 * Refunds the user's credit via the proper credit transaction system
 */
export async function DELETE(req, { params }) {
    try {
        const { courseId } = await params;
        const { userEmail } = await req.json();

        if (!courseId || !userEmail) {
            return NextResponse.json(
                { error: "courseId and userEmail are required" },
                { status: 400 }
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

        // 3. Finally delete the course itself
        await db.delete(STUDY_MATERIAL_TABLE)
            .where(eq(STUDY_MATERIAL_TABLE.courseId, courseId));

        // 4. Refund the credit using proper transaction logging
        const refundResult = await refundCourseCredits(
            userEmail,
            courseId,
            `Manual deletion: ${courseData.status === 'Ready' ? 'Completed course' : 'Failed/stuck course'} - ${courseData.topic}`
        );

        return NextResponse.json({
            success: true,
            message: refundResult.success 
                ? "Course deleted successfully. Credit has been refunded."
                : "Course deleted but credit refund failed. Contact support.",
            deletedCourseId: courseId,
            creditRefunded: refundResult.success,
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
