import { db } from "@/configs/db";
import { ASSIGNMENT_SUBMISSIONS_TABLE } from "@/configs/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAdminOrAbove } from "@/lib/adminApiAuth";
import { auth } from "@clerk/nextjs/server";
import { getAuthEmail } from "@/lib/clerkUtils";

// POST /api/assignment-unlock
// Student requests unlock for overdue assignment
export async function POST(req) {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const authEmail = await getAuthEmail(sessionClaims);

    const { assignmentId, courseId, studentEmail, reason } = await req.json();
    if (!assignmentId || !courseId || !studentEmail) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (authEmail !== studentEmail.trim().toLowerCase()) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    // Check if submission record already exists
    const existing = await db.select().from(ASSIGNMENT_SUBMISSIONS_TABLE)
      .where(and(
        eq(ASSIGNMENT_SUBMISSIONS_TABLE.assignmentId, assignmentId),
        eq(ASSIGNMENT_SUBMISSIONS_TABLE.studentEmail, studentEmail)
      ));

    let result;
    if (existing.length > 0) {
      result = await db.update(ASSIGNMENT_SUBMISSIONS_TABLE)
        .set({ 
          status: "UnlockRequested", 
          reviewReason: reason || "" 
        })
        .where(and(
          eq(ASSIGNMENT_SUBMISSIONS_TABLE.assignmentId, assignmentId),
          eq(ASSIGNMENT_SUBMISSIONS_TABLE.studentEmail, studentEmail)
        ))
        .returning();
    } else {
      result = await db.insert(ASSIGNMENT_SUBMISSIONS_TABLE)
        .values({
          assignmentId,
          courseId,
          studentEmail,
          submission: "", // placeholder required text submission
          submissionType: "text",
          status: "UnlockRequested",
          reviewReason: reason || ""
        })
        .returning();
    }
    return NextResponse.json({ result: result[0], message: "Unlock request submitted. Awaiting admin approval." });
  } catch (err) {
    return NextResponse.json({ error: "Failed to submit unlock request", details: err.message }, { status: 500 });
  }
}

// POST /api/assignment-unlock/admin
// Admin approves unlock request
export async function PATCH(req) {
  const authResult = await requireAdminOrAbove();
  if (!authResult.authenticated) return authResult.error;

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