const { neon } = require("@neondatabase/serverless");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const dbUrl = process.env.NEXT_PUBLIC_DB_CONNECTION_STRING;
const sql = neon(dbUrl);

const generationConfig = {
  temperature: 0.8,
  topP: 0.9,
  topK: 40,
  maxOutputTokens: 8192,
  responseMimeType: "application/json",
};

const quizHistory = [
  {
    role: "user",
    parts: [
      { text: "Generate Quiz on topic : Flutter Fundamentals,User Interface (UI) Development,Basic App Navigation with Question and Options along with correct answer in JSON format" },
    ],
  },
  {
    role: "model",
    parts: [
      { text: "{\n  \"quizTitle\": \"Flutter Fundamentals, UI Development & Basic Navigation\",\n  \"questions\": [\n    {\n      \"question\": \"What is the fundamental building block of a Flutter UI?\",\n      \"options\": [\"Widget\", \"Layout\", \"View\", \"Component\"],\n      \"answer\": \"Widget\"\n    }\n  ]\n}" },
    ],
  },
];

function safeJsonParse(jsonString, fallback = null) {
  try {
    return { data: JSON.parse(jsonString), error: null };
  } catch (error) {
    return { data: fallback, error };
  }
}

async function run() {
    try {
        console.log("Fetching first course from studyMaterial...");
        const courses = await sql`SELECT * FROM "studyMaterial" LIMIT 1`;
        if (courses.length === 0) {
            console.log("No courses found. Please generate a course first.");
            return;
        }
        const course = courses[0];
        const courseId = course.courseId;
        console.log(`Using course: "${course.topic}" (ID: ${courseId})`);

        console.log("Checking if mock exam exists...");
        const existingExams = await sql`SELECT * FROM "mockExams" WHERE "courseId" = ${courseId} LIMIT 1`;
        
        let exam;
        if (existingExams.length > 0) {
            console.log("Mock exam exists in DB.");
            exam = existingExams[0];
        } else {
            console.log("No mock exam found in DB. Generating using AI...");
            let courseLayout = course.courseLayout;
            if (typeof courseLayout === 'string') {
                courseLayout = JSON.parse(courseLayout);
            }
            const chapters = courseLayout?.chapters || [];

            const prompt = `Create a comprehensive mock exam for the course topic "${course.topic}".
The course layout covers these chapters: ${JSON.stringify(chapters)}.
Generate exactly 10 multiple-choice questions.

Return ONLY a JSON object of this structure:
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

            const keyVal = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
            const genAI = new GoogleGenerativeAI(keyVal);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const chat = model.startChat({
                generationConfig,
                history: quizHistory
            });
            const aiResp = await chat.sendMessage(prompt);
            const rawText = aiResp.response.text();
            
            let cleanText = rawText.trim();
            if (cleanText.startsWith("```")) {
                cleanText = cleanText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
            }

            const { data, error } = safeJsonParse(cleanText);
            if (error || !data || !data.questions || !Array.isArray(data.questions)) {
                console.error("AI returned malformed JSON:", rawText);
                throw new Error("Invalid mock exam structure from AI");
            }

            console.log("Saving mock exam to DB...");
            const questionsJson = JSON.stringify(data.questions);
            const title = data.title || `Mock Exam: ${course.topic}`;
            
            const insertResult = await sql`
                INSERT INTO "mockExams" ("courseId", "title", "questions", "durationMinutes", "passingScore")
                VALUES (${courseId}, ${title}, ${questionsJson}, 15, 70)
                RETURNING *
            `;
            exam = insertResult[0];
            console.log("Mock exam saved successfully!");
        }

        console.log("Processing mock exam questions...");
        let parsedQuestions = exam.questions;
        if (typeof parsedQuestions === 'string') {
            parsedQuestions = JSON.parse(parsedQuestions);
        }

        const maskedQuestions = (parsedQuestions || []).map(q => ({
            id: q.id,
            question: q.question,
            options: q.options
        }));

        console.log(`SUCCESS: Mock exam retrieved with ${maskedQuestions.length} questions.`);
    } catch (err) {
        console.error("ROUTE FAILED:", err);
    }
}

run();
