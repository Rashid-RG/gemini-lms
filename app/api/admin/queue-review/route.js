import { db } from "@/configs/db";
import { CONTENT_REVIEW_TABLE, STUDY_MATERIAL_TABLE, CHAPTER_NOTES_TABLE, STUDY_TYPE_CONTENT_TABLE, ADMIN_ACTIVITY_LOG_TABLE } from "@/configs/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/adminApiAuth";

/**
 * POST /api/admin/queue-review
 * Queue an existing course's content for admin review
 */
export async function POST(req) {
    const auth = await requireAdminAuth();
    if (!auth.authenticated) return auth.error;

    try {
        const { courseId } = await req.json();

        if (!courseId) {
            return NextResponse.json(
                { error: "Missing courseId" },
                { status: 400 }
            );
        }

        // Get the course
        const course = await db
            .select()
            .from(STUDY_MATERIAL_TABLE)
            .where(eq(STUDY_MATERIAL_TABLE.courseId, courseId));

        if (course.length === 0) {
            return NextResponse.json(
                { error: "Course not found" },
                { status: 404 }
            );
        }

        const courseData = course[0];

        // Check if course outline is already pending review
        const existingReviews = await db
            .select()
            .from(CONTENT_REVIEW_TABLE)
            .where(
                and(
                    eq(CONTENT_REVIEW_TABLE.courseId, courseId),
                    eq(CONTENT_REVIEW_TABLE.status, "pending")
                )
            );

        if (existingReviews.length > 0) {
            return NextResponse.json(
                { error: "This course already has pending review items. Check the Content Review queue." },
                { status: 409 }
            );
        }

        let itemsQueued = 0;

        // 1. Queue course outline
        if (courseData.courseLayout) {
            await db.insert(CONTENT_REVIEW_TABLE).values({
                courseId,
                contentType: "course_outline",
                contentId: null,
                status: "pending",
                originalContent: courseData.courseLayout,
                priority: "normal",
                flaggedBy: auth.admin.email,
                flagReason: "Admin queued existing course for review",
                autoFlagged: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            itemsQueued++;
        }

        // 2. Queue all chapter notes
        const notes = await db
            .select()
            .from(CHAPTER_NOTES_TABLE)
            .where(eq(CHAPTER_NOTES_TABLE.courseId, courseId));

        for (const note of notes) {
            await db.insert(CONTENT_REVIEW_TABLE).values({
                courseId,
                contentType: "notes",
                contentId: String(note.chapterId),
                status: "pending",
                originalContent: note.notes,
                priority: "normal",
                flaggedBy: auth.admin.email,
                flagReason: `Admin queued chapter ${note.chapterId + 1} notes for review`,
                autoFlagged: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            itemsQueued++;
        }

        // 3. Queue flashcards, quiz, MCQ
        const studyContent = await db
            .select()
            .from(STUDY_TYPE_CONTENT_TABLE)
            .where(eq(STUDY_TYPE_CONTENT_TABLE.courseId, courseId));

        for (const content of studyContent) {
            if (content.status === "Ready" && content.content) {
                const typeMap = { Flashcard: "flashcards", Quiz: "quiz", MCQ: "mcq" };
                await db.insert(CONTENT_REVIEW_TABLE).values({
                    courseId,
                    contentType: typeMap[content.type] || content.type.toLowerCase(),
                    contentId: String(content.id),
                    status: "pending",
                    originalContent: content.content,
                    priority: "normal",
                    flaggedBy: auth.admin.email,
                    flagReason: `Admin queued ${content.type} content for review`,
                    autoFlagged: false,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });
                itemsQueued++;
            }
        }

        // Log the action
        await db.insert(ADMIN_ACTIVITY_LOG_TABLE).values({
            adminEmail: auth.admin.email,
            action: "queue_course_review",
            targetType: "course",
            targetId: courseId,
            details: {
                topic: courseData.topic,
                itemsQueued,
            },
            courseId,
            createdAt: new Date(),
        });

        return NextResponse.json({
            success: true,
            message: `Course queued for review! ${itemsQueued} content items added to the review queue.`,
            itemsQueued,
        });
    } catch (error) {
        console.error("Queue Review Error:", error);
        return NextResponse.json(
            { error: "Failed to queue course for review" },
            { status: 500 }
        );
    }
}
