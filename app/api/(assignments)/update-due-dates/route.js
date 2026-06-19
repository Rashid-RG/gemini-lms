import { db } from "@/configs/db";
import { COURSE_ASSIGNMENTS_TABLE } from "@/configs/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

/**
 * GET /api/update-due-dates
 * Updates all assignment due dates to 1 month from now (easy browser access)
 */
export async function GET(req) {
  return updateDueDates();
}

/**
 * POST /api/update-due-dates
 * Updates all assignment due dates to 1 month from now
 */
export async function POST(req) {
  return updateDueDates();
}

async function updateDueDates() {
  try {
    // Get all assignments
    const assignments = await db.select().from(COURSE_ASSIGNMENTS_TABLE);
    
    // Set due date to 1 month from now
    const dueDate = new Date();
    dueDate.setMonth(dueDate.getMonth() + 1);
    
    let updated = 0;
    for (const assignment of assignments) {
      await db.update(COURSE_ASSIGNMENTS_TABLE)
        .set({ dueDate })
        .where(eq(COURSE_ASSIGNMENTS_TABLE.assignmentId, assignment.assignmentId));
      updated++;
    }
    
    return NextResponse.json({ 
      success: true,
      message: `Updated ${updated} assignments`,
      newDueDate: dueDate.toISOString(),
      newDueDateFormatted: dueDate.toLocaleDateString()
    });
  } catch (err) {
    console.error("Update Due Dates Error:", err);
    return NextResponse.json(
      { error: "Failed to update due dates", details: err.message },
      { status: 500 }
    );
  }
}
