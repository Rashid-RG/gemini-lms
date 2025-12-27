import { db } from "@/configs/db";
import { ASSIGNMENT_SUBMISSIONS_TABLE } from "@/configs/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

// POST /api/admin/bulk-unlock-decision
// Admin bulk approves or denies multiple unlock requests
export async function POST(req) {
  try {
    const { requests, approve } = await req.json();

    if (!requests || !Array.isArray(requests) || typeof approve !== "boolean") {
      return NextResponse.json(
        { error: "Missing or invalid requests or approve field" },
        { status: 400 }
      );
    }

    const results = [];
    for (const req of requests) {
      const { assignmentId, courseId, studentEmail } = req;
      if (!assignmentId || !courseId || !studentEmail) continue;

      const newStatus = approve ? "Unlocked" : "UnlockDenied";
      const result = await db
        .update(ASSIGNMENT_SUBMISSIONS_TABLE)
        .set({ status: newStatus })
        .where(
          and(
            eq(ASSIGNMENT_SUBMISSIONS_TABLE.assignmentId, assignmentId),
            eq(ASSIGNMENT_SUBMISSIONS_TABLE.studentEmail, studentEmail)
          )
        )
        .returning();

      results.push(result[0]);
    }

    return NextResponse.json({
      result: results,
      message: `${results.length} unlock requests ${approve ? "approved" : "denied"}.`,
    });
  } catch (err) {
    console.error("Bulk unlock decision error:", err);
    return NextResponse.json(
      { error: "Failed to process bulk unlock decision", details: err.message },
      { status: 500 }
    );
  }
}
