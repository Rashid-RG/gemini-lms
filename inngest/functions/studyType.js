import { db } from "@/configs/db";
import { inngest } from "../client";
import { STUDY_TYPE_CONTENT_TABLE, CONTENT_REVIEW_TABLE } from "@/configs/schema";
import { eq } from "drizzle-orm";
import { GenerateStudyTypeContentAiModel, GenerateMCQAiModel, GenerateQuizAiModel } from "@/configs/AiModel";
import { safeJsonParse, retryWithBackoff } from "@/lib/rateLimit";
import { handleAIError } from "./aiHelper";
import { AI_TIMEOUTS } from "@/lib/constants";

export const GenerateStudyTypeContent = inngest.createFunction(
    { id: 'Generate Study Type Content', retries: 2 },
    { event: 'studyType.content' },
    async ({ event, step }) => {
        try {
            const { studyType, prompt, courseId, recordId } = event.data;

            if (!studyType || !prompt || !recordId) {
                console.error('GenerateStudyTypeContent: Missing required data', { studyType, recordId });
                throw new Error('Missing required fields: studyType, prompt, or recordId');
            }

            const AiResult = await step.run('Generating Study Content using AI', async () => {
                const result = await retryWithBackoff(async () => {
                    const timeoutMs = AI_TIMEOUTS.STUDY_CONTENT + (Math.random() * 5000);
                    const timeoutPromise = new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Study content timeout')), timeoutMs)
                    );
                    
                    const aiPromise = 
                        studyType === 'Flashcard' ? GenerateStudyTypeContentAiModel.sendMessage(prompt) :
                        studyType === 'MCQ' ? GenerateMCQAiModel.sendMessage(prompt) :
                        GenerateQuizAiModel.sendMessage(prompt);
                    
                    const aiResponse = await Promise.race([aiPromise, timeoutPromise]);
                    
                    const responseText = aiResponse.response.text();
                    const { data, error } = safeJsonParse(responseText);
                    
                    if (error) {
                        console.error('Failed to parse AI response for', studyType, ':', error.message);
                        throw new Error(`Invalid JSON response from AI: ${error.message}`);
                    }
                    
                    if (studyType === 'Flashcard') {
                        const flashcards = Array.isArray(data) ? data : data?.flashcards || data?.cards || [];
                        if (!Array.isArray(flashcards) || flashcards.length < 3) {
                            throw new Error('Insufficient flashcard data received');
                        }
                        const validFlashcards = flashcards.filter(f => f && f.front && f.back);
                        if (validFlashcards.length < 3) {
                            throw new Error('Not enough valid flashcards');
                        }
                        return validFlashcards;
                    }
                    
                    return data;
                }, {
                    maxRetries: 3,
                    baseDelayMs: 2000,
                    maxDelayMs: 20000,
                    onRetry: (attempt, max, delay, err) => {
                        handleAIError(err);
                        console.log(`AI retry ${attempt}/${max} for ${studyType} after ${delay}ms. Error: ${err.message}`);
                    }
                });
                
                return result;
            });

            await step.run('Save Result to DB', async () => {
                await db.update(STUDY_TYPE_CONTENT_TABLE)
                    .set({
                        content: AiResult,
                        status: 'Ready'
                    }).where(eq(STUDY_TYPE_CONTENT_TABLE.id, recordId));
                
                return 'Data Inserted';
            });

            await step.run('Queue Content for Review', async () => {
                try {
                    const contentTypeMap = {
                        'Flashcard': 'flashcards',
                        'Quiz': 'quiz',
                        'MCQ': 'mcq',
                    };
                    await db.insert(CONTENT_REVIEW_TABLE).values({
                        courseId: courseId,
                        contentType: contentTypeMap[studyType] || studyType.toLowerCase(),
                        contentId: String(recordId),
                        status: 'pending',
                        originalContent: AiResult,
                        priority: 'normal',
                        flaggedBy: 'system',
                        flagReason: `Auto-queued: AI-generated ${studyType} content`,
                        autoFlagged: true,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    });
                    return 'Review item created';
                } catch (reviewErr) {
                    console.error('Failed to create review item (non-fatal):', reviewErr.message);
                    return 'Review creation skipped';
                }
            });

            return { success: true };
        } catch (err) {
            console.error('GenerateStudyTypeContent error:', err);
            
            try {
                const { recordId } = event.data;
                if (recordId) {
                    await db.update(STUDY_TYPE_CONTENT_TABLE)
                        .set({ status: 'Error' })
                        .where(eq(STUDY_TYPE_CONTENT_TABLE.id, recordId));
                }
            } catch (dbErr) {
                console.error('Failed to update error status:', dbErr);
            }
            
            throw err;
        }
    }
);
