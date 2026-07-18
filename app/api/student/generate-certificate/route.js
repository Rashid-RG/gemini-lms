import { NextResponse } from "next/server";
import { db } from "@/configs/db";
import {
  CERTIFICATES_TABLE,
  COURSE_ENROLLMENT_TABLE,
  STUDENT_PROGRESS_TABLE,
  STUDY_MATERIAL_TABLE
} from "@/configs/schema";
import { eq, and } from "drizzle-orm";
import { auth, currentUser } from "@clerk/nextjs/server";
import { v4 as uuidv4 } from 'uuid';
import { shouldIssueCertificate } from "@/lib/gradingEngine";

/**
 * POST /api/student/generate-certificate
 * Generate certificate upon course completion
 */
export async function POST(req) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const studentEmail = (user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress)?.toLowerCase();
    const studentName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Student';

    if (!studentEmail) {
      return NextResponse.json({ error: "Student email not found" }, { status: 400 });
    }

    const { courseId } = await req.json();
    if (!courseId) {
      return NextResponse.json({ error: "courseId is required" }, { status: 400 });
    }

    // Get course details
    const course = await db.select().from(STUDY_MATERIAL_TABLE)
      .where(eq(STUDY_MATERIAL_TABLE.courseId, courseId));

    if (course.length === 0) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Get student progress
    const progress = await db.select().from(STUDENT_PROGRESS_TABLE)
      .where(and(
        eq(STUDENT_PROGRESS_TABLE.courseId, courseId),
        eq(STUDENT_PROGRESS_TABLE.studentEmail, studentEmail)
      ));

    if (progress.length === 0) {
      return NextResponse.json(
        { error: "No progress found for this course" },
        { status: 404 }
      );
    }

    const courseProgress = progress[0];

    // Validate completion requirements (Option 1)
    const completedChapters = Array.isArray(courseProgress.completedChapters)
      ? courseProgress.completedChapters
      : JSON.parse(courseProgress.completedChapters || '[]');

    const quizScores = typeof courseProgress.quizScores === 'string'
      ? JSON.parse(courseProgress.quizScores || '{}')
      : (courseProgress.quizScores || {});

    const assignmentScores = typeof courseProgress.assignmentScores === 'string'
      ? JSON.parse(courseProgress.assignmentScores || '{}')
      : (courseProgress.assignmentScores || {});

    const totalChapters = courseProgress.totalChapters || 0;
    const allChaptersCompleted = completedChapters.length >= totalChapters && totalChapters > 0;

    if (!allChaptersCompleted) {
      return NextResponse.json(
        { error: `Complete all chapters first (${completedChapters.length}/${totalChapters})` },
        { status: 400 }
      );
    }

    const quizScoreValues = Object.values(quizScores).map(Number).filter(n => !isNaN(n));
    const assignmentScoreEntries = Object.entries(assignmentScores);

    // Require ALL quizzes completed
    if (quizScoreValues.length < totalChapters) {
      return NextResponse.json(
        { error: `You must complete all quizzes to earn a certificate. Completed ${quizScoreValues.length} out of ${totalChapters} quizzes.` },
        { status: 400 }
      );
    }

    // Require quiz average >= 60%
    const avgQuizScore = quizScoreValues.reduce((sum, score) => sum + score, 0) / quizScoreValues.length;
    if (avgQuizScore < 60) {
      return NextResponse.json(
        { error: `Quiz average must be at least 60% to earn a certificate. Your average: ${Math.round(avgQuizScore)}%` },
        { status: 400 }
      );
    }

    // If course has assignments, require ALL assignments completed and each >= 60%
    const courseHasAssignments = course[0].hasAssignments === true || (course[0].assignmentCount && course[0].assignmentCount > 0);
    if (courseHasAssignments) {
      const expectedAssignmentCount = course[0].assignmentCount || 0;
      if (assignmentScoreEntries.length < expectedAssignmentCount) {
        return NextResponse.json(
          { error: `You must complete all assignments to earn a certificate. Submitted ${assignmentScoreEntries.length} out of ${expectedAssignmentCount} assignments.` },
          { status: 400 }
        );
      }

      for (const [assignmentId, score] of assignmentScoreEntries) {
        const scoreNum = Number(score);
        if (!isNaN(scoreNum) && scoreNum < 60) {
          return NextResponse.json(
            { error: `Assignment "${assignmentId}" has a score of ${Math.round(scoreNum)} points. Each assignment must have at least 60 points to earn a certificate.` },
            { status: 400 }
          );
        }
      }
    }

    // Check if certificate already issued
    const existing = await db.select().from(CERTIFICATES_TABLE)
      .where(and(
        eq(CERTIFICATES_TABLE.courseId, courseId),
        eq(CERTIFICATES_TABLE.studentEmail, studentEmail)
      ));

    if (existing.length > 0) {
      return NextResponse.json({
        success: true,
        certificate: existing[0],
        message: "Certificate already issued"
      });
    }

    // Generate certificate
    const certificateId = uuidv4();
    const certificate = await db.insert(CERTIFICATES_TABLE).values({
      certificateId,
      courseId,
      studentEmail,
      studentName,
      courseName: course[0].topic,
      completedAt: new Date(),
      finalScore: Math.round(averageScore),
      issueDate: new Date()
    }).returning();

    // Update enrollment record
    await db.update(COURSE_ENROLLMENT_TABLE)
      .set({
        certificateIssued: true,
        certificateIssuedAt: new Date(),
        status: 'Completed'
      })
      .where(and(
        eq(COURSE_ENROLLMENT_TABLE.courseId, courseId),
        eq(COURSE_ENROLLMENT_TABLE.studentEmail, studentEmail)
      ));

    return NextResponse.json({
      success: true,
      certificate: certificate[0],
      certificateUrl: `/verify-certificate/${certificateId}`,
      message: "Certificate generated successfully!"
    });

  } catch (error) {
    console.error("Error generating certificate:", error);
    return NextResponse.json(
      { error: "Failed to generate certificate: " + error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/student/certificate/[certificateId]
 * Get certificate details
 */
export async function GET(req, { params }) {
  try {
    const { certificateId } = params;

    const certificate = await db.select().from(CERTIFICATES_TABLE)
      .where(eq(CERTIFICATES_TABLE.certificateId, certificateId));

    if (certificate.length === 0) {
      return NextResponse.json(
        { error: "Certificate not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      certificate: certificate[0],
      verified: true
    });

  } catch (error) {
    console.error("Error fetching certificate:", error);
    return NextResponse.json(
      { error: "Failed to fetch certificate" },
      { status: 500 }
    );
  }
}
