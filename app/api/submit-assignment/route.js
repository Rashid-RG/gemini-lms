import { db } from "@/configs/db";
import { ASSIGNMENT_SUBMISSIONS_TABLE, COURSE_ASSIGNMENTS_TABLE } from "@/configs/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { inngest } from "@/inngest/client";

/**
 * GET /api/submit-assignment?assignmentId=xyz&studentEmail=abc@example.com
 * Get submission status
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

    try {
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

      // Safely parse JSON fields if they exist
      const result = submission[0];
      if (result.strengths && typeof result.strengths === 'string') {
        try {
          result.strengths = JSON.parse(result.strengths);
        } catch (e) {
          result.strengths = [];
        }
      }
      if (result.improvements && typeof result.improvements === 'string') {
        try {
          result.improvements = JSON.parse(result.improvements);
        } catch (e) {
          result.improvements = [];
        }
      }
      if (result.metadata && typeof result.metadata === 'string') {
        try {
          result.metadata = JSON.parse(result.metadata);
        } catch (e) {
          result.metadata = {};
        }
      }

      return NextResponse.json({ result }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
    } catch (dbErr) {
      console.error("Database Query Error:", dbErr.message);
      // If column doesn't exist, return basic submission without new fields
      const basicSubmission = await db
        .select()
        .from(ASSIGNMENT_SUBMISSIONS_TABLE)
        .where(
          and(
            eq(ASSIGNMENT_SUBMISSIONS_TABLE.assignmentId, assignmentId),
            eq(ASSIGNMENT_SUBMISSIONS_TABLE.studentEmail, studentEmail)
          )
        )
        .limit(1);

      if (basicSubmission.length === 0) {
        return NextResponse.json({ result: null });
      }

      return NextResponse.json({ result: basicSubmission[0] }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
    }
  } catch (err) {
    console.error("Submission Fetch Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch submission", details: err.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/submit-assignment
 * Submit assignment and trigger AI grading
 */
export async function POST(req) {
  try {
    const { assignmentId, courseId, studentEmail, submission, submissionType, language } = await req.json();

    if (!assignmentId || !courseId || !studentEmail || !submission) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }


    // Due date check temporarily disabled for development
    // TODO: Re-enable due date enforcement in production
    /*
    // Check assignment due date (optional - allow submission if no due date set)
    const assignment = await db.select().from(COURSE_ASSIGNMENTS_TABLE)
      .where(eq(COURSE_ASSIGNMENTS_TABLE.assignmentId, assignmentId));
    
    // Allow submission if assignment not found (legacy assignments) or no due date
    if (assignment[0]?.dueDate) {
      const now = new Date();
      const dueDate = new Date(assignment[0].dueDate);
      
      // Check if assignment is locked for this student
      if (now > dueDate) {
        const submissionRecord = await db.select().from(ASSIGNMENT_SUBMISSIONS_TABLE)
          .where(and(
            eq(ASSIGNMENT_SUBMISSIONS_TABLE.assignmentId, assignmentId),
            eq(ASSIGNMENT_SUBMISSIONS_TABLE.studentEmail, studentEmail)
          ));
        // Only allow if status is 'Unlocked'
        if (!submissionRecord[0] || submissionRecord[0].status !== 'Unlocked') {
          return NextResponse.json({ error: "Assignment is locked. Due date has passed." }, { status: 403 });
        }
      }
    }
    */

    // ...existing code for submission logic...
    // Check if submission already exists
    const existing = await db
      .select()
      .from(ASSIGNMENT_SUBMISSIONS_TABLE)
      .where(
        and(
          eq(ASSIGNMENT_SUBMISSIONS_TABLE.assignmentId, assignmentId),
          eq(ASSIGNMENT_SUBMISSIONS_TABLE.studentEmail, studentEmail)
        )
      );

    let result;
    // Try with all fields, fall back to basic fields if schema mismatch
    try {
      const submissionData = {
        submission,
        submissionType: submissionType || 'text',
        language: language || null,
        metadata: JSON.stringify({
          lineCount: submission.split('\n').length,
          charCount: submission.length,
          submittedType: submissionType
        }),
        submittedAt: new Date(),
        status: "Submitted",
      };

      if (existing.length > 0) {
        result = await db
          .update(ASSIGNMENT_SUBMISSIONS_TABLE)
          .set(submissionData)
          .where(
            and(
              eq(ASSIGNMENT_SUBMISSIONS_TABLE.assignmentId, assignmentId),
              eq(ASSIGNMENT_SUBMISSIONS_TABLE.studentEmail, studentEmail)
            )
          )
          .returning();
      } else {
        result = await db
          .insert(ASSIGNMENT_SUBMISSIONS_TABLE)
          .values({
            assignmentId,
            courseId,
            studentEmail,
            ...submissionData
          })
          .returning();
      }
    } catch (schemaErr) {
      // Fallback: use only basic fields that definitely exist
      console.warn("Schema mismatch, using basic fields:", schemaErr.message);
      
      const basicData = {
        submission,
        submittedAt: new Date(),
        status: "Submitted",
      };

      if (existing.length > 0) {
        result = await db
          .update(ASSIGNMENT_SUBMISSIONS_TABLE)
          .set(basicData)
          .where(
            and(
              eq(ASSIGNMENT_SUBMISSIONS_TABLE.assignmentId, assignmentId),
              eq(ASSIGNMENT_SUBMISSIONS_TABLE.studentEmail, studentEmail)
            )
          )
          .returning();
      } else {
        result = await db
          .insert(ASSIGNMENT_SUBMISSIONS_TABLE)
          .values({
            assignmentId,
            courseId,
            studentEmail,
            ...basicData
          })
          .returning();
      }
    }

    // Trigger Inngest function for AI grading
    try {
      inngest.send({
        name: "assignment.grade",
        data: {
          submission: result[0],
        },
      });
    } catch (inngestErr) {
      console.error("Inngest Error:", inngestErr.message);
      // Don't fail the submission if Inngest fails
    }

    return NextResponse.json({ 
      result: result[0],
      message: "Assignment submitted. AI grading in progress..."
    });
  } catch (err) {
    console.error("Submission Error:", err.message);
    return NextResponse.json(
      { error: "Failed to submit assignment", details: err.message },
      { status: 500 }
    );
  }
}
