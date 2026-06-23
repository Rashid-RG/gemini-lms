import { db } from "@/configs/db";
import { GRADE_HISTORY_TABLE, STUDENT_PROGRESS_TABLE, STUDY_MATERIAL_TABLE } from "@/configs/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * GET /api/grades/trends?courseId=xxx&studentEmail=xxx&days=30
 * Get grade trends/history for a student over time
 */
export async function GET(req) {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clerkUser = await currentUser();
    const requesterEmail = (
      sessionClaims?.email ||
      sessionClaims?.primaryEmailAddress?.emailAddress ||
      clerkUser?.primaryEmailAddress?.emailAddress ||
      clerkUser?.emailAddresses?.[0]?.emailAddress
    )?.toLowerCase();

    const url = new URL(req.url);
    const courseId = url.searchParams.get("courseId");
    const studentEmail = url.searchParams.get("studentEmail")?.toLowerCase();
    const daysBack = parseInt(url.searchParams.get("days") || "30");

    if (!courseId || !studentEmail) {
      return NextResponse.json(
        { error: "courseId and studentEmail are required" },
        { status: 400 }
      );
    }

    if (requesterEmail !== studentEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - daysBack * 24 * 60 * 60 * 1000);

    // Get grade history for the period
    const history = await db
      .select()
      .from(GRADE_HISTORY_TABLE)
      .where(
        and(
          eq(GRADE_HISTORY_TABLE.courseId, courseId),
          eq(GRADE_HISTORY_TABLE.studentEmail, studentEmail),
          gte(GRADE_HISTORY_TABLE.createdAt, startDate),
          lte(GRADE_HISTORY_TABLE.createdAt, endDate)
        )
      );

    // Group by assessment type
    const byAssessmentType = {};
    history.forEach((entry) => {
      if (!byAssessmentType[entry.assessmentType]) {
        byAssessmentType[entry.assessmentType] = [];
      }
      byAssessmentType[entry.assessmentType].push({
        date: entry.createdAt,
        oldScore: entry.oldScore,
        newScore: entry.newScore,
        reason: entry.reason,
        changedBy: entry.changedBy,
        details: entry.details,
      });
    });

    // Calculate trends
    const trends = {};
    Object.keys(byAssessmentType).forEach((type) => {
      const entries = byAssessmentType[type];
      if (entries.length > 0) {
        const scores = entries.map((e) => e.newScore);
        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        const minScore = Math.min(...scores);
        const maxScore = Math.max(...scores);
        const trend =
          entries.length > 1
            ? entries[entries.length - 1].newScore - entries[0].newScore
            : 0;
        const trendDirection =
          trend > 0 ? "improving" : trend < 0 ? "declining" : "stable";

        trends[type] = {
          avgScore: Math.round(avgScore),
          minScore,
          maxScore,
          totalChanges: entries.length,
          trend,
          trendDirection,
          lastScore: entries[entries.length - 1].newScore,
          firstScore: entries[0].newScore,
        };
      }
    });

    // Get overall progress
    const currentProgress = await db
      .select()
      .from(STUDENT_PROGRESS_TABLE)
      .where(
        and(
          eq(STUDENT_PROGRESS_TABLE.courseId, courseId),
          eq(STUDENT_PROGRESS_TABLE.studentEmail, studentEmail)
        )
      );

    return NextResponse.json({
      result: {
        studentEmail,
        courseId,
        period: {
          startDate,
          endDate,
          days: daysBack,
        },
        history: history.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
        byAssessmentType,
        trends,
        currentProgress: currentProgress[0] || null,
      },
    });
  } catch (error) {
    console.error("Error fetching grade trends:", error);
    return NextResponse.json(
      {
        result: {
          history: [],
          byAssessmentType: {},
          trends: {},
          currentProgress: null,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/grades/trends/predict
 * Predict final grade based on current trends
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const { courseId, studentEmail, currentAssessmentAverages } = body;

    if (!courseId || !studentEmail) {
      return NextResponse.json(
        { error: "courseId and studentEmail are required" },
        { status: 400 }
      );
    }

    const { quizAvg = 0, assignmentAvg = 0 } =
      currentAssessmentAverages || {};

    // Calculate predicted final grade using weighted average
    const predictedFinalGrade = Math.round(
      quizAvg * 0.5 + assignmentAvg * 0.5
    );

    // Determine risk level
    let riskLevel = "low";
    let recommendedInterventions = [];

    if (predictedFinalGrade < 60) {
      riskLevel = "critical";
      recommendedInterventions.push(
        "Schedule one-on-one tutoring session",
        "Review fundamentals of course material",
        "Consider course withdrawal if allowed"
      );
    } else if (predictedFinalGrade < 70) {
      riskLevel = "high";
      recommendedInterventions.push(
        "Increase study time by 50%",
        "Join study groups",
        "Schedule office hours with instructor"
      );
    } else if (predictedFinalGrade < 80) {
      riskLevel = "medium";
      recommendedInterventions.push(
        "Review weak assessment types",
        "Practice more problems",
        "Form study groups"
      );
    } else {
      recommendedInterventions.push(
        "Maintain current study habits",
        "Help peers who are struggling"
      );
    }

    // Identify weak areas
    const scores = [
      { type: "Quiz", score: quizAvg },
      { type: "Assignment", score: assignmentAvg },
    ];
    const weakAreas = scores
      .filter((s) => s.score < predictedFinalGrade)
      .map((s) => s.type);
    const strengths = scores
      .filter((s) => s.score > predictedFinalGrade)
      .map((s) => s.type);

    return NextResponse.json({
      result: {
        courseId,
        studentEmail,
        currentScores: {
          quizAvg: Math.round(quizAvg),
          assignmentAvg: Math.round(assignmentAvg),
        },
        predictedFinalGrade,
        riskLevel,
        confidenceScore: 0.85, // Placeholder confidence
        strengths,
        weakAreas,
        recommendedInterventions,
      },
    });
  } catch (error) {
    console.error("Error predicting grade:", error);
    return NextResponse.json(
      { error: "Failed to predict grade" },
      { status: 500 }
    );
  }
}
