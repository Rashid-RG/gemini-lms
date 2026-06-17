/**
 * API endpoint: Get student's grades across all courses
 * Used by Student GradeBook
 */
import { db } from "@/configs/db";
import { STUDENT_PROGRESS_TABLE, STUDY_MATERIAL_TABLE, ASSIGNMENT_SUBMISSIONS_TABLE, GRADE_COMMENTS_TABLE, USER_TABLE } from "@/configs/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";

function dedupeByKey(records, getKey) {
  const byKey = new Map();

  for (const record of records) {
    const key = getKey(record);
    if (!key) continue;

    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, record);
      continue;
    }

    const existingActivity = existing.lastActivityAt ? new Date(existing.lastActivityAt).getTime() : 0;
    const currentActivity = record.lastActivityAt ? new Date(record.lastActivityAt).getTime() : 0;
    const existingProgress = Number(existing.progressPercentage || 0);
    const currentProgress = Number(record.progressPercentage || 0);

    if (currentActivity > existingActivity || (currentActivity === existingActivity && currentProgress >= existingProgress)) {
      byKey.set(key, record);
    }
  }

  return Array.from(byKey.values());
}

function parseScoreObject(value) {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      return JSON.parse(value || "{}");
    } catch {
      return {};
    }
  }
  return value;
}

function getAverageFromScores(scoresObject) {
  const scores = Object.values(scoresObject || {}).filter((value) => typeof value === "number");
  const average = scores.length > 0
    ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length)
    : 0;

  return {
    scores,
    average,
  };
}

function calculateWeightedGrade(progress) {
  const quiz = getAverageFromScores(parseScoreObject(progress?.quizScores));
  const assignment = getAverageFromScores(parseScoreObject(progress?.assignmentScores));
  const mcq = getAverageFromScores(parseScoreObject(progress?.mcqScores));

  return {
    quizAverage: quiz.average,
    quizCount: quiz.scores.length,
    assignmentAverage: assignment.average,
    assignmentCount: assignment.scores.length,
    mcqAverage: mcq.average,
    mcqCount: mcq.scores.length,
    finalGrade: Math.round((quiz.average * 0.30) + (assignment.average * 0.40) + (mcq.average * 0.30)),
  };
}

