import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/adminApiAuth";
import { db } from "@/configs/db";
import { 
  USER_TABLE, 
  STUDY_MATERIAL_TABLE, 
  CHAPTER_NOTES_TABLE,
  STUDY_TYPE_CONTENT_TABLE, 
  COURSE_MEDIA_TABLE,
  COURSE_ENROLLMENT_TABLE,
  PAYMENT_RECORD_TABLE, 
  STUDENT_PROGRESS_TABLE, 
  CERTIFICATES_TABLE,
  COURSE_ASSIGNMENTS_TABLE, 
  ASSIGNMENT_SUBMISSIONS_TABLE, 
  SUPPORT_TICKETS_TABLE,
  LEADERBOARD_TABLE, 
  ANNOUNCEMENTS_TABLE, 
  TUTOR_REQUESTS_TABLE,
  ADMIN_TABLE,
  SYSTEM_BACKUP_TABLE
} from "@/configs/schema";
import zlib from "zlib";
import crypto from "crypto";

export async function POST(req) {
  try {
    // 1. Authorize admin session (tutor, admin, or super_admin)
    const authResult = await requireAdminAuth();
    if (!authResult.authenticated) {
      return authResult.error || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const adminEmail = authResult.admin.email;

    // 2. Fetch database records sequentially to minimize memory and connection pool load
    const users = await db.select().from(USER_TABLE);
    const studyMaterial = await db.select().from(STUDY_MATERIAL_TABLE);
    const chapterNotes = await db.select().from(CHAPTER_NOTES_TABLE);
    const studyTypeContent = await db.select().from(STUDY_TYPE_CONTENT_TABLE);
    const courseMedia = await db.select().from(COURSE_MEDIA_TABLE);
    const courseEnrollments = await db.select().from(COURSE_ENROLLMENT_TABLE);
    const paymentRecord = await db.select().from(PAYMENT_RECORD_TABLE);
    const studentProgress = await db.select().from(STUDENT_PROGRESS_TABLE);
    const certificates = await db.select().from(CERTIFICATES_TABLE);
    const courseAssignments = await db.select().from(COURSE_ASSIGNMENTS_TABLE);
    const assignmentSubmissions = await db.select().from(ASSIGNMENT_SUBMISSIONS_TABLE);
    const supportTickets = await db.select().from(SUPPORT_TICKETS_TABLE);
    const leaderboard = await db.select().from(LEADERBOARD_TABLE);
    const admins = await db.select().from(ADMIN_TABLE);
    const tutorRequests = await db.select().from(TUTOR_REQUESTS_TABLE);
    const announcements = await db.select().from(ANNOUNCEMENTS_TABLE);

    // 3. Construct structured backup payload
    const backupPayload = {
      timestamp: new Date().toISOString(),
      version: "1.0",
      tables: {
        users,
        studyMaterial,
        chapterNotes,
        studyTypeContent,
        courseMedia,
        courseEnrollments,
        paymentRecord,
        studentProgress,
        certificates,
        courseAssignments,
        assignmentSubmissions,
        supportTickets,
        leaderboard,
        admins,
        tutorRequests,
        announcements
      }
    };

    // 4. Compress to Gzip and encode to Base64
    const jsonString = JSON.stringify(backupPayload);
    const compressedBuffer = zlib.gzipSync(jsonString);
    const base64Data = compressedBuffer.toString("base64");
    const fileSize = compressedBuffer.length;

    // Calculate total record count
    const recordCount = Object.values(backupPayload.tables).reduce(
      (sum, table) => sum + (table?.length || 0), 
      0
    );

    // 5. Generate secure random download token
    const downloadToken = crypto.randomBytes(32).toString("hex");

    // Format backup file name
    const timestampStr = new Date()
      .toISOString()
      .replace(/T/, "_")
      .replace(/\..+/, "")
      .replace(/:/g, "");
    const fileName = `backup_${timestampStr}.json.gz`;

    // 6. Insert backup record
    await db.insert(SYSTEM_BACKUP_TABLE).values({
      fileName,
      backupType: "manual",
      recordCount,
      fileSize,
      backupData: base64Data,
      downloadToken,
      createdBy: adminEmail
    });

    return NextResponse.json({
      success: true,
      fileName,
      recordCount,
      fileSize,
      downloadToken,
      createdBy: adminEmail
    });

  } catch (error) {
    console.error("Backup Generation Failed:", error);
    return NextResponse.json(
      { error: "Backup generation failed", details: error.message },
      { status: 500 }
    );
  }
}
