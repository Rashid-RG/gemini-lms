import { db } from "@/configs/db";
import { ASSIGNMENT_SUBMISSIONS_TABLE } from "@/configs/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

/**
 * POST /api/request-review
 * Request manual review for an AI-graded assignment
 */
export async function POST(req) {
  try {
    const { assignmentId, studentEmail, reason } = await req.json();

    if (!assignmentId || !studentEmail) {
      return NextResponse.json(
        { error: "Missing assignmentId or studentEmail" },
        { status: 400 }
      );
    }

    // Find the submission
    const existing = await db
      .select()
      .from(ASSIGNMENT_SUBMISSIONS_TABLE)
      .where(
        and(
          eq(ASSIGNMENT_SUBMISSIONS_TABLE.assignmentId, assignmentId),
          eq(ASSIGNMENT_SUBMISSIONS_TABLE.studentEmail, studentEmail)
        )
      );

    if (existing.length === 0) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    const submission = existing[0];

    // Check if already reviewed or review already requested
    if (submission.reviewRequested) {
      return NextResponse.json(
        { error: "Review already requested for this submission" },
        { status: 400 }
      );
    }

    if (submission.gradedBy !== 'AI') {
      return NextResponse.json(
        { error: "This submission has already been manually reviewed" },
        { status: 400 }
      );
    }

    // Update submission to request review
    const result = await db
      .update(ASSIGNMENT_SUBMISSIONS_TABLE)
      .set({
        reviewRequested: true,
        reviewRequestedAt: new Date(),
        reviewReason: reason || 'Student requested manual review',
        status: 'ReviewRequested',
        originalAiScore: submission.score // Preserve original AI score
      })
      .where(
        and(
          eq(ASSIGNMENT_SUBMISSIONS_TABLE.assignmentId, assignmentId),
          eq(ASSIGNMENT_SUBMISSIONS_TABLE.studentEmail, studentEmail)
        )
      )
      .returning();

    return NextResponse.json({
      success: true,
      message: "Manual review requested successfully. An instructor will review your submission.",
      result: result[0]
    });
  } catch (err) {
    console.error("Request Review Error:", err);
    return NextResponse.json(
      { error: "Failed to request review", details: err.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/request-review?assignmentId=xyz&studentEmail=abc
 * Check review status
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const assignmentId = searchParams.get("assignmentId");
    const studentEmail = searchParams.get("studentEmail");

    if (!assignmentId || !studentEmail) {
      return NextResponse.json(
        { error: "Missing assignmentId or studentEmail" },
        { status: 400 }
      );
    }

    const submission = await db
      .select()
      .from(ASSIGNMENT_SUBMISSIONS_TABLE)
      .where(
        and(
          eq(ASSIGNMENT_SUBMISSIONS_TABLE.assignmentId, assignmentId),
          eq(ASSIGNMENT_SUBMISSIONS_TABLE.studentEmail, studentEmail)
        )
      );

    if (submission.length === 0) {
      return NextResponse.json({ result: null });
    }

    return NextResponse.json({
      result: {
        reviewRequested: submission[0].reviewRequested,
        reviewRequestedAt: submission[0].reviewRequestedAt,
        reviewReason: submission[0].reviewReason,
        reviewedBy: submission[0].reviewedBy,
        reviewedAt: submission[0].reviewedAt,
        gradedBy: submission[0].gradedBy,
        originalAiScore: submission[0].originalAiScore,
        instructorNotes: submission[0].instructorNotes
      }
    });
  } catch (err) {
    console.error("Get Review Status Error:", err);
    return NextResponse.json(
      { error: "Failed to get review status" },
      { status: 500 }
    );
  }
}
