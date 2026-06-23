import { db } from "@/configs/db";
import {
  STUDENT_PROGRESS_TABLE,
  STUDY_MATERIAL_TABLE,
  ASSIGNMENT_SUBMISSIONS_TABLE,
  USER_TABLE,
  COURSE_ENROLLMENT_TABLE,
} from "@/configs/schema";
import { eq, and, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/adminApiAuth";

function dedupeProgressRows(progressRows) {
  const byEmail = new Map();

  for (const row of progressRows) {
    const normalizedEmail = String(row.studentEmail || '').trim().toLowerCase();
    if (!normalizedEmail) continue;

    const existing = byEmail.get(normalizedEmail);
    if (!existing) {
      byEmail.set(normalizedEmail, row);
      continue;
    }

    const existingActivity = existing.lastActivityAt ? new Date(existing.lastActivityAt).getTime() : 0;
    const currentActivity = row.lastActivityAt ? new Date(row.lastActivityAt).getTime() : 0;
    const existingProgress = Number(existing.progressPercentage || 0);
    const currentProgress = Number(row.progressPercentage || 0);

    if (currentActivity > existingActivity || (currentActivity === existingActivity && currentProgress >= existingProgress)) {
      byEmail.set(normalizedEmail, row);
    }
  }

  return Array.from(byEmail.values());
}

/**
 * GET /api/admin/gradebook?courseId=xxx
 * Admin endpoint to view all students' grades for any course (no ownership check)
 */
export async function GET(req) {
  const auth = await requireAdminAuth();
  if (!auth.authenticated) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId");

    if (!courseId) {
      return NextResponse.json(
        { error: "courseId is required" },
        { status: 400 }
      );
    }

    // Get course details
    const course = await db
      .select()
      .from(STUDY_MATERIAL_TABLE)
      .where(eq(STUDY_MATERIAL_TABLE.courseId, courseId));

    if (!course.length) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Get all students enrolled
    const studentProgress = await db
      .select()
      .from(STUDENT_PROGRESS_TABLE)
      .where(eq(STUDENT_PROGRESS_TABLE.courseId, courseId));

    const dedupedStudentProgress = dedupeProgressRows(studentProgress);

    const studentEmails = dedupedStudentProgress.map((progress) => progress.studentEmail);

    let studentProfiles = [];
    if (studentEmails.length > 0) {
      try {
        studentProfiles = await db
          .select({
            id: USER_TABLE.id,
            name: USER_TABLE.name,
            email: USER_TABLE.email,
            studentIdentifier: USER_TABLE.studentIdentifier,
            phoneNumber: USER_TABLE.phoneNumber,
            address: USER_TABLE.address,
            city: USER_TABLE.city,
            country: USER_TABLE.country,
            postalCode: USER_TABLE.postalCode,
            dateOfBirth: USER_TABLE.dateOfBirth,
            emergencyContactName: USER_TABLE.emergencyContactName,
            emergencyContactPhone: USER_TABLE.emergencyContactPhone,
            guardianEmail: USER_TABLE.guardianEmail,
            guardianRelationship: USER_TABLE.guardianRelationship,
            isMember: USER_TABLE.isMember,
            createdAt: USER_TABLE.createdAt,
          })
          .from(USER_TABLE)
          .where(inArray(USER_TABLE.email, studentEmails));
      } catch (profileError) {
        console.warn("Falling back to basic user profile fields for admin gradebook:", profileError?.message || profileError);
        studentProfiles = await db
          .select({
            id: USER_TABLE.id,
            name: USER_TABLE.name,
            email: USER_TABLE.email,
            isMember: USER_TABLE.isMember,
            createdAt: USER_TABLE.createdAt,
          })
          .from(USER_TABLE)
          .where(inArray(USER_TABLE.email, studentEmails));
      }
    }

    const enrollments = studentEmails.length > 0
      ? await db
          .select()
          .from(COURSE_ENROLLMENT_TABLE)
          .where(eq(COURSE_ENROLLMENT_TABLE.courseId, courseId))
      : [];

    const profileMap = new Map(
      studentProfiles.map((profile) => [String(profile.email || '').toLowerCase(), profile])
    );

    const enrollmentMap = new Map(
      enrollments.map((enrollment) => [String(enrollment.studentEmail || '').toLowerCase(), enrollment])
    );

    // Get assignment submissions for this course
    const submissions = await db
      .select()
      .from(ASSIGNMENT_SUBMISSIONS_TABLE)
      .where(eq(ASSIGNMENT_SUBMISSIONS_TABLE.courseId, courseId));

    // Build per-student data
    const students = dedupedStudentProgress.map((progress) => {
      const normalizedEmail = String(progress.studentEmail || '').toLowerCase();
      const profile = profileMap.get(normalizedEmail);
      const enrollment = enrollmentMap.get(normalizedEmail);

      const parseScoreObj = (val) => {
        try {
          if (!val) return { avg: 0, count: 0 };
          const obj = typeof val === "string" ? JSON.parse(val || "{}") : val;
          const vals = Object.values(obj).map(Number).filter((v) => !isNaN(v));
          return vals.length > 0
            ? { avg: vals.reduce((a, b) => a + b, 0) / vals.length, count: vals.length }
            : { avg: 0, count: 0 };
        } catch {
          return { avg: 0, count: 0 };
        }
      };

      const quiz = parseScoreObj(progress.quizScores);

      // Assignment average from submissions
      const studentSubs = submissions.filter(
        (s) => s.studentEmail === progress.studentEmail && s.score !== null
      );
      const assignmentAvg =
        studentSubs.length > 0
          ? studentSubs.reduce((sum, s) => sum + s.score, 0) / studentSubs.length
          : parseScoreObj(progress.assignmentScores).avg;
      const assignmentCount = studentSubs.length || parseScoreObj(progress.assignmentScores).count;

      const finalGrade = Math.round(
        quiz.avg * 0.5 + assignmentAvg * 0.5
      );

      return {
        studentId: profile?.studentIdentifier || profile?.id || null,
        studentName: profile?.name || progress.studentEmail?.split('@')[0] || 'Student',
        studentEmail: progress.studentEmail,
        address: [profile?.address, profile?.city, profile?.country, profile?.postalCode].filter(Boolean).join(', ') || null,
        phone: profile?.phoneNumber || null,
        dateOfBirth: profile?.dateOfBirth || null,
        emergencyContactName: profile?.emergencyContactName || null,
        emergencyContactPhone: profile?.emergencyContactPhone || null,
        guardianEmail: profile?.guardianEmail || null,
        guardianRelationship: profile?.guardianRelationship || null,
        isMember: profile?.isMember ?? false,
        joinedAt: profile?.createdAt || null,
        enrolledAt: enrollment?.enrolledAt || null,
        lastAccessedAt: enrollment?.lastAccessedAt || null,
        totalTimeSpent: enrollment?.totalTimeSpent || 0,
        certificateIssued: enrollment?.certificateIssued || false,
        progressPercentage: progress.progressPercentage || 0,
        status: progress.status || "In Progress",
        quizAverage: quiz.avg,
        quizCount: quiz.count,
        assignmentAverage: assignmentAvg,
        assignmentCount,
        assignmentSubmitted: studentSubs.length,
        finalGrade,
        startedAt: progress.startedAt,
        completedAt: progress.completedAt,
        lastActivityAt: progress.lastActivityAt,
      };
    });

    // Class statistics
    const finalGrades = students.map((s) => s.finalGrade);
    const classAverage =
      finalGrades.length > 0
        ? Math.round(finalGrades.reduce((a, b) => a + b, 0) / finalGrades.length)
        : 0;
    const sortedGrades = [...finalGrades].sort((a, b) => a - b);

    return NextResponse.json({
      course: {
        courseId: course[0].courseId,
        courseName: course[0].topic,
        courseType: course[0].courseType,
        createdBy: course[0].createdBy,
        createdAt: course[0].createdAt,
      },
      students,
      statistics: {
        totalStudents: students.length,
        completedStudents: students.filter((s) => s.status === "Completed").length,
        inProgressStudents: students.filter((s) => s.status === "In Progress").length,
        classAverage,
        highestGrade: sortedGrades.length ? sortedGrades[sortedGrades.length - 1] : 0,
        lowestGrade: sortedGrades.length ? sortedGrades[0] : 0,
        medianGrade: sortedGrades.length
          ? sortedGrades[Math.floor(sortedGrades.length / 2)]
          : 0,
      },
    });
  } catch (error) {
    console.error("Error fetching admin gradebook:", error);
    return NextResponse.json(
      { error: "Failed to fetch gradebook data" },
      { status: 500 }
    );
  }
}
