import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getApiKeyRotationManager } from "@/lib/apiKeyRotation";
import { retryWithBackoff, safeJsonParse } from "@/lib/rateLimit";

export const maxDuration = 30; // Extend duration slightly to accommodate retries

/**
 * POST /api/playground/review
 * Analyzes client source code and provides detailed AI coding advice,
 * including Big-O complexity, error checks, optimization suggestions, and a quality score.
 */
export async function POST(req) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { language, code } = await req.json();

        if (!language || !code) {
            return NextResponse.json({ error: "Language and code are required" }, { status: 400 });
        }

        let rotationManager = null;
        let attemptCount = 0;

        const reviewData = await retryWithBackoff(async () => {
            attemptCount++;
            try {
                rotationManager = getApiKeyRotationManager();
                console.log(`[AI Review] Attempt ${attemptCount} using key ${rotationManager.getCurrentKeyIndex() + 1}/${rotationManager.apiKeys.length}`);
            } catch (err) {
                console.warn('API Key Rotation Manager failed to initialize:', err.message);
            }

            const currentKey = rotationManager ? rotationManager.getCurrentKey() : process.env.NEXT_PUBLIC_GEMINI_API_KEY;
            const genAI = new GoogleGenerativeAI(currentKey);

            const model = genAI.getGenerativeModel({
                model: "gemini-2.5-flash",
                generationConfig: {
                    responseMimeType: "application/json"
                }
            });

            const prompt = `You are an expert AI Software Engineering Mentor. Review the following code written in ${language}. 
Perform a deep analysis of code quality, logical errors, edge cases, time/space complexity, and code optimization.

Return a JSON object matching this exact TypeScript structure:
{
  "summary": string, // 1-2 sentence high-level summary of what the code does
  "score": number, // Code quality score from 0 to 100
  "complexity": {
    "time": string, // e.g. "O(N)" or "O(1)" with brief reason
    "space": string // e.g. "O(N)" or "O(1)" with brief reason
  },
  "errors": string[], // List of logical flaws, infinite loops, syntax errors, or null-pointer issues. Empty if clean.
  "suggestions": Array<{
    "title": string, // Short title of the improvement
    "desc": string, // Explanation of why this is better
    "code": string // Complete code snippet displaying the recommended improvement
  }> // List of 1 to 3 distinct optimization ideas
}

Here is the code to review:
\`\`\`${language}
${code}
\`\`\`
`;

            const response = await model.generateContent(prompt);
            const resultText = response.response.text();
            const { data, error } = safeJsonParse(resultText);

            if (error) {
                console.error("Failed to parse AI review JSON:", error.message);
                throw new Error("Invalid JSON response from AI");
            }

            try { if (rotationManager) rotationManager.recordSuccess(); } catch (_) {}

            return data;
        }, {
            maxRetries: 3,
            baseDelayMs: 2000,
            onRetry: (attempt, max, delay, err) => {
                console.warn(`AI Review retry ${attempt}/${max} in ${delay}ms: ${err.message}`);
                if (rotationManager) {
                    if (rotationManager.constructor.isQuotaError(err) || rotationManager.constructor.isAuthError(err)) {
                        console.error(`❌ API key issue (quota or auth) detected, rotating to next API key...`);
                        rotationManager.handleQuotaExhausted();
                    } else if (rotationManager.constructor.isRateLimitError(err)) {
                        console.warn('⚠️ Rate limit detected, rotating API key...');
                        rotationManager.handleRateLimit();
                    }
                }
            }
        });

        return NextResponse.json({ success: true, review: reviewData });
    } catch (error) {
        console.error("AI Playground Review Error:", error);
        return NextResponse.json({ error: "Failed to perform AI code review" }, { status: 500 });
    }
}

