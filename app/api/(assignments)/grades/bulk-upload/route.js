import { db } from "@/configs/db";
import {
  BULK_GRADE_UPLOAD_TABLE,
  ASSIGNMENT_SUBMISSIONS_TABLE,
  STUDY_MATERIAL_TABLE,
  GRADE_HISTORY_TABLE,
} from "@/configs/schema";
import { eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * POST /api/grades/bulk-upload
 * Handle CSV file upload for bulk grade import
 * Expected CSV format:
 * Student Email, Assignment ID, Score
 */
export async function POST(req) {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const instructorEmail = sessionClaims?.email;
    const formData = await req.formData();
    const file = formData.get("file");
    const courseId = formData.get("courseId");

    if (!file || !courseId) {
      return NextResponse.json(
        { error: "File and courseId are required" },
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

    // Create upload record
    const uploadRecord = await db
      .insert(BULK_GRADE_UPLOAD_TABLE)
      .values({
        courseId,
        uploadedBy: instructorEmail,
        fileName: file.name,
        totalRecords: 0,
        status: "processing",
      })
      .returning();

    // Read and parse CSV
    const text = await file.text();
    const lines = text.trim().split("\n");
    const headers = lines[0].split(",").map((h) => h.trim());

    // Validate headers
    const requiredHeaders = ["student email", "assignment id", "score"];
    const normalizedHeaders = headers.map((h) => h.toLowerCase());
    const hasRequiredHeaders = requiredHeaders.every((h) =>
      normalizedHeaders.includes(h)
    );

    if (!hasRequiredHeaders) {
      await db
        .update(BULK_GRADE_UPLOAD_TABLE)
        .set({
          status: "failed",
          errorDetails: {
            error: "Invalid CSV format. Required headers: Student Email, Assignment ID, Score",
          },
        })
        .where(eq(BULK_GRADE_UPLOAD_TABLE.id, uploadRecord[0].id));

      return NextResponse.json(
        { error: "Invalid CSV format" },
        { status: 400 }
      );
    }

    // Process records
    let successCount = 0;
    let failedCount = 0;
    const errors = [];
    const log = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(",").map((v) => v.trim());
      const studentEmail = values[normalizedHeaders.indexOf("student email")];
      const assignmentId = values[normalizedHeaders.indexOf("assignment id")];
      const score = parseInt(values[normalizedHeaders.indexOf("score")]);

      try {
        // Find existing submission
        const submissions = await db
          .select()
          .from(ASSIGNMENT_SUBMISSIONS_TABLE)
          .where(
            ASSIGNMENT_SUBMISSIONS_TABLE.assignmentId === assignmentId &&
              ASSIGNMENT_SUBMISSIONS_TABLE.studentEmail === studentEmail
          );

        if (!submissions.length) {
          failedCount++;
          errors.push(`Row ${i + 1}: No submission found for ${studentEmail}`);
          log.push({
            row: i + 1,
            studentEmail,
            assignmentId,
            status: "failed",
            reason: "No submission found",
          });
          continue;
        }

        const oldScore = submissions[0].score;

        // Update score
        await db
          .update(ASSIGNMENT_SUBMISSIONS_TABLE)
          .set({
            score,
            status: "ManuallyGraded",
            gradedBy: instructorEmail,
            gradedAt: new Date(),
          })
          .where(eq(ASSIGNMENT_SUBMISSIONS_TABLE.id, submissions[0].id));

        // Record in history
        await db
          .insert(GRADE_HISTORY_TABLE)
          .values({
            courseId,
            studentEmail,
            assessmentType: "assignment",
            assessmentId: assignmentId,
            oldScore: oldScore || 0,
            newScore: score,
            changedBy: instructorEmail,
            reason: "bulk_upload",
            details: {
              uploadedAt: new Date().toISOString(),
            },
          });

        successCount++;
        log.push({
          row: i + 1,
          studentEmail,
          assignmentId,
          status: "success",
          oldScore: oldScore || 0,
          newScore: score,
        });
      } catch (error) {
        failedCount++;
        errors.push(`Row ${i + 1}: ${error.message}`);
        log.push({
          row: i + 1,
          studentEmail,
          assignmentId,
          status: "failed",
          reason: error.message,
        });
      }
    }

    // Update upload record
    const finalStatus = failedCount === 0 ? "completed" : "partial";
    await db
      .update(BULK_GRADE_UPLOAD_TABLE)
      .set({
        totalRecords: successCount + failedCount,
        successfulRecords: successCount,
        failedRecords: failedCount,
        status: finalStatus,
        errorDetails: errors.length > 0 ? errors : null,
        processingLog: log,
        completedAt: new Date(),
      })
      .where(eq(BULK_GRADE_UPLOAD_TABLE.id, uploadRecord[0].id));

    return NextResponse.json({
      result: {
        uploadId: uploadRecord[0].id,
        status: finalStatus,
        totalRecords: successCount + failedCount,
        successCount,
        failedCount,
        errors: errors.length > 0 ? errors : null,
      },
    });
  } catch (error) {
    console.error("Error processing bulk upload:", error);
    return NextResponse.json(
      { error: "Failed to process file" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/grades/bulk-upload?uploadId=xxx
 * Get status of a bulk upload
 */
export async function GET(req) {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const uploadId = url.searchParams.get("uploadId");

    if (!uploadId) {
      return NextResponse.json(
        { error: "uploadId is required" },
        { status: 400 }
      );
    }

    const upload = await db
      .select()
      .from(BULK_GRADE_UPLOAD_TABLE)
      .where(eq(BULK_GRADE_UPLOAD_TABLE.id, uploadId));

    if (!upload.length) {
      return NextResponse.json(
        { error: "Upload not found" },
        { status: 404 }
      );
    }

    // Verify instructor owns the upload
    if (upload[0].uploadedBy !== sessionClaims?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    return NextResponse.json({ result: upload[0] });
  } catch (error) {
    console.error("Error fetching upload status:", error);
    return NextResponse.json(
      { error: "Failed to fetch status" },
      { status: 500 }
    );
  }
}
