import { db } from "@/configs/db";
import { PARENT_PORTAL_ACCESS_TABLE, STUDENT_PROGRESS_TABLE, STUDY_MATERIAL_TABLE } from "@/configs/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { auth } from "@clerk/nextjs/server";

/**
 * POST /api/grades/parent-portal/grant-access
 * Grant parent access to view student grades
 */
export async function POST(req) {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const studentEmail = sessionClaims?.email;
    const body = await req.json();
    const {
      parentEmail,
      parentName,
      relationshipToStudent = "parent",
      expiresInDays,
    } = body;

    if (!parentEmail || !parentName) {
      return NextResponse.json(
        { error: "parentEmail and parentName are required" },
        { status: 400 }
      );
    }

    // Generate secure access token
    const accessToken = crypto.randomBytes(32).toString("hex");

    // Calculate expiration date if specified
    let expiresAt = null;
    if (expiresInDays) {
      expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
    }

    const result = await db
      .insert(PARENT_PORTAL_ACCESS_TABLE)
      .values({
        parentEmail,
        parentName,
        studentEmail,
        relationshipToStudent,
        accessToken,
        isActive: true,
        grantedBy: studentEmail,
        expiresAt,
      })
      .returning();

    return NextResponse.json({
      result: {
        ...result[0],
        accessUrl: `${process.env.NEXT_PUBLIC_APP_URL}/parent-portal/${accessToken}`,
      },
    });
  } catch (error) {
    console.error("Error granting parent access:", error);
    return NextResponse.json(
      { error: "Failed to grant access" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/grades/parent-portal/verify?token=xxx
 * Verify parent access token
 */
export async function GET(req) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Access token is required" },
        { status: 400 }
      );
    }

    const access = await db
      .select()
      .from(PARENT_PORTAL_ACCESS_TABLE)
      .where(eq(PARENT_PORTAL_ACCESS_TABLE.accessToken, token));

    if (!access.length) {
      return NextResponse.json(
        { error: "Invalid access token" },
        { status: 404 }
      );
    }

    const accessRecord = access[0];

    // Check if active
    if (!accessRecord.isActive) {
      return NextResponse.json(
        { error: "Access has been revoked" },
        { status: 403 }
      );
    }

    // Check if expired
    if (accessRecord.expiresAt && new Date(accessRecord.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: "Access has expired" },
        { status: 403 }
      );
    }

    // Update last accessed
    await db
      .update(PARENT_PORTAL_ACCESS_TABLE)
      .set({ lastAccessedAt: new Date() })
      .where(eq(PARENT_PORTAL_ACCESS_TABLE.id, accessRecord.id));

    // Fetch student's grades
    const studentProgress = await db
      .select()
      .from(STUDENT_PROGRESS_TABLE)
      .where(eq(STUDENT_PROGRESS_TABLE.studentEmail, accessRecord.studentEmail));

    // Get course details
    const coursesData = await Promise.all(
      studentProgress.map(async (progress) => {
        const course = await db
          .select()
          .from(STUDY_MATERIAL_TABLE)
          .where(eq(STUDY_MATERIAL_TABLE.courseId, progress.courseId));

        return {
          courseId: progress.courseId,
          courseName: course[0]?.topic || "Unknown",
          progress: progress.progressPercentage,
          status: progress.status,
          finalScore: progress.finalScore,
          lastActivityAt: progress.lastActivityAt,
        };
      })
    );

    return NextResponse.json({
      result: {
        studentEmail: accessRecord.studentEmail,
        parentName: accessRecord.parentName,
        relationship: accessRecord.relationshipToStudent,
        canViewGrades: accessRecord.canViewGrades,
        canViewAssignments: accessRecord.canViewAssignments,
        canViewProgress: accessRecord.canViewProgress,
        canViewComments: accessRecord.canViewComments,
        courses: coursesData,
      },
    });
  } catch (error) {
    console.error("Error verifying parent access:", error);
    return NextResponse.json(
      { error: "Failed to verify access" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/grades/parent-portal/revoke?id=xxx
 * Revoke parent access
 */
export async function DELETE(req) {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const studentEmail = sessionClaims?.email;
    const url = new URL(req.url);
    const accessId = url.searchParams.get("id");

    if (!accessId) {
      return NextResponse.json(
        { error: "Access ID is required" },
        { status: 400 }
      );
    }

    // Verify student owns this access record
    const access = await db
      .select()
      .from(PARENT_PORTAL_ACCESS_TABLE)
      .where(eq(PARENT_PORTAL_ACCESS_TABLE.id, accessId));

    if (!access.length || access[0].grantedBy !== studentEmail) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Revoke access
    await db
      .update(PARENT_PORTAL_ACCESS_TABLE)
      .set({ isActive: false })
      .where(eq(PARENT_PORTAL_ACCESS_TABLE.id, accessId));

    return NextResponse.json({ result: { success: true } });
  } catch (error) {
    console.error("Error revoking access:", error);
    return NextResponse.json(
      { error: "Failed to revoke access" },
      { status: 500 }
    );
  }
}
