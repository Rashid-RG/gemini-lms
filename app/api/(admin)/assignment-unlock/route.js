import { db } from "@/configs/db";
import { ASSIGNMENT_SUBMISSIONS_TABLE } from "@/configs/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

// POST /api/assignment-unlock
// Student requests unlock for overdue assignment
export async function POST(req) {
  try {
    const { assignmentId, courseId, studentEmail, reason } = await req.json();
    if (!assignmentId || !courseId || !studentEmail) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    // Mark submission as unlock requested
    const result = await db.update(ASSIGNMENT_SUBMISSIONS_TABLE)
      .set({ status: "UnlockRequested", unlockReason: reason || "" })
      .where(and(
        eq(ASSIGNMENT_SUBMISSIONS_TABLE.assignmentId, assignmentId),
        eq(ASSIGNMENT_SUBMISSIONS_TABLE.studentEmail, studentEmail)
      ))
      .returning();
    return NextResponse.json({ result: result[0], message: "Unlock request submitted. Awaiting admin approval." });
  } catch (err) {
    return NextResponse.json({ error: "Failed to submit unlock request", details: err.message }, { status: 500 });
  }
}

// POST /api/assignment-unlock/admin
// Admin approves unlock request
export async function PATCH(req) {
  try {
    const { assignmentId, courseId, studentEmail, approve } = await req.json();
    if (!assignmentId || !courseId || !studentEmail || typeof approve !== "boolean") {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    // If approved, unlock assignment for this student
    let result;
    if (approve) {
      result = await db.update(ASSIGNMENT_SUBMISSIONS_TABLE)
        .set({ status: "Unlocked" })
        .where(and(
          eq(ASSIGNMENT_SUBMISSIONS_TABLE.assignmentId, assignmentId),
          eq(ASSIGNMENT_SUBMISSIONS_TABLE.studentEmail, studentEmail)
        ))
        .returning();
    } else {
      result = await db.update(ASSIGNMENT_SUBMISSIONS_TABLE)
        .set({ status: "UnlockDenied" })
        .where(and(
          eq(ASSIGNMENT_SUBMISSIONS_TABLE.assignmentId, assignmentId),
          eq(ASSIGNMENT_SUBMISSIONS_TABLE.studentEmail, studentEmail)
        ))
        .returning();
    }
    return NextResponse.json({ result: result[0], message: approve ? "Assignment unlocked." : "Unlock request denied." });
  } catch (err) {
    return NextResponse.json({ error: "Failed to process admin unlock decision", details: err.message }, { status: 500 });
  }
}