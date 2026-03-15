import { NextResponse } from "next/server";
import { db } from "@/configs/db";
import { COURSE_MEDIA_TABLE } from "@/configs/schema";
import { verifyAdminSession } from "@/lib/adminAuth";
import { cookies } from "next/headers";

/**
 * Handle media file uploads for courses
 * Supports: video, pdf, images, documents
 * 
 * usage:
 * POST /api/admin/media/upload
 * body: FormData with:
 *   - file: File object
 *   - courseId: string
 *   - chapterId: number (optional)
 *   - fileType: 'video' | 'pdf' | 'image' | 'document'
 */

export async function POST(req) {
  try {
    // Verify session
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_session')?.value;
    
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await verifyAdminSession(token);
    if (!session.valid || session.admin.role !== 'tutor') {
      return NextResponse.json(
        { error: "Only tutors can upload media" },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file');
    const courseId = formData.get('courseId');
    const chapterId = formData.get('chapterId');
    const fileType = formData.get('fileType');

    if (!file || !courseId) {
      return NextResponse.json(
        { error: "Missing required fields: file, courseId" },
        { status: 400 }
      );
    }

    // In production, upload to cloud storage (S3, Google Cloud Storage, etc.)
    // For now, we'll simulate with a data URL
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const mimeType = file.type || 'application/octet-stream';
    const fileUrl = `data:${mimeType};base64,${base64.substring(0, 100)}...`; // Store first 100 chars as example

    // Save media record to database
    const media = await db.insert(COURSE_MEDIA_TABLE).values({
      courseId,
      chapterId: chapterId ? parseInt(chapterId) : null,
      fileName: file.name,
      fileType: fileType || 'document',
      fileUrl, // In production, this would be the cloud storage URL
      fileSize: file.size,
      uploadedBy: session.admin.email,
      isPublic: true
    }).returning();

    return NextResponse.json({
      success: true,
      media: media[0],
      message: `File "${file.name}" uploaded successfully`
    });

  } catch (error) {
    console.error("Error uploading media:", error);
    return NextResponse.json(
      { error: "Failed to upload media: " + error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/media
 * Retrieve media files for a course
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get('courseId');

    if (!courseId) {
      return NextResponse.json(
        { error: "courseId query parameter is required" },
        { status: 400 }
      );
    }

    // Verify session
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_session')?.value;
    
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await verifyAdminSession(token);
    if (!session.valid) {
      return NextResponse.json(
        { error: "Invalid session" },
        { status: 403 }
      );
    }

    const mediaFiles = await db.select()
      .from(COURSE_MEDIA_TABLE)
      .where({ courseId });

    return NextResponse.json({
      mediaFiles: mediaFiles || []
    });

  } catch (error) {
    console.error("Error fetching media:", error);
    return NextResponse.json(
      { error: "Failed to fetch media" },
      { status: 500 }
    );
  }
}