export async function GET(req) {
  try {
    const { userId, sessionClaims } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user email from Clerk
    const clerkUser = await currentUser();
    const studentEmail = (
      sessionClaims?.email ||
      sessionClaims?.primaryEmailAddress?.emailAddress ||
      clerkUser?.primaryEmailAddress?.emailAddress ||
      clerkUser?.emailAddresses?.[0]?.emailAddress
    )?.toLowerCase();
    if (!studentEmail) {
      return NextResponse.json({ error: "User email not found" }, { status: 400 });
    }

    const profile = await db
      .select({
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
        createdAt: USER_TABLE.createdAt,
      })
      .from(USER_TABLE)
      .where(eq(USER_TABLE.email, studentEmail))
      .limit(1);

    // Fetch all student progress records (one per course)
    const progressRecords = await db
      .select()
      .from(STUDENT_PROGRESS_TABLE)
      .where(eq(STUDENT_PROGRESS_TABLE.studentEmail, studentEmail));

    const dedupedProgressRecords = dedupeByKey(
      progressRecords,
      (progress) => String(progress.courseId || '').trim()
    );

    // For each course, fetch course details and aggregate grades
    const gradesData = await Promise.all(
      dedupedProgressRecords.map(async (progress) => {
        // Get course details
        const course = await db
          .select()
          .from(STUDY_MATERIAL_TABLE)
          .where(eq(STUDY_MATERIAL_TABLE.courseId, progress.courseId))
          .limit(1);

        const [submissions, peerProgress, publicComments] = await Promise.all([
          db
            .select()
            .from(ASSIGNMENT_SUBMISSIONS_TABLE)
            .where(
              and(
                eq(ASSIGNMENT_SUBMISSIONS_TABLE.studentEmail, studentEmail),
                eq(ASSIGNMENT_SUBMISSIONS_TABLE.courseId, progress.courseId)
              )
            ),
          db
            .select()
            .from(STUDENT_PROGRESS_TABLE)
            .where(eq(STUDENT_PROGRESS_TABLE.courseId, progress.courseId)),
          db
            .select()
            .from(GRADE_COMMENTS_TABLE)
            .where(
              and(
                eq(GRADE_COMMENTS_TABLE.courseId, progress.courseId),
                eq(GRADE_COMMENTS_TABLE.studentEmail, studentEmail),
                eq(GRADE_COMMENTS_TABLE.isPrivate, false)
              )
            ),
        ]);

        const gradeBreakdown = calculateWeightedGrade(progress);
        const rankedPeers = dedupeByKey(
          peerProgress,
          (peer) => String(peer.studentEmail || '').trim().toLowerCase()
        )
          .map((peer) => ({
            studentEmail: peer.studentEmail,
            finalGrade: calculateWeightedGrade(peer).finalGrade,
          }))
          .sort((a, b) => b.finalGrade - a.finalGrade);

        const classRank = rankedPeers.findIndex((peer) => peer.studentEmail === studentEmail) + 1;
        const commentFeed = [...publicComments]
          .sort((a, b) => {
            if (a.isPinned === b.isPinned) {
              return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
            }
            return a.isPinned ? -1 : 1;
          })
          .map((comment) => ({
            id: comment.id,
            assessmentType: comment.assessmentType,
            assessmentId: comment.assessmentId,
            comment: comment.comment,
            isPinned: comment.isPinned,
            createdAt: comment.createdAt,
            updatedAt: comment.updatedAt,
          }));

        return {
          courseId: progress.courseId,
          courseName: course?.[0]?.topic || "Unknown Course",
          courseType: course?.[0]?.courseType || "Unknown",
          category: course?.[0]?.category || "General",
          progressPercentage: progress.progressPercentage || 0,
          status: progress.status || "In Progress",
          quizAverage: gradeBreakdown.quizAverage,
          quizCount: gradeBreakdown.quizCount,
          assignmentAverage: gradeBreakdown.assignmentAverage,
          assignmentCount: gradeBreakdown.assignmentCount,
          mcqAverage: gradeBreakdown.mcqAverage,
          mcqCount: gradeBreakdown.mcqCount,
          finalGrade: gradeBreakdown.finalGrade,
          finalScore: progress.finalScore || gradeBreakdown.finalGrade,
          resultStatus: gradeBreakdown.finalGrade >= 35 ? "Passed" : "Failed",
          classRank: classRank || null,
          classSize: rankedPeers.length,
          percentile: rankedPeers.length > 0 && classRank > 0
            ? Math.max(0, Math.round(((rankedPeers.length - classRank) / rankedPeers.length) * 100))
            : 0,
          assignmentSubmitted: submissions.filter((submission) => submission.status !== "Submitted").length,
          feedbackComments: commentFeed,
          feedbackCount: commentFeed.length,
          startedAt: progress.startedAt,
          completedAt: progress.completedAt,
          lastActivityAt: progress.lastActivityAt,
        };
      })
    );

    // Sort by recent activity
    gradesData.sort((a, b) => new Date(b.lastActivityAt || 0) - new Date(a.lastActivityAt || 0));

    // Calculate overall statistics
    const allGrades = gradesData.map(g => g.finalGrade).filter(g => g > 0);
    const overallAverage = allGrades.length > 0
      ? Math.round(allGrades.reduce((a, b) => a + b, 0) / allGrades.length)
      : 0;

    return NextResponse.json({
      result: {
        studentEmail,
        studentProfile: profile[0]
          ? {
              name: profile[0].name || null,
              email: profile[0].email || studentEmail,
              studentIdentifier: profile[0].studentIdentifier || null,
              phoneNumber: profile[0].phoneNumber || null,
              address: [profile[0].address, profile[0].city, profile[0].country, profile[0].postalCode].filter(Boolean).join(', ') || null,
              dateOfBirth: profile[0].dateOfBirth || null,
              emergencyContactName: profile[0].emergencyContactName || null,
              emergencyContactPhone: profile[0].emergencyContactPhone || null,
              guardianEmail: profile[0].guardianEmail || null,
              guardianRelationship: profile[0].guardianRelationship || null,
              joinedAt: profile[0].createdAt || null,
            }
          : {
              name: null,
              email: studentEmail,
              studentIdentifier: null,
              phoneNumber: null,
              address: null,
              dateOfBirth: null,
              emergencyContactName: null,
              emergencyContactPhone: null,
              guardianEmail: null,
              guardianRelationship: null,
              joinedAt: null,
            },
        courses: gradesData,
        statistics: {
          totalCourses: gradesData.length,
          completedCourses: gradesData.filter(g => g.status === "Completed").length,
          inProgressCourses: gradesData.filter(g => g.status === "In Progress").length,
          passedCourses: gradesData.filter(g => g.resultStatus === "Passed").length,
          failedCourses: gradesData.filter(g => g.resultStatus === "Failed").length,
          overallGrade: overallAverage,
          averageProgress: Math.round(
            gradesData.reduce((sum, g) => sum + g.progressPercentage, 0) / (gradesData.length || 1)
          ),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching student grades:", error);
    return NextResponse.json(
      { error: "Failed to fetch grades", details: error.message },
      { status: 500 }
    );
  }
}
