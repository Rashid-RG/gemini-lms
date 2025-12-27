import { db } from "../configs/db";
import { COURSE_ASSIGNMENTS_TABLE } from "../configs/schema";

async function updateDueDates() {
  // Get all assignments
  const assignments = await db.select().from(COURSE_ASSIGNMENTS_TABLE);
  
  // Set due date to 1 month from now for all assignments
  const dueDate = new Date();
  dueDate.setMonth(dueDate.getMonth() + 1);
  
  for (const assignment of assignments) {
    await db.update(COURSE_ASSIGNMENTS_TABLE)
      .set({ dueDate })
      .where(eq(COURSE_ASSIGNMENTS_TABLE.assignmentId, assignment.assignmentId));
    console.log(`Updated assignment ${assignment.assignmentId} due date to ${dueDate.toLocaleDateString()}`);
  }
  
  console.log(`\nAll ${assignments.length} assignment due dates updated to ${dueDate.toLocaleDateString()}`);
}

import { eq } from "drizzle-orm";
updateDueDates().then(() => process.exit(0));