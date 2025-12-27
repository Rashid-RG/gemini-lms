import { db } from "@/configs/db";
import { COURSE_ASSIGNMENTS_TABLE, ASSIGNMENT_SUBMISSIONS_TABLE } from "@/configs/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { inngest } from "@/inngest/client";
import { v4 as uuidv4 } from "uuid";

/**
 * GET /api/course-assignments?courseId=xyz
 * Get all assignments for a course
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId");

    if (!courseId) {
      return NextResponse.json(
        { error: "Missing courseId" },
        { status: 400 }
      );
    }

    const assignments = await db
      .select()
      .from(COURSE_ASSIGNMENTS_TABLE)
      .where(eq(COURSE_ASSIGNMENTS_TABLE.courseId, courseId));

    return NextResponse.json({ result: assignments });
  } catch (err) {
    console.error("Assignments Fetch Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch assignments" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/course-assignments
 * Create new assignments for a course (called by AI generation)
 */
export async function POST(req) {
  try {
    const { courseId, assignments } = await req.json();

    if (!courseId || !assignments || assignments.length === 0) {
      return NextResponse.json(
        { error: "Missing courseId or assignments" },
        { status: 400 }
      );
    }

    const results = [];
    for (const assignment of assignments) {
      const assignmentId = uuidv4();
      // Get course creation date
      const course = await db.select().from(STUDY_MATERIAL_TABLE)
        .where(eq(STUDY_MATERIAL_TABLE.courseId, courseId));
      const courseCreatedAt = course[0]?.createdAt ? new Date(course[0].createdAt) : new Date();

      // Get latest student enrollment date for this course
      const progresses = await db.select().from(STUDENT_PROGRESS_TABLE)
        .where(eq(STUDENT_PROGRESS_TABLE.courseId, courseId));
      let latestStartedAt = courseCreatedAt;
      for (const progress of progresses) {
        const startedAt = progress?.startedAt ? new Date(progress.startedAt) : null;
        if (startedAt && startedAt > latestStartedAt) {
          latestStartedAt = startedAt;
        }
      }
      // Set due date to 1 month after the later of courseCreatedAt or latestStartedAt
      const dueDate = new Date(latestStartedAt);
      dueDate.setMonth(dueDate.getMonth() + 1);

      const result = await db
        .insert(COURSE_ASSIGNMENTS_TABLE)
        .values({
          courseId,
          assignmentId,
          title: assignment.title,
          description: assignment.description,
          totalPoints: assignment.totalPoints || 100,
          rubric: JSON.stringify(assignment.rubric || {}),
          dueDate,
        })
        .returning();
      results.push(result[0]);
    }

    return NextResponse.json({ result: results });
  } catch (err) {
    console.error("Assignment Creation Error:", err);
    return NextResponse.json(
      { error: "Failed to create assignments" },
      { status: 500 }
    );
  }
}
