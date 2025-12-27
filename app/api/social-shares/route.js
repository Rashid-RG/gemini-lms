import { db } from "@/configs/db";
import { SOCIAL_SHARES_TABLE, STUDENT_PROGRESS_TABLE } from "@/configs/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

// POST: Share course completion
export async function POST(req) {
  try {
    const { courseId, studentEmail, shareMessage, isAnonymous } = await req.json();

    if (!courseId || !studentEmail) {
      return NextResponse.json(
        { error: "courseId and studentEmail are required" },
        { status: 400 }
      );
    }

    // Get course progress
    const progress = await db
      .select()
      .from(STUDENT_PROGRESS_TABLE)
      .where(
        and(
          eq(STUDENT_PROGRESS_TABLE.courseId, courseId),
          eq(STUDENT_PROGRESS_TABLE.studentEmail, studentEmail)
        )
      );

    const courseProgress = progress[0] || {};

    // Create share entry
    const result = await db
      .insert(SOCIAL_SHARES_TABLE)
      .values({
        courseId,
        studentEmail,
        shareMessage: shareMessage || "",
        completionPercentage: courseProgress.progressPercentage || 0,
        finalScore: courseProgress.finalScore || 0,
        isAnonymous: isAnonymous || false
      })
      .returning();

    return NextResponse.json({
      message: "Course shared successfully",
      result: result[0]
    });
  } catch (error) {
    console.error("Error sharing course:", error);
    return NextResponse.json(
      { error: "Failed to share course" },
      { status: 500 }
    );
  }
}

// GET: Fetch all course shares
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId");

    let shares;
    if (courseId) {
      shares = await db
        .select()
        .from(SOCIAL_SHARES_TABLE)
        .where(eq(SOCIAL_SHARES_TABLE.courseId, courseId));
    } else {
      shares = await db.select().from(SOCIAL_SHARES_TABLE);
    }

    // Mask private shares
    const publicShares = shares.map((s) => ({
      ...s,
      studentEmail: s.isAnonymous ? "Anonymous Student" : s.studentEmail
    }));

    return NextResponse.json({ result: publicShares });
  } catch (error) {
    console.error("Error fetching shares:", error);
    return NextResponse.json(
      { error: "Failed to fetch shares" },
      { status: 500 }
    );
  }
}
