import { db } from "@/configs/db";
import { LEADERBOARD_TABLE, STUDENT_PROGRESS_TABLE } from "@/configs/schema";
import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

// POST: Update leaderboard for a user
export async function POST(req) {
  try {
    const { studentEmail, studentName, totalCoursesCompleted, totalPoints, averageRating, isAnonymous } = await req.json();

    if (!studentEmail) {
      return NextResponse.json(
        { error: "studentEmail is required" },
        { status: 400 }
      );
    }

    // Get all leaderboard entries to calculate rank
    const allEntries = await db
      .select()
      .from(LEADERBOARD_TABLE)
      .orderBy(desc(LEADERBOARD_TABLE.totalPoints));

    const existingEntry = allEntries.find((e) => e.studentEmail === studentEmail);
    const newRank = existingEntry 
      ? allEntries.findIndex((e) => e.studentEmail === studentEmail) + 1
      : allEntries.length + 1;

    // Assign badge
    let badge = null;
    if (newRank === 1) badge = "gold";
    else if (newRank === 2) badge = "silver";
    else if (newRank === 3) badge = "bronze";

    let result;
    if (existingEntry) {
      result = await db
        .update(LEADERBOARD_TABLE)
        .set({
          studentName: studentName || existingEntry.studentName,
          totalCoursesCompleted: totalCoursesCompleted || existingEntry.totalCoursesCompleted,
          totalPoints: totalPoints || existingEntry.totalPoints,
          averageRating: averageRating || existingEntry.averageRating,
          badge,
          isAnonymous: isAnonymous !== undefined ? isAnonymous : existingEntry.isAnonymous,
          rank: newRank,
          updatedAt: new Date()
        })
        .where(eq(LEADERBOARD_TABLE.studentEmail, studentEmail))
        .returning();
    } else {
      result = await db
        .insert(LEADERBOARD_TABLE)
        .values({
          studentEmail,
          studentName: studentName || studentEmail,
          totalCoursesCompleted: totalCoursesCompleted || 0,
          totalPoints: totalPoints || 0,
          averageRating: averageRating || "0",
          badge,
          isAnonymous: isAnonymous || false,
          rank: newRank
        })
        .returning();
    }

    return NextResponse.json({
      message: "Leaderboard updated",
      result: result[0]
    });
  } catch (error) {
    console.error("Error updating leaderboard:", error);
    return NextResponse.json(
      { error: "Failed to update leaderboard" },
      { status: 500 }
    );
  }
}

// GET: Fetch leaderboard
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit")) || 50;
    const includeAnonymous = searchParams.get("includeAnonymous") === "true";

    let query = await db
      .select()
      .from(LEADERBOARD_TABLE)
      .orderBy(desc(LEADERBOARD_TABLE.totalPoints))
      .limit(limit);

    // Filter out anonymous entries if requested
    if (!includeAnonymous) {
      query = query.filter((entry) => !entry.isAnonymous);
    }

    // Mask anonymous entries
    const leaderboard = query.map((entry) => ({
      ...entry,
      studentName: entry.isAnonymous ? "Anonymous Learner" : entry.studentName
    }));

    return NextResponse.json({ result: leaderboard });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
