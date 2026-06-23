import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/adminApiAuth";
import { AssignmentGradingAiModel } from "@/configs/AiModel";

function buildPrompt({ courseName, studentName, studentEmail, progressPercentage, quizAverage, assignmentAverage, finalGrade, riskLevel, status, feedbackCount }) {
  return `You are an academic reviewer writing supportive, specific feedback for a student.

Return strict JSON with this exact shape:
{
  "summary": "2-4 sentence feedback for the student",
  "strengths": ["string", "string"],
  "improvements": ["string", "string"],
  "recommendedAction": "one sentence"
}

Rules:
- Write in clear student-friendly English.
- Be constructive, not harsh.
- Refer to actual metrics.
- Do not mention AI, model, or system prompts.
- Do not fabricate missing data.
- Keep each strengths/improvements item short.

Student context:
- Course: ${courseName}
- Student name: ${studentName || "Student"}
- Student email: ${studentEmail}
- Status: ${status || "In Progress"}
- Progress: ${progressPercentage || 0}%
- Quiz average: ${Math.round(quizAverage || 0)}%
- Assignment average: ${Math.round(assignmentAverage || 0)}%
- Final grade: ${finalGrade || 0}%
- Risk level: ${riskLevel}
- Existing feedback count: ${feedbackCount || 0}

Generate fresh academic feedback now.`;
}

export async function POST(req) {
  const auth = await requireAdminAuth();
  if (!auth.authenticated) return auth.error;

  try {
    const body = await req.json();
    const {
      courseName,
      studentName,
      studentEmail,
      progressPercentage,
      quizAverage,
      assignmentAverage,
      finalGrade,
      riskLevel,
      status,
      feedbackCount,
    } = body;

    if (!courseName || !studentEmail) {
      return NextResponse.json({ error: "courseName and studentEmail are required" }, { status: 400 });
    }

    const prompt = buildPrompt({
      courseName,
      studentName,
      studentEmail,
      progressPercentage,
      quizAverage,
      assignmentAverage,
      finalGrade,
      riskLevel,
      status,
      feedbackCount,
    });

    const aiResponse = await AssignmentGradingAiModel.sendMessage(prompt);
    const rawText = aiResponse?.response?.text?.() || aiResponse?.response?.text || "{}";
    const cleaned = String(rawText).replace(/^```json\s*/i, "").replace(/^```/i, "").replace(/```$/i, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: "AI returned an invalid feedback format" }, { status: 502 });
    }

    const summary = String(parsed.summary || "").trim();
    const strengths = Array.isArray(parsed.strengths) ? parsed.strengths.filter(Boolean) : [];
    const improvements = Array.isArray(parsed.improvements) ? parsed.improvements.filter(Boolean) : [];
    const recommendedAction = String(parsed.recommendedAction || "").trim();

    const composedFeedback = [
      summary,
      strengths.length ? `Strengths: ${strengths.join("; ")}.` : "",
      improvements.length ? `Areas to improve: ${improvements.join("; ")}.` : "",
      recommendedAction ? `Recommended next step: ${recommendedAction}` : "",
    ].filter(Boolean).join("\n\n");

    return NextResponse.json({
      result: {
        summary,
        strengths,
        improvements,
        recommendedAction,
        composedFeedback,
      },
    });
  } catch (error) {
    console.error("Error generating AI feedback:", error);
    return NextResponse.json({ error: "Failed to generate AI feedback" }, { status: 500 });
  }
}