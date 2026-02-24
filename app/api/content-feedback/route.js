import { db } from "@/configs/db";
import { CONTENT_FEEDBACK_TABLE, CONTENT_REVIEW_TABLE, STUDY_MATERIAL_TABLE } from "@/configs/schema";
import { eq, and, desc } from "drizzle-orm";
import { NextResponse } from "next/server";

/**
 * POST /api/content-feedback
 * Student reports an issue with AI-generated content
 */
export async function POST(req) {
    try {
        const { courseId, contentType, contentId, studentEmail, issueType, description, specificContent } = await req.json();

        // Validate required fields
        if (!courseId || !contentType || !studentEmail || !issueType || !description) {
            return NextResponse.json(
                { error: "Missing required fields: courseId, contentType, studentEmail, issueType, description" },
                { status: 400 }
            );
        }

        // Validate issueType
        const validIssueTypes = ["inaccurate", "unclear", "incomplete", "wrong_answer", "inappropriate", "other"];
        if (!validIssueTypes.includes(issueType)) {
            return NextResponse.json(
                { error: "Invalid issueType. Must be one of: " + validIssueTypes.join(", ") },
                { status: 400 }
            );
        }

        // Sanitize description length
        const sanitizedDescription = String(description).slice(0, 2000);
        const sanitizedSpecific = specificContent ? String(specificContent).slice(0, 5000) : null;

        // Check if student already reported this same content recently (prevent spam)
        const recentFeedback = await db
            .select()
            .from(CONTENT_FEEDBACK_TABLE)
            .where(
                and(
                    eq(CONTENT_FEEDBACK_TABLE.courseId, courseId),
                    eq(CONTENT_FEEDBACK_TABLE.contentType, contentType),
                    eq(CONTENT_FEEDBACK_TABLE.studentEmail, studentEmail),
                    eq(CONTENT_FEEDBACK_TABLE.status, "open")
                )
            );

        if (recentFeedback.length >= 5) {
            return NextResponse.json(
                { error: "You have too many open reports for this course. Please wait for existing ones to be reviewed." },
                { status: 429 }
            );
        }

        // Insert feedback
        const result = await db.insert(CONTENT_FEEDBACK_TABLE).values({
            courseId,
            contentType,
            contentId: contentId || null,
            studentEmail,
            issueType,
            description: sanitizedDescription,
            specificContent: sanitizedSpecific,
            status: "open",
            createdAt: new Date(),
        }).returning();

        // Auto-create a review item for ALL student reports
        // Priority is based on issue severity
        const priorityMap = {
            inappropriate: "urgent",
            inaccurate: "high",
            wrong_answer: "high",
            incomplete: "normal",
            unclear: "normal",
            other: "low",
        };
        try {
            // Check if there's already a pending review for this content
            const existingReview = await db
                .select()
                .from(CONTENT_REVIEW_TABLE)
                .where(
                    and(
                        eq(CONTENT_REVIEW_TABLE.courseId, courseId),
                        eq(CONTENT_REVIEW_TABLE.contentType, contentType),
                        eq(CONTENT_REVIEW_TABLE.status, "pending")
                    )
                );

            if (existingReview.length === 0) {
                await db.insert(CONTENT_REVIEW_TABLE).values({
                    courseId,
                    contentType,
                    contentId: contentId || null,
                    status: "pending",
                    priority: priorityMap[issueType] || "normal",
                    flaggedBy: studentEmail,
                    flagReason: `Student reported: ${issueType} - ${sanitizedDescription}`,
                    autoFlagged: false,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });
            } else {
                // Update existing review to higher priority if this report is more urgent
                const currentPriority = existingReview[0].priority;
                const newPriority = priorityMap[issueType] || "normal";
                const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
                if ((priorityOrder[newPriority] ?? 3) < (priorityOrder[currentPriority] ?? 3)) {
                    await db.update(CONTENT_REVIEW_TABLE)
                        .set({
                            priority: newPriority,
                            flagReason: `${existingReview[0].flagReason}\n---\nStudent reported: ${issueType} - ${sanitizedDescription}`,
                            updatedAt: new Date(),
                        })
                        .where(eq(CONTENT_REVIEW_TABLE.id, existingReview[0].id));
                }
            }
        } catch (reviewErr) {
            console.error("Failed to auto-create review (non-fatal):", reviewErr);
        }

        return NextResponse.json({
            success: true,
            message: "Thank you for your feedback! Our team will review this content.",
            feedbackId: result[0]?.id,
        });
    } catch (error) {
        console.error("Content Feedback POST Error:", error);
        return NextResponse.json(
            { error: "Failed to submit feedback" },
            { status: 500 }
        );
    }
}

/**
 * GET /api/content-feedback?courseId=xxx&studentEmail=yyy
 * Get student's own feedback for a course
 */
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const courseId = searchParams.get("courseId");
        const studentEmail = searchParams.get("studentEmail");

        if (!courseId || !studentEmail) {
            return NextResponse.json(
                { error: "Missing courseId or studentEmail" },
                { status: 400 }
            );
        }

        const feedback = await db
            .select()
            .from(CONTENT_FEEDBACK_TABLE)
            .where(
                and(
                    eq(CONTENT_FEEDBACK_TABLE.courseId, courseId),
                    eq(CONTENT_FEEDBACK_TABLE.studentEmail, studentEmail)
                )
            )
            .orderBy(desc(CONTENT_FEEDBACK_TABLE.createdAt));

        return NextResponse.json({ feedback });
    } catch (error) {
        console.error("Content Feedback GET Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch feedback" },
            { status: 500 }
        );
    }
}
