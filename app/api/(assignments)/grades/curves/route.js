import { db } from "@/configs/db";
import { GRADE_CURVES_TABLE, STUDENT_PROGRESS_TABLE, GRADE_HISTORY_TABLE, STUDY_MATERIAL_TABLE } from "@/configs/schema";
import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * POST /api/grades/curves
 * Create or update a grade curve for a course
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
      courseId,
      curveType,
      curveValue,
      appliedTo = "all_students",
      threshold,
      description,
    } = body;

    if (!courseId || !curveType || curveValue === undefined) {
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

    // Check if curve already exists
    const existing = await db
      .select()
      .from(GRADE_CURVES_TABLE)
      .where(eq(GRADE_CURVES_TABLE.courseId, courseId));

    let result;
    if (existing.length) {
      // Update existing
      result = await db
        .update(GRADE_CURVES_TABLE)
        .set({
          curveType,
          curveValue,
          appliedTo,
          threshold,
          description,
          updatedAt: new Date(),
        })
        .where(eq(GRADE_CURVES_TABLE.courseId, courseId))
        .returning();
    } else {
      // Create new
      result = await db
        .insert(GRADE_CURVES_TABLE)
        .values({
          courseId,
          curveType,
          curveValue,
          appliedTo,
          threshold,
          description,
          isActive: false,
          appliedBy: instructorEmail,
        })
        .returning();
    }

    return NextResponse.json({ result: result[0] });
  } catch (error) {
    console.error("Error creating grade curve:", error);
    return NextResponse.json(
      { error: "Failed to create grade curve" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/grades/curves?courseId=xxx
 * Get grade curve for a course
 */
export async function GET(req) {
  try {
    const url = new URL(req.url);
    const courseId = url.searchParams.get("courseId");

    if (!courseId) {
      return NextResponse.json(
        { error: "courseId is required" },
        { status: 400 }
      );
    }

    const curve = await db
      .select()
      .from(GRADE_CURVES_TABLE)
      .where(eq(GRADE_CURVES_TABLE.courseId, courseId));

    return NextResponse.json({ result: curve[0] || null });
  } catch (error) {
    console.error("Error fetching grade curve:", error);
    return NextResponse.json(
      { result: null },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/grades/curves/apply
 * Apply a grade curve to all students
 */
export async function PUT(req) {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const instructorEmail = sessionClaims?.email;
    const body = await req.json();
    const { courseId } = body;

    if (!courseId) {
      return NextResponse.json(
        { error: "courseId is required" },
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

    // Get the curve
    const curve = await db
      .select()
      .from(GRADE_CURVES_TABLE)
      .where(eq(GRADE_CURVES_TABLE.courseId, courseId));

    if (!curve.length) {
      return NextResponse.json(
        { error: "No grade curve found" },
        { status: 404 }
      );
    }

    const gradeData = curve[0];

    // Get all students in the course
    const students = await db
      .select()
      .from(STUDENT_PROGRESS_TABLE)
      .where(eq(STUDENT_PROGRESS_TABLE.courseId, courseId));

    // Apply curve to each student
    for (const student of students) {
      const oldScore = student.finalScore || 0;
      let newScore = oldScore;

      // Apply curve based on type
      if (gradeData.curveType === "flat_bonus") {
        newScore = Math.min(100, oldScore + gradeData.curveValue);
      } else if (gradeData.curveType === "percentage_increase") {
        newScore = Math.min(100, oldScore + (oldScore * gradeData.curveValue) / 100);
      } else if (gradeData.curveType === "scale_compression") {
        // Scale lower grades more generously
        if (oldScore < 60) {
          newScore = oldScore + gradeData.curveValue;
        }
      }

      // Check threshold if applicable
      if (gradeData.appliedTo === "below_threshold" && oldScore >= gradeData.threshold) {
        newScore = oldScore;
      }

      // Update student progress if score changed
      if (newScore !== oldScore) {
        await db
          .update(STUDENT_PROGRESS_TABLE)
          .set({
            finalScore: Math.round(newScore),
            updatedAt: new Date(),
          })
          .where(eq(STUDENT_PROGRESS_TABLE.id, student.id));

        // Record in history
        await db
          .insert(GRADE_HISTORY_TABLE)
          .values({
            courseId,
            studentEmail: student.studentEmail,
            assessmentType: "overall",
            oldScore: oldScore,
            newScore: Math.round(newScore),
            changedBy: instructorEmail,
            reason: "curve_applied",
            details: {
              curveType: gradeData.curveType,
              curveValue: gradeData.curveValue,
            },
          });
      }
    }

    // Mark curve as active
    await db
      .update(GRADE_CURVES_TABLE)
      .set({
        isActive: true,
        appliedAt: new Date(),
      })
      .where(eq(GRADE_CURVES_TABLE.courseId, courseId));

    return NextResponse.json({
      result: {
        success: true,
        message: `Grade curve applied to ${students.length} students`,
      },
    });
  } catch (error) {
    console.error("Error applying grade curve:", error);
    return NextResponse.json(
      { error: "Failed to apply grade curve" },
      { status: 500 }
    );
  }
}
