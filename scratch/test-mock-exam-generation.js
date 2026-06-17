const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

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

async function run() {
    const keyVal = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    console.log("Testing with API Key starting with:", keyVal.slice(0, 8));
    const genAI = new GoogleGenerativeAI(keyVal);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `Create a comprehensive mock exam for the course topic "Python Functions".
Generate exactly 10 multiple-choice questions.

Return ONLY a JSON object of this structure:
{
  "title": "Mock Exam for Python Functions",
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
        console.log("Starting chat session...");
        const chat = model.startChat({
            generationConfig,
            history: quizHistory
        });
        const aiResp = await chat.sendMessage(prompt);
        console.log("SUCCESS! Response text:\n", aiResp.response.text());
    } catch (err) {
        console.error("FAILED to generate mock exam:", err.message || err);
    }
}

run();
