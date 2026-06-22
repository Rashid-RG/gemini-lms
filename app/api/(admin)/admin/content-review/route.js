import { db } from "@/configs/db";
import { CONTENT_REVIEW_TABLE, STUDY_MATERIAL_TABLE, CHAPTER_NOTES_TABLE, STUDY_TYPE_CONTENT_TABLE, ADMIN_ACTIVITY_LOG_TABLE, TUTOR_ASSIGNMENT_TABLE, USER_TABLE } from "@/configs/schema";
import { eq, and, desc, sql, count, like, or, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireReviewerAuth } from "@/lib/adminApiAuth";

/**
 * GET /api/admin/content-review
 * Fetch content review queue with filters
 * Tutors only see reviews for their assigned courses
 */
export async function GET(req) {
    const auth = await requireReviewerAuth();
    if (!auth.authenticated) return auth.error;

    try {
        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status") || "pending";
        const contentType = searchParams.get("contentType");
        const priority = searchParams.get("priority");
        const courseId = searchParams.get("courseId");
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const offset = (page - 1) * limit;

        // Build conditions
        const conditions = [];
        if (status && status !== "all") {
            conditions.push(eq(CONTENT_REVIEW_TABLE.status, status));
        }
        if (contentType) {
            conditions.push(eq(CONTENT_REVIEW_TABLE.contentType, contentType));
        }
        if (priority) {
            conditions.push(eq(CONTENT_REVIEW_TABLE.priority, priority));
        }
        if (courseId) {
            conditions.push(eq(CONTENT_REVIEW_TABLE.courseId, courseId));
        }

        // Note: Tutors can VIEW all pending reviews to facilitate the review workflow.
        // Permission checks (canEdit, canApprove) are enforced in the POST handler
        // when tutors attempt to approve/edit content.

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        // Fetch reviews with course info
        const reviews = await db
            .select({
                review: CONTENT_REVIEW_TABLE,
                courseTopic: STUDY_MATERIAL_TABLE.topic,
                courseType: STUDY_MATERIAL_TABLE.courseType,
                courseCreatedBy: STUDY_MATERIAL_TABLE.createdBy,
                creatorName: USER_TABLE.name,
            })
            .from(CONTENT_REVIEW_TABLE)
            .leftJoin(STUDY_MATERIAL_TABLE, eq(CONTENT_REVIEW_TABLE.courseId, STUDY_MATERIAL_TABLE.courseId))
            .leftJoin(USER_TABLE, eq(STUDY_MATERIAL_TABLE.createdBy, USER_TABLE.email))
            .where(whereClause)
            .orderBy(
                sql`CASE WHEN ${CONTENT_REVIEW_TABLE.priority} = 'urgent' THEN 0
                     WHEN ${CONTENT_REVIEW_TABLE.priority} = 'high' THEN 1
                     WHEN ${CONTENT_REVIEW_TABLE.priority} = 'normal' THEN 2
                     ELSE 3 END`,
                desc(CONTENT_REVIEW_TABLE.createdAt)
            )
            .limit(limit)
            .offset(offset);

        // Get stats
        const statsResult = await db
            .select({
                status: CONTENT_REVIEW_TABLE.status,
                total: count(),
            })
            .from(CONTENT_REVIEW_TABLE)
            .groupBy(CONTENT_REVIEW_TABLE.status);

        const stats = {
            pending: 0,
            approved: 0,
            rejected: 0,
            edited: 0,
            total: 0,
        };
        for (const row of statsResult) {
            stats[row.status] = Number(row.total);
            stats.total += Number(row.total);
        }

        // Get total count for pagination
        const totalResult = await db
            .select({ total: count() })
            .from(CONTENT_REVIEW_TABLE)
            .where(whereClause);

        const isTutor = auth.admin.role === 'tutor';

        return NextResponse.json({
            reviews: reviews.map(r => {
                const creatorName = r.creatorName || (r.courseCreatedBy ? r.courseCreatedBy.split('@')[0] : 'Unknown');
                return {
                    ...r.review,
                    courseTopic: r.courseTopic,
                    courseType: r.courseType,
                    courseCreatedBy: isTutor ? null : r.courseCreatedBy,
                    creatorName: creatorName,
                };
            }),
            stats,
            pagination: {
                page,
                limit,
                total: Number(totalResult[0]?.total || 0),
                totalPages: Math.ceil(Number(totalResult[0]?.total || 0) / limit),
            },
        });
    } catch (error) {
        console.error("Content Review GET Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch content reviews" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/admin/content-review
 * Approve, reject, or edit content
 * Tutors can only review/edit their assigned courses; approve requires canApprove permission
 */
export async function POST(req) {
    const auth = await requireReviewerAuth();
    if (!auth.authenticated) return auth.error;

    try {
        const { reviewId, action, editedContent, reviewNotes } = await req.json();

        if (!reviewId || !action) {
            return NextResponse.json(
                { error: "Missing reviewId or action" },
                { status: 400 }
            );
        }

        if (!["approve", "reject", "edit"].includes(action)) {
            return NextResponse.json(
                { error: "Invalid action. Must be approve, reject, or edit" },
                { status: 400 }
            );
        }

        // Get the review item
        const existing = await db
            .select()
            .from(CONTENT_REVIEW_TABLE)
            .where(eq(CONTENT_REVIEW_TABLE.id, reviewId));

        if (existing.length === 0) {
            return NextResponse.json(
                { error: "Review item not found" },
                { status: 404 }
            );
        }

        const review = existing[0];

        // TUTOR PERMISSION CHECK
        // Tutors can approve/edit/reject any content in the review queue.
        // For courses with specific tutor assignments, respect granular permissions.
        if (auth.admin.role === 'tutor') {
            const assignment = await db
                .select()
                .from(TUTOR_ASSIGNMENT_TABLE)
                .where(and(
                    eq(TUTOR_ASSIGNMENT_TABLE.adminId, auth.admin.id),
                    eq(TUTOR_ASSIGNMENT_TABLE.courseId, review.courseId)
                ));

            // If tutor has a specific assignment, respect its permissions
            if (assignment.length > 0) {
                const perms = assignment[0];

                if (action === 'edit' && !perms.canEdit) {
                    return NextResponse.json(
                        { error: "You don't have edit permission for this course" },
                        { status: 403 }
                    );
                }

                if (action === 'approve' && !perms.canApprove) {
                    return NextResponse.json(
                        { error: "You don't have approve permission. An admin must approve this." },
                        { status: 403 }
                    );
                }
            }
            // If no assignment exists, tutor can still review (approve/edit/reject)
        }

        // Map action to status
        const statusMap = {
            approve: "approved",
            reject: "rejected",
            edit: "edited",
        };

        // Update the review record
        const updateData = {
            status: statusMap[action],
            reviewedBy: auth.admin.email,
            reviewNotes: reviewNotes || null,
            reviewedAt: new Date(),
            updatedAt: new Date(),
        };

        if (action === "edit" && editedContent) {
            updateData.editedContent = editedContent;
        }

        await db
            .update(CONTENT_REVIEW_TABLE)
            .set(updateData)
            .where(eq(CONTENT_REVIEW_TABLE.id, reviewId));

        // If approved or edited, apply changes to the actual content
        if (action === "approve" || action === "edit") {
            const contentToApply = action === "edit" ? editedContent : review.originalContent;
            await applyContentChanges(review.courseId, review.contentType, review.contentId, contentToApply);

            // Check if ALL review items for this course are now approved/edited
            // If so, publish the course by setting status to 'Ready'
            const pendingReviews = await db
                .select({ id: CONTENT_REVIEW_TABLE.id })
                .from(CONTENT_REVIEW_TABLE)
                .where(and(
                    eq(CONTENT_REVIEW_TABLE.courseId, review.courseId),
                    eq(CONTENT_REVIEW_TABLE.status, "pending")
                ))
                .limit(1);

            if (pendingReviews.length === 0) {
                // No more pending reviews — publish the course
                await db
                    .update(STUDY_MATERIAL_TABLE)
                    .set({ status: "Ready" })
                    .where(eq(STUDY_MATERIAL_TABLE.courseId, review.courseId));
            }
        }

        // Log the admin action
        await db.insert(ADMIN_ACTIVITY_LOG_TABLE).values({
            adminEmail: auth.admin.email,
            action: `content_review_${action}`,
            targetType: "content_review",
            targetId: String(reviewId),
            details: {
                contentType: review.contentType,
                courseId: review.courseId,
                reviewNotes,
                hadEdits: action === "edit",
            },
            courseId: review.courseId,
            createdAt: new Date(),
        });

        return NextResponse.json({
            success: true,
            message: `Content ${statusMap[action]} successfully`,
        });
    } catch (error) {
        console.error("Content Review POST Error:", error);
        return NextResponse.json(
            { error: "Failed to process review action" },
            { status: 500 }
        );
    }
}

/**
 * Apply approved/edited content to the actual tables
 */
async function applyContentChanges(courseId, contentType, contentId, content) {
    try {
        switch (contentType) {
            case "course_outline":
                await db
                    .update(STUDY_MATERIAL_TABLE)
                    .set({ courseLayout: content })
                    .where(eq(STUDY_MATERIAL_TABLE.courseId, courseId));
                break;

            case "notes":
                if (contentId) {
                    await db
                        .update(CHAPTER_NOTES_TABLE)
                        .set({ notes: typeof content === "string" ? content : JSON.stringify(content) })
                        .where(
                            and(
                                eq(CHAPTER_NOTES_TABLE.courseId, courseId),
                                eq(CHAPTER_NOTES_TABLE.chapterId, parseInt(contentId))
                            )
                        );
                }
                break;

            case "flashcards":
            case "quiz":
            case "mcq": {
                // DB stores: 'Flashcard', 'Quiz', 'Question/Answer', 'MCQ', 'qa'
                // Try all possible type names for the contentType
                const possibleTypes = {
                    flashcards: ["Flashcard"],
                    quiz: ["Quiz", "Question/Answer", "qa"],
                    mcq: ["MCQ"],
                };
                const types = possibleTypes[contentType] || [contentType];
                
                for (const typeName of types) {
                    const existing = await db
                        .select({ id: STUDY_TYPE_CONTENT_TABLE.id })
                        .from(STUDY_TYPE_CONTENT_TABLE)
                        .where(
                            and(
                                eq(STUDY_TYPE_CONTENT_TABLE.courseId, courseId),
                                eq(STUDY_TYPE_CONTENT_TABLE.type, typeName)
                            )
                        );
                    if (existing.length > 0) {
                        await db
                            .update(STUDY_TYPE_CONTENT_TABLE)
                            .set({ content, status: 'Ready' })
                            .where(
                                and(
                                    eq(STUDY_TYPE_CONTENT_TABLE.courseId, courseId),
                                    eq(STUDY_TYPE_CONTENT_TABLE.type, typeName)
                                )
                            );
                        break;
                    }
                }
                break;
            }

            default:
                console.warn("Unknown content type for applying changes:", contentType);
        }
    } catch (error) {
        console.error("Error applying content changes:", error);
        throw error;
    }
}
