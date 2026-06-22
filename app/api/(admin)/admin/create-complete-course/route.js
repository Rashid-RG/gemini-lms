import { db } from "@/configs/db";
import { 
  STUDY_MATERIAL_TABLE, 
  CHAPTER_NOTES_TABLE,
  STUDY_TYPE_CONTENT_TABLE,
  COURSE_ANALYTICS_TABLE,
  COURSE_MEDIA_TABLE
} from "@/configs/schema";
import { NextResponse } from "next/server";
import { withDbRetry } from "@/lib/dbUtils";
import { eq } from "drizzle-orm";
import { verifyAdminSession } from "@/lib/adminAuth";
import { cookies } from "next/headers";

export async function POST(req) {
  try {
    // Check if user is tutor
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_session')?.value;
    
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const session = await verifyAdminSession(token);
    if (!session.valid || session.admin.role !== 'tutor') {
      return NextResponse.json(
        { error: "Only tutors can create complete courses" },
        { status: 403 }
      );
    }

    const {
      courseId,
      courseType,
      topic,
      description,
      difficultyLevel,
      createdBy,
      courseLayout,
      notes,
      flashcards,
      quizzes,
      category = 'General',
      tags = [],
      isPublic = false,
      includeVideos = false,
      // Advanced features
      publishDate,
      startDate,
      endDate,
      price = 0,
      currency = 'usd',
      enrollmentLimit,
      prerequisites = [],
      courseImage,
      quizTypes = ['multiple-choice'],
      mediaFiles = []
    } = await req.json();

    // Validate required fields
    if (!courseId || !courseType || !topic || !difficultyLevel || !createdBy || !courseLayout) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if course already exists
    const existing = await withDbRetry(() =>
      db.select().from(STUDY_MATERIAL_TABLE)
        .where(eq(STUDY_MATERIAL_TABLE.courseId, courseId))
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Course with this ID already exists" },
        { status: 409 }
      );
    }

    // Create the main course record with advanced features
    const courseData = await withDbRetry(() =>
      db.insert(STUDY_MATERIAL_TABLE).values({
        courseId,
        courseType,
        topic,
        description,
        difficultyLevel,
        courseLayout,
        createdBy,
        status: 'Ready',
        category,
        tags: tags.length > 0 ? tags : null,
        isPublic,
        includeVideos,
        // New advanced fields
        publishDate: publishDate ? new Date(publishDate) : null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        price: parseFloat(price),
        currency,
        enrollmentLimit: enrollmentLimit ? parseInt(enrollmentLimit) : null,
        prerequisites: prerequisites.length > 0 ? prerequisites : null,
        courseImage,
        quizTypes
      }).returning()
    );

    const course = courseData[0];

    // Add chapter notes if provided
    if (notes && Array.isArray(notes) && notes.length > 0) {
      const notesData = notes.map((note, idx) => ({
        courseId,
        chapterId: idx + 1,
        notes: note // Can be HTML string
      }));

      await withDbRetry(() =>
        db.insert(CHAPTER_NOTES_TABLE).values(notesData)
      );
    }

    // Add flashcards if provided
    if (flashcards && Array.isArray(flashcards) && flashcards.length > 0) {
      // Map to front/back properties for 100% compatibility with flashcard page
      const mappedFlashcards = flashcards.map(fc => ({
        front: fc.front || fc.question || '',
        back: fc.back || fc.answer || '',
        difficulty: fc.difficulty || 'Easy'
      }));

      await withDbRetry(() =>
        db.insert(STUDY_TYPE_CONTENT_TABLE).values({
          courseId,
          content: mappedFlashcards,
          type: 'Flashcard', // Normalized capitalized casing
          status: 'Ready'
        })
      );
    }

    // Add quizzes if provided
    if (quizzes && Array.isArray(quizzes) && quizzes.length > 0) {
      await withDbRetry(() =>
        db.insert(STUDY_TYPE_CONTENT_TABLE).values({
          courseId,
          content: quizzes,
          type: 'Quiz', // Normalized capitalized casing
          status: 'Ready'
        })
      );
    }

    // Create analytics record for the course
    await withDbRetry(() =>
      db.insert(COURSE_ANALYTICS_TABLE).values({
        courseId,
        totalEnrollments: 0,
        totalCompleted: 0,
        totalDropped: 0,
        averageScore: 0,
        totalRevenue: 0
      })
    );

    // Add media files if provided
    if (mediaFiles && Array.isArray(mediaFiles) && mediaFiles.length > 0) {
      const mediaData = mediaFiles.map(media => ({
        courseId,
        fileName: media.name,
        fileType: media.type,
        fileUrl: media.url,
        fileSize: media.size,
        duration: media.duration,
        uploadedBy: createdBy,
        isPublic: true
      }));

      await withDbRetry(() =>
        db.insert(COURSE_MEDIA_TABLE).values(mediaData)
      );
    }

    return NextResponse.json({
      result: course,
      message: "Complete course created successfully",
      contentAdded: {
        chapters: courseLayout.chapters?.length || 0,
        notes: notes?.length || 0,
        flashcards: flashcards?.length || 0,
        quizzes: quizzes?.length || 0,
        mediaFiles: mediaFiles?.length || 0
      }
    });

  } catch (error) {
    console.error("Error creating complete course:", error);
    return NextResponse.json(
      { error: "Failed to create course: " + error.message },
      { status: 500 }
    );
  }
}
