import { db } from "@/configs/db";
import { CERTIFICATES_TABLE, STUDENT_PROGRESS_TABLE, STUDY_MATERIAL_TABLE } from "@/configs/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from 'uuid';
import { emailService } from "@/lib/emailService";

/**
 * POST /api/generate-certificate
 * Generate and store certificate for completed course
 */
export async function POST(req) {
  try {
    const { courseId, studentEmail, studentName } = await req.json();

    if (!courseId || !studentEmail || !studentName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if certificate already exists
    const existingCert = await db
      .select()
      .from(CERTIFICATES_TABLE)
      .where(
        and(
          eq(CERTIFICATES_TABLE.courseId, courseId),
          eq(CERTIFICATES_TABLE.studentEmail, studentEmail)
        )
      );

    if (existingCert.length > 0) {
      return NextResponse.json({ 
        result: existingCert[0],
        alreadyExists: true 
      });
    }

    // Get course details
    const course = await db
      .select()
      .from(STUDY_MATERIAL_TABLE)
      .where(eq(STUDY_MATERIAL_TABLE.courseId, courseId));

    if (course.length === 0) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      );
    }

    // Check if course has assignments
    const courseHasAssignments = course[0].hasAssignments === true || (course[0].assignmentCount && course[0].assignmentCount > 0);

    // Get student progress
    const progress = await db
      .select()
      .from(STUDENT_PROGRESS_TABLE)
      .where(
        and(
          eq(STUDENT_PROGRESS_TABLE.courseId, courseId),
          eq(STUDENT_PROGRESS_TABLE.studentEmail, studentEmail)
        )
      );

    if (progress.length === 0) {
      return NextResponse.json(
        { error: "Progress not found" },
        { status: 404 }
      );
    }

    // Validate completion requirements
    const completedChapters = Array.isArray(progress[0].completedChapters)
      ? progress[0].completedChapters
      : JSON.parse(progress[0].completedChapters || '[]');

    const quizScores = typeof progress[0].quizScores === 'string'
      ? JSON.parse(progress[0].quizScores || '{}')
      : (progress[0].quizScores || {});

    const assignmentScores = typeof progress[0].assignmentScores === 'string'
      ? JSON.parse(progress[0].assignmentScores || '{}')
      : (progress[0].assignmentScores || {});

    // Check all chapters completed
    const totalChapters = progress[0].totalChapters || 0;
    const allChaptersCompleted = completedChapters.length >= totalChapters && totalChapters > 0;

    console.log('Certificate check:', {
      completedChapters: completedChapters.length,
      totalChapters,
      allChaptersCompleted,
      quizScores,
      assignmentScores,
      progressPercentage: progress[0].progressPercentage
    });

    if (!allChaptersCompleted) {
      return NextResponse.json(
        { error: `Complete all chapters first (${completedChapters.length}/${totalChapters})` },
        { status: 400 }
      );
    }

    // Get all scores
    const quizScoreValues = Object.values(quizScores).map(Number).filter(n => !isNaN(n));
    const assignmentScoreEntries = Object.entries(assignmentScores);

    // Check if user has completed any assessments
    const hasCompletedQuizzes = quizScoreValues.length > 0;
    const hasCompletedAssignments = assignmentScoreEntries.length > 0;

    console.log('Certificate validation:', { 
      courseHasAssignments, 
      hasCompletedQuizzes, 
      hasCompletedAssignments,
      quizCount: quizScoreValues.length,
      assignmentCount: assignmentScoreEntries.length,
      assignmentScores,
      totalChapters
    });

    // REQUIREMENT: Must complete at least 1 quiz
    if (quizScoreValues.length < 1) {
      return NextResponse.json(
        { error: `You must complete the quiz to earn a certificate.` },
        { status: 400 }
      );
    }

    // REQUIREMENT: Quiz average must be at least 45%
    const avgQuizScore = quizScoreValues.reduce((sum, score) => sum + score, 0) / quizScoreValues.length;
    
    if (avgQuizScore < 45) {
      return NextResponse.json(
        { error: `Quiz average must be at least 45% to earn a certificate. Your average: ${Math.round(avgQuizScore)}%` },
        { status: 400 }
      );
    }

    // REQUIREMENT: If course has assignments, must complete at least 1 assignment
    if (courseHasAssignments) {
      if (assignmentScoreEntries.length < 1) {
        return NextResponse.json(
          { error: `You must complete at least one assignment to earn a certificate.` },
          { status: 400 }
        );
      }

      // REQUIREMENT: EACH assignment must have at least 45 points
      for (const [assignmentId, score] of assignmentScoreEntries) {
        const scoreNum = Number(score);
        if (!isNaN(scoreNum) && scoreNum < 45) {
          return NextResponse.json(
            { error: `Assignment "${assignmentId}" has a score of ${Math.round(scoreNum)} points. Each assignment must have at least 45 points to earn a certificate.` },
            { status: 400 }
          );
        }
      }
    }

    console.log('Score check:', { avgQuizScore, quizCount: quizScoreValues.length, assignmentCount: assignmentScoreEntries.length });

    // Generate certificate
    const certificateId = `CERT-${uuidv4().substring(0, 8).toUpperCase()}`;
    
    const certificate = await db
      .insert(CERTIFICATES_TABLE)
      .values({
        certificateId,
        courseId,
        studentEmail,
        studentName,
        courseName: course[0].topic,
        finalScore: progress[0].finalScore,
        completedAt: new Date(),
        issueDate: new Date()
      })
      .returning();

    // Update progress status to Completed
    await db
      .update(STUDENT_PROGRESS_TABLE)
      .set({
        status: 'Completed',
        completedAt: new Date()
      })
      .where(
        and(
          eq(STUDENT_PROGRESS_TABLE.courseId, courseId),
          eq(STUDENT_PROGRESS_TABLE.studentEmail, studentEmail)
        )
      );

    // Send certificate email
    try {
      const certificateUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-certificate/${certificateId}`;
      await emailService.sendCertificateEmail(
        studentEmail,
        studentName,
        course[0].topic,
        certificateUrl
      );
    } catch (emailError) {
      console.error('Certificate email failed (non-fatal):', emailError?.message);
      // Don't fail the certificate generation if email fails
    }

    return NextResponse.json({ 
      result: certificate[0],
      message: "Certificate generated successfully" 
    });
  } catch (err) {
    console.error("Certificate Generation Error:", err);
    return NextResponse.json(
      { error: "Failed to generate certificate" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/generate-certificate?courseId=xyz&studentEmail=abc@example.com
 * Get certificate for a course
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId");
    const studentEmail = searchParams.get("studentEmail");

    if (!courseId || !studentEmail) {
      return NextResponse.json(
        { error: "Missing courseId or studentEmail" },
        { status: 400 }
      );
    }

    const certificate = await db
      .select()
      .from(CERTIFICATES_TABLE)
      .where(
        and(
          eq(CERTIFICATES_TABLE.courseId, courseId),
          eq(CERTIFICATES_TABLE.studentEmail, studentEmail)
        )
      );

    if (certificate.length === 0) {
      return NextResponse.json(
        { error: "Certificate not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ result: certificate[0] });
  } catch (err) {
    console.error("Certificate Fetch Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch certificate" },
      { status: 500 }
    );
  }
}
