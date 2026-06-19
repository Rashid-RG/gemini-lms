import { db } from "@/configs/db";
import { MOCK_EXAMS_TABLE, MOCK_EXAM_SUBMISSIONS_TABLE, STUDY_MATERIAL_TABLE } from "@/configs/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getAuthEmail } from "@/lib/clerkUtils";
import { GenerateQuizAiModel } from "@/configs/AiModel";
import { safeJsonParse } from "@/lib/rateLimit";
import { withDbRetry } from "@/lib/dbUtils";

export const maxDuration = 60; // Vercel timeout handling for AI generation

/**
 * GET /api/mock-exams
 * Fetches existing mock exam (stripping correct answers) or generates a new one.
 */
export async function GET(req) {
    try {
        const { userId, sessionClaims } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const authEmail = await getAuthEmail(sessionClaims);

        const { searchParams } = new URL(req.url);
        const courseId = searchParams.get('courseId');

        if (!courseId) {
            return NextResponse.json({ error: "courseId is required" }, { status: 400 });
        }

        // Fetch course and verify ownership
        const courseRes = await withDbRetry(() => 
            db.select().from(STUDY_MATERIAL_TABLE).where(eq(STUDY_MATERIAL_TABLE.courseId, courseId)).limit(1)
        );

        if (courseRes.length === 0) {
            return NextResponse.json({ error: "Course not found" }, { status: 404 });
        }

                const course = courseRes[0];
        if (course.createdBy.toLowerCase() !== authEmail && !course.isPublic) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        let courseLayout = course.courseLayout;
        if (typeof courseLayout === 'string') {
            try {
                courseLayout = JSON.parse(courseLayout);
            } catch (e) {
                console.warn("Failed to parse courseLayout:", e);
            }
        }
        const chapters = courseLayout?.chapters || [];

        // Check if mock exam already exists
        const existingExam = await withDbRetry(() => 
            db.select().from(MOCK_EXAMS_TABLE).where(eq(MOCK_EXAMS_TABLE.courseId, courseId)).limit(1)
        );

        let exam;

        if (existingExam.length > 0) {
            exam = existingExam[0];
        } else {
            // Generate mock exam using Gemini AI
            console.log(`Generating mock exam for course ${courseId}...`);
            const prompt = `Create a comprehensive mock exam for the course topic "${course.topic}".
The course layout covers these chapters: ${JSON.stringify(chapters)}.
Generate exactly 10 multiple-choice questions.

Return ONLY a JSON object of this structure (with no markdown, backticks, or explanations):
{
  "title": "Mock Exam for ${course.topic}",
  "questions": [
    {
      "id": 1,
      "question": "What is...?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": "Option A"
    }
  ]
}`;

            try {
                const aiResp = await GenerateQuizAiModel.sendMessage(prompt);
                const rawText = aiResp.response.text();
                const { data, error } = safeJsonParse(rawText);

                if (error || !data || !data.questions || !Array.isArray(data.questions)) {
                    console.error("AI returned malformed quiz JSON:", rawText);
                    throw new Error("Invalid mock exam structure from AI");
                }

                // Insert mock exam into database
                const [newExam] = await withDbRetry(() => 
                    db.insert(MOCK_EXAMS_TABLE).values({
                        courseId,
                        title: data.title || `Mock Exam: ${course.topic}`,
                        questions: data.questions,
                        durationMinutes: 15,
                        passingScore: 70
                    }).returning()
                );
                
                exam = newExam;
            } catch (aiErr) {
                console.error("Mock exam generation failed:", aiErr);
                return NextResponse.json({ error: "Failed to generate mock exam using AI" }, { status: 500 });
            }
        }

        // Verify exam structure
        let parsedQuestions = exam.questions;
        if (typeof parsedQuestions === 'string') {
            try { parsedQuestions = JSON.parse(parsedQuestions); } catch (_) {}
        }
        if (!Array.isArray(parsedQuestions)) {
            if (parsedQuestions && typeof parsedQuestions === 'object' && Array.isArray(parsedQuestions.questions)) {
                parsedQuestions = parsedQuestions.questions;
            } else {
                parsedQuestions = [];
            }
        }

        // CRITICAL FOR SECURITY: Strip the correct answers from payload sent to browser
        const maskedQuestions = parsedQuestions.map(q => ({
            id: q.id,
            question: q.question,
            options: q.options
        }));

        return NextResponse.json({
            id: exam.id,
            title: exam.title,
            durationMinutes: exam.durationMinutes,
            passingScore: exam.passingScore,
            questions: maskedQuestions
        });

    } catch (error) {
        console.error("Mock exam GET error:", error);
        return NextResponse.json({ error: "Failed to handle mock exam" }, { status: 500 });
    }
}

/**
 * POST /api/mock-exams
 * Submits student responses, grades the exam, and stores results.
 */
export async function POST(req) {
    try {
        const { userId, sessionClaims } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const authEmail = await getAuthEmail(sessionClaims);

        const { mockExamId, answers, timeSpentSeconds } = await req.json();

        if (!mockExamId || !answers) {
            return NextResponse.json({ error: "mockExamId and answers are required" }, { status: 400 });
        }

        // Fetch mock exam from DB
        const examRes = await withDbRetry(() => 
            db.select().from(MOCK_EXAMS_TABLE).where(eq(MOCK_EXAMS_TABLE.id, Number(mockExamId))).limit(1)
        );

        if (examRes.length === 0) {
            return NextResponse.json({ error: "Mock exam not found" }, { status: 404 });
        }

        const exam = examRes[0];

        // Fetch course to verify student has access
        const courseRes = await withDbRetry(() => 
            db.select().from(STUDY_MATERIAL_TABLE).where(eq(STUDY_MATERIAL_TABLE.courseId, exam.courseId)).limit(1)
        );

        if (courseRes.length === 0) {
            return NextResponse.json({ error: "Course not found" }, { status: 404 });
        }

        const course = courseRes[0];
        if (course.createdBy.toLowerCase() !== authEmail && !course.isPublic) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        let parsedQuestions = exam.questions;
        if (typeof parsedQuestions === 'string') {
            try { parsedQuestions = JSON.parse(parsedQuestions); } catch (_) {}
        }
        if (!Array.isArray(parsedQuestions)) {
            if (parsedQuestions && typeof parsedQuestions === 'object' && Array.isArray(parsedQuestions.questions)) {
                parsedQuestions = parsedQuestions.questions;
            } else {
                parsedQuestions = [];
            }
        }

        // Grade submission
        let correctCount = 0;
        const correctAnswers = {};
        
        parsedQuestions.forEach(q => {
            correctAnswers[q.id] = q.answer;
            const studentAnswer = answers[q.id];
            if (studentAnswer && String(studentAnswer).trim() === String(q.answer).trim()) {
                correctCount++;
            }
        });

        const score = Math.round((correctCount / parsedQuestions.length) * 100);
        const passed = score >= (exam.passingScore || 70);

        // Store submission
        await withDbRetry(() => 
            db.insert(MOCK_EXAM_SUBMISSIONS_TABLE).values({
                studentEmail: authEmail,
                mockExamId: exam.id,
                answers,
                score,
                passed,
                timeSpentSeconds: timeSpentSeconds || 0
            })
        );

        return NextResponse.json({
            score,
            correctCount,
            totalQuestions: parsedQuestions.length,
            passed,
            correctAnswers
        });

    } catch (error) {
        console.error("Mock exam POST error:", error);
        return NextResponse.json({ error: "Failed to grade mock exam" }, { status: 500 });
    }
}
