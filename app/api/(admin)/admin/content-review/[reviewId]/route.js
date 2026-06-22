import { db } from "@/configs/db";
import { CONTENT_REVIEW_TABLE, CHAPTER_NOTES_TABLE, STUDY_TYPE_CONTENT_TABLE, STUDY_MATERIAL_TABLE, USER_TABLE } from "@/configs/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/adminApiAuth";

/**
 * GET /api/admin/content-review/[reviewId]
 * Fetch single review with full content for editing
 */
export async function GET(req, { params }) {
    const auth = await requireAdminAuth();
    if (!auth.authenticated) return auth.error;

    try {
        const { reviewId } = await params;

        const result = await db
            .select()
            .from(CONTENT_REVIEW_TABLE)
            .where(eq(CONTENT_REVIEW_TABLE.id, parseInt(reviewId)));

        if (result.length === 0) {
            return NextResponse.json(
                { error: "Review not found" },
                { status: 404 }
            );
        }

        const review = result[0];

        // Always fetch the current live content from the actual tables
        let currentContent = null;
        try {
            switch (review.contentType) {
                case "course_outline": {
                    const course = await db
                        .select({ courseLayout: STUDY_MATERIAL_TABLE.courseLayout })
                        .from(STUDY_MATERIAL_TABLE)
                        .where(eq(STUDY_MATERIAL_TABLE.courseId, review.courseId));
                    currentContent = course[0]?.courseLayout;
                    break;
                }
                case "notes": {
                    if (review.contentId) {
                        const notes = await db
                            .select({ notes: CHAPTER_NOTES_TABLE.notes })
                            .from(CHAPTER_NOTES_TABLE)
                            .where(
                                and(
                                    eq(CHAPTER_NOTES_TABLE.courseId, review.courseId),
                                    eq(CHAPTER_NOTES_TABLE.chapterId, parseInt(review.contentId))
                                )
                            );
                        currentContent = notes[0]?.notes;
                    }
                    break;
                }
                case "flashcards":
                case "quiz":
                case "mcq": {
                    // Map review contentType to actual DB type values
                    // DB stores: 'Flashcard', 'Quiz', 'Question/Answer', 'MCQ', 'qa'
                    const possibleTypes = {
                        flashcards: ["Flashcard"],
                        quiz: ["Quiz", "Question/Answer", "qa"],
                        mcq: ["MCQ"],
                    };
                    const types = possibleTypes[review.contentType] || [review.contentType];
                    
                    // Try each possible type name
                    let typeContent = [];
                    for (const typeName of types) {
                        typeContent = await db
                            .select({ id: STUDY_TYPE_CONTENT_TABLE.id, content: STUDY_TYPE_CONTENT_TABLE.content, type: STUDY_TYPE_CONTENT_TABLE.type })
                            .from(STUDY_TYPE_CONTENT_TABLE)
                            .where(
                                and(
                                    eq(STUDY_TYPE_CONTENT_TABLE.courseId, review.courseId),
                                    eq(STUDY_TYPE_CONTENT_TABLE.type, typeName)
                                )
                            );
                        if (typeContent.length > 0) break;
                    }
                    if (typeContent.length > 0) {
                        currentContent = typeContent[0]?.content;
                    }
                    break;
                }
            }
        } catch (fetchErr) {
            console.error("Error fetching current content:", fetchErr);
        }

        // If originalContent is null (e.g., from student feedback), use live content
        if (!review.originalContent && currentContent) {
            review.originalContent = currentContent;
        }

        // Get course info
        const courseInfo = await db
            .select({
                topic: STUDY_MATERIAL_TABLE.topic,
                courseType: STUDY_MATERIAL_TABLE.courseType,
                createdBy: STUDY_MATERIAL_TABLE.createdBy,
                creatorName: USER_TABLE.name,
                difficultyLevel: STUDY_MATERIAL_TABLE.difficultyLevel,
            })
            .from(STUDY_MATERIAL_TABLE)
            .leftJoin(USER_TABLE, eq(STUDY_MATERIAL_TABLE.createdBy, USER_TABLE.email))
            .where(eq(STUDY_MATERIAL_TABLE.courseId, review.courseId));

        const isTutor = auth.admin.role === 'tutor';
        let course = courseInfo[0] || null;
        if (course) {
            course.creatorName = course.creatorName || (course.createdBy ? course.createdBy.split('@')[0] : 'Unknown');
            if (isTutor) {
                course.createdBy = null;
            }
        }

        return NextResponse.json({
            review,
            currentContent,
            courseInfo: course,
        });
    } catch (error) {
        console.error("Content Review Detail Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch review details" },
            { status: 500 }
        );
    }
}
