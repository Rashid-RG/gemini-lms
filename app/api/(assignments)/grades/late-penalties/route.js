import { db } from "@/configs/db";
import {
  LATE_SUBMISSION_PENALTIES_TABLE,
  COURSE_ASSIGNMENTS_TABLE,
  ASSIGNMENT_SUBMISSIONS_TABLE,
  GRADE_HISTORY_TABLE,
  STUDY_MATERIAL_TABLE,
} from "@/configs/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * POST /api/grades/late-penalties
 * Create a late submission penalty policy for an assignment
 */
export async function POST(req) {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const instructorEmail = sessionClaims?.email;
    const body = await req.json();
    const {
      assignmentId,
      courseId,
      penaltyType,
      penaltyValue,
      penaltyPeriod = "per_day",
      maxPenalty,
      gracePeriodMinutes = 0,
    } = body;

    if (!assignmentId || !courseId || !penaltyType || penaltyValue === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify instructor owns the course
    const course = await db
      .select()
      .from(STUDY_MATERIAL_TABLE)
      .where(eq(STUDY_MATERIAL_TABLE.courseId, courseId));

    if (!course.length || course[0].createdBy !== instructorEmail) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Check if penalty already exists
    const existing = await db
      .select()
      .from(LATE_SUBMISSION_PENALTIES_TABLE)
      .where(
        and(
          eq(LATE_SUBMISSION_PENALTIES_TABLE.assignmentId, assignmentId),
          eq(LATE_SUBMISSION_PENALTIES_TABLE.courseId, courseId)
        )
      );

    let result;
    if (existing.length) {
      // Update existing
      result = await db
        .update(LATE_SUBMISSION_PENALTIES_TABLE)
        .set({
          penaltyType,
          penaltyValue,
          penaltyPeriod,
          maxPenalty,
          gracePeriodMinutes,
          updatedAt: new Date(),
        })
        .where(eq(LATE_SUBMISSION_PENALTIES_TABLE.id, existing[0].id))
        .returning();
    } else {
      // Create new
      result = await db
        .insert(LATE_SUBMISSION_PENALTIES_TABLE)
        .values({
          assignmentId,
          courseId,
          penaltyType,
          penaltyValue,
          penaltyPeriod,
          maxPenalty,
          gracePeriodMinutes,
          createdBy: instructorEmail,
        })
        .returning();
    }

    return NextResponse.json({ result: result[0] });
  } catch (error) {
    console.error("Error creating late penalty:", error);
    return NextResponse.json(
      { error: "Failed to create late penalty" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/grades/late-penalties?assignmentId=xxx&courseId=xxx
 * Get late penalty policy for an assignment
 */
export async function GET(req) {
  try {
    const url = new URL(req.url);
    const assignmentId = url.searchParams.get("assignmentId");
    const courseId = url.searchParams.get("courseId");

    if (!assignmentId || !courseId) {
      return NextResponse.json(
        { error: "assignmentId and courseId are required" },
        { status: 400 }
      );
    }

    const penalty = await db
      .select()
      .from(LATE_SUBMISSION_PENALTIES_TABLE)
      .where(
        and(
          eq(LATE_SUBMISSION_PENALTIES_TABLE.assignmentId, assignmentId),
          eq(LATE_SUBMISSION_PENALTIES_TABLE.courseId, courseId)
        )
      );

    return NextResponse.json({ result: penalty[0] || null });
  } catch (error) {
    console.error("Error fetching late penalty:", error);
    return NextResponse.json(
      { result: null },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/grades/late-penalties/calculate
 * Calculate and apply late submission penalties
 */
export async function PUT(req) {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const instructorEmail = sessionClaims?.email;
    const body = await req.json();
    const { assignmentId, courseId } = body;

    if (!assignmentId || !courseId) {
      return NextResponse.json(
        { error: "assignmentId and courseId are required" },
        { status: 400 }
      );
    }

    // Verify instructor owns the course
    const course = await db
      .select()
      .from(STUDY_MATERIAL_TABLE)
      .where(eq(STUDY_MATERIAL_TABLE.courseId, courseId));

    if (!course.length || course[0].createdBy !== instructorEmail) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Get penalty policy
    const penalty = await db
      .select()
      .from(LATE_SUBMISSION_PENALTIES_TABLE)
      .where(
        and(
          eq(LATE_SUBMISSION_PENALTIES_TABLE.assignmentId, assignmentId),
          eq(LATE_SUBMISSION_PENALTIES_TABLE.courseId, courseId)
        )
      );

    if (!penalty.length || !penalty[0].isEnabled) {
      return NextResponse.json(
        { error: "No active penalty policy" },
        { status: 404 }
      );
    }

    const penaltyPolicy = penalty[0];

    // Get assignment details
    const assignment = await db
      .select()
      .from(COURSE_ASSIGNMENTS_TABLE)
      .where(
        and(
          eq(COURSE_ASSIGNMENTS_TABLE.assignmentId, assignmentId),
          eq(COURSE_ASSIGNMENTS_TABLE.courseId, courseId)
        )
      );

    if (!assignment.length) {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 }
      );
    }

    const dueDate = assignment[0].dueDate;
    if (!dueDate) {
      return NextResponse.json(
        { error: "Assignment has no due date" },
        { status: 400 }
      );
    }

    // Get all submissions for the assignment
    const submissions = await db
      .select()
      .from(ASSIGNMENT_SUBMISSIONS_TABLE)
      .where(
        and(
          eq(ASSIGNMENT_SUBMISSIONS_TABLE.assignmentId, assignmentId),
          eq(ASSIGNMENT_SUBMISSIONS_TABLE.courseId, courseId)
        )
      );

    let appliedCount = 0;

    // Apply penalties to late submissions
    for (const submission of submissions) {
      if (submission.submittedAt <= dueDate) {
        continue; // Not late
      }

      // Calculate hours/days late
      const minutesLate = (submission.submittedAt - dueDate) / (1000 * 60);
      
      // Apply grace period
      if (minutesLate <= penaltyPolicy.gracePeriodMinutes) {
        continue; // Within grace period
      }

      const adjustedMinutesLate = minutesLate - penaltyPolicy.gracePeriodMinutes;

      // Calculate penalty amount
      let penaltyAmount = 0;
      if (penaltyPolicy.penaltyType === "percentage_deduction") {
        if (penaltyPolicy.penaltyPeriod === "per_day") {
          const daysLate = Math.ceil(adjustedMinutesLate / (24 * 60));
          penaltyAmount = (submission.score * penaltyPolicy.penaltyValue * daysLate) / 100;
        } else if (penaltyPolicy.penaltyPeriod === "per_hour") {
          const hoursLate = Math.ceil(adjustedMinutesLate / 60);
          penaltyAmount = (submission.score * penaltyPolicy.penaltyValue * hoursLate) / 100;
        } else {
          penaltyAmount = (submission.score * penaltyPolicy.penaltyValue) / 100;
        }
      } else if (penaltyPolicy.penaltyType === "points_deduction") {
        if (penaltyPolicy.penaltyPeriod === "per_day") {
          const daysLate = Math.ceil(adjustedMinutesLate / (24 * 60));
          penaltyAmount = penaltyPolicy.penaltyValue * daysLate;
        } else if (penaltyPolicy.penaltyPeriod === "per_hour") {
          const hoursLate = Math.ceil(adjustedMinutesLate / 60);
          penaltyAmount = penaltyPolicy.penaltyValue * hoursLate;
        } else {
          penaltyAmount = penaltyPolicy.penaltyValue;
        }
      }

      // Cap penalty at max if specified
      if (penaltyPolicy.maxPenalty) {
        penaltyAmount = Math.min(penaltyAmount, penaltyPolicy.maxPenalty);
      }

      const oldScore = submission.score;
      const newScore = Math.max(0, oldScore - penaltyAmount);

      // Update submission
      if (newScore !== oldScore) {
        await db
          .update(ASSIGNMENT_SUBMISSIONS_TABLE)
          .set({
            score: Math.round(newScore),
            feedback: (submission.feedback || "") + `\n[System] Late submission penalty applied: -${penaltyAmount.toFixed(2)} points`,
            updatedAt: new Date(),
          })
          .where(eq(ASSIGNMENT_SUBMISSIONS_TABLE.id, submission.id));

        // Record in history
        await db
          .insert(GRADE_HISTORY_TABLE)
          .values({
            courseId,
            studentEmail: submission.studentEmail,
            assessmentType: "assignment",
            assessmentId: assignmentId,
            oldScore: oldScore,
            newScore: Math.round(newScore),
            changedBy: "system",
            reason: "late_penalty",
            details: {
              minutesLate: Math.round(minutesLate),
              penaltyAmount: penaltyAmount.toFixed(2),
              policyType: penaltyPolicy.penaltyType,
            },
          });

        appliedCount++;
      }
    }

    return NextResponse.json({
      result: {
        success: true,
        message: `Late penalties applied to ${appliedCount} submissions`,
        appliedCount,
      },
    });
  } catch (error) {
    console.error("Error calculating late penalties:", error);
    return NextResponse.json(
      { error: "Failed to calculate late penalties" },
      { status: 500 }
    );
  }
}
