import { db } from "@/configs/db";
import { ASSIGNMENT_SUBMISSIONS_TABLE } from "@/configs/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { inngest } from "@/inngest/client";

/**
 * POST /api/retry-grading
 * Retry AI grading for a submission that's stuck in PendingReview
 */
export async function POST(req) {
  try {
    const { assignmentId, studentEmail } = await req.json();

    if (!assignmentId || !studentEmail) {
      return NextResponse.json(
        { error: "Missing assignmentId or studentEmail" },
        { status: 400 }
      );
    }

    // Get the submission
    const submissions = await db
      .select()
      .from(ASSIGNMENT_SUBMISSIONS_TABLE)
      .where(
        and(
          eq(ASSIGNMENT_SUBMISSIONS_TABLE.assignmentId, assignmentId),
          eq(ASSIGNMENT_SUBMISSIONS_TABLE.studentEmail, studentEmail)
        )
      );

    if (submissions.length === 0) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    const submission = submissions[0];

    // Only allow retry for PendingReview status
    if (submission.status !== 'PendingReview' && submission.status !== 'Submitted') {
      return NextResponse.json(
        { error: `Cannot retry grading for status: ${submission.status}. Only PendingReview or Submitted submissions can be retried.` },
        { status: 400 }
      );
    }

    // Update status to show retry in progress
    await db
      .update(ASSIGNMENT_SUBMISSIONS_TABLE)
      .set({
        status: 'Submitted',
        feedback: 'Retrying AI grading...',
        gradedBy: null,
        gradedAt: null
      })
      .where(eq(ASSIGNMENT_SUBMISSIONS_TABLE.id, submission.id));

    // Trigger Inngest function for AI grading
    await inngest.send({
      name: "assignment.grade",
      data: {
        submission: submission,
      },
    });

    return NextResponse.json({
      success: true,
      message: "AI grading retry initiated. Please wait a moment and refresh the page."
    });
  } catch (err) {
    console.error("Retry Grading Error:", err.message);
    return NextResponse.json(
      { error: "Failed to retry grading", details: err.message },
      { status: 500 }
    );
  }
}
