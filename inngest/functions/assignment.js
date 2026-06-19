import { db } from "@/configs/db";
import { inngest } from "../client";
import { ASSIGNMENT_SUBMISSIONS_TABLE, STUDENT_PROGRESS_TABLE, COURSE_ASSIGNMENTS_TABLE } from "@/configs/schema";
import { eq, and } from "drizzle-orm";
import { AssignmentGradingAiModel, GenerateAssignmentsAiModel } from "@/configs/AiModel";
import { v4 as uuidv4 } from "uuid";
import { safeJsonParse } from "@/lib/rateLimit";
import { handleAIError } from "./aiHelper";
import { AI_TIMEOUTS } from "@/lib/constants";

export const GradeAssignment = inngest.createFunction(
    { id: 'grade-assignment', retries: 3, concurrency: { limit: 1 } },
    { event: 'assignment.grade' },
    async ({ event, step }) => {
        try {
            const { submission } = event.data;
            
            if (!submission) {
                console.error('No submission data provided');
                throw new Error('No submission data provided');
            }

            const assignment = await step.run('Get assignment details', async () => {
                const result = await db.select().from(COURSE_ASSIGNMENTS_TABLE)
                    .where(eq(COURSE_ASSIGNMENTS_TABLE.assignmentId, submission.assignmentId));
                return result[0];
            });

            const gradingResult = await step.run('Grade assignment with AI', async () => {
                let submissionContext = '';
                if (submission.submissionType === 'code') {
                    submissionContext = `\n\nSubmission Type: CODE SUBMISSION\nProgramming Language: ${submission.language || 'Not specified'}\n`;
                } else if (submission.submissionType === 'document') {
                    submissionContext = `\n\nSubmission Type: DOCUMENT/FILE\n`;
                } else {
                    submissionContext = `\n\nSubmission Type: TEXT ANSWER\n`;
                }

                let rubricGuide = '';
                if (assignment?.rubric) {
                    try {
                        const rubric = typeof assignment.rubric === 'string' ? JSON.parse(assignment.rubric) : assignment.rubric;
                        rubricGuide = `\nRubric Criteria:\n`;
                        if (Array.isArray(rubric)) {
                            rubric.forEach((criteria, idx) => {
                                rubricGuide += `${idx + 1}. ${criteria.name || criteria.criterion || 'Criterion ' + (idx + 1)}: ${criteria.description || ''} (${criteria.weight || ''}%)\n`;
                            });
                        } else if (typeof rubric === 'object') {
                            Object.entries(rubric).forEach(([key, value]) => {
                                rubricGuide += `- ${key}: ${value}\n`;
                            });
                        }
                    } catch (e) {
                        console.warn('Could not parse rubric:', e.message);
                    }
                }

                const GRADING_PROMPT = `You are a STRICT assignment grader. Grade ONLY based on ANSWER CORRECTNESS. Do NOT give points for effort, length, or formatting.

ASSIGNMENT DETAILS:
==================
Title: "${assignment?.title || 'Unknown'}"
Description: "${assignment?.description || ''}"
${rubricGuide}${submissionContext}

STUDENT ANSWER:
===============
${submission.submission}

CRITICAL GRADING RULES:
=======================
1. ONLY grade based on whether the answer is CORRECT
2. If the answer is WRONG → give exactly 0 points (not 1, not 5, not 10 - exactly 0)
3. If the answer is PARTIALLY correct → give 30-60 points based on how much is correct
4. If the answer is MOSTLY correct with minor errors → give 61-85 points
5. If the answer is FULLY correct → give 86-100 points

WRONG ANSWER = 0 POINTS. No exceptions.

DO NOT consider:
- Submission length (long wrong answers still get 0)
- Effort or attempt (wrong answers with effort still get 0)
- Formatting or presentation
- How much they wrote

ONLY consider:
- Is the answer FACTUALLY CORRECT?
- Does it CORRECTLY answer what was asked?
- Are the concepts/solutions ACCURATE?

${submission.submissionType === 'code' ? `CODE GRADING:
- Does the code actually WORK and produce correct output?
- Does it solve the problem correctly?
- Wrong logic = 0 points regardless of how much code` : `TEXT GRADING:
- Is the information provided ACCURATE?
- Does it correctly answer the question?
- Wrong information = 0 points regardless of length`}

FEEDBACK FORMAT - Return ONLY valid JSON:
{
  "score": <0-100 based ONLY on correctness - WRONG answers must be 0>,
  "feedback": "<Explain what is correct and what is wrong. Be specific about errors.>",
  "strengths": ["<What they got right>", "<Correct concepts>"],
  "improvements": ["<What is wrong>", "<What the correct answer should include>", "<Specific errors to fix>"]
}

STRICT SCORING:
===============
90-100: Answer is FULLY CORRECT and complete
70-89: Answer is MOSTLY correct, only minor errors
40-69: Answer is PARTIALLY correct, some parts right some wrong
1-39: Answer has very few correct elements
0: Answer is WRONG, irrelevant, incorrect, or doesn't answer the question

CRITICAL: WRONG ANSWER = 0 POINTS. NOT 5, NOT 10, NOT 15. EXACTLY 0.
A long detailed WRONG answer = 0 points.
A short CORRECT answer = 90-100 points.
Grade CORRECTNESS ONLY.`;

                const maxRetries = 5;
                let lastError = null;
                
                for (let attempt = 0; attempt < maxRetries; attempt++) {
                    try {
                        if (attempt > 0) {
                            const delayMs = Math.min(2000 * Math.pow(2, attempt), 30000);
                            console.log(`AI grading attempt ${attempt + 1}/${maxRetries}, waiting ${delayMs}ms...`);
                            await new Promise(resolve => setTimeout(resolve, delayMs));
                        }

                        const timeoutMs = AI_TIMEOUTS.GRADING + Math.random() * 15000;
                        const timeoutPromise = new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('Grading timeout')), timeoutMs)
                        );
                        const aiPromise = AssignmentGradingAiModel.sendMessage(GRADING_PROMPT);
                        const aiResponse = await Promise.race([aiPromise, timeoutPromise]);
                        
                        let responseText = aiResponse.response.text().trim();
                        
                        console.log('Raw AI Response:', responseText.substring(0, 300));
                        
                        if (responseText.includes('```json')) {
                            responseText = responseText.split('```json')[1]?.split('```')[0]?.trim() || responseText;
                        } else if (responseText.includes('```')) {
                            responseText = responseText.split('```')[1]?.split('```')[0]?.trim() || responseText;
                        }
                        
                        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
                        if (jsonMatch) {
                            responseText = jsonMatch[0];
                        }
                        
                        console.log('Cleaned Response:', responseText.substring(0, 300));
                        
                        const gradingData = JSON.parse(responseText);
                        
                        gradingData.score = Math.min(Math.max(parseInt(gradingData.score) || 0, 0), 100);
                        gradingData.feedback = gradingData.feedback || 'No feedback available';
                        gradingData.strengths = Array.isArray(gradingData.strengths) ? gradingData.strengths.filter(s => s && typeof s === 'string').slice(0, 5) : ['Submission received'];
                        gradingData.improvements = Array.isArray(gradingData.improvements) ? gradingData.improvements.filter(i => i && typeof i === 'string').slice(0, 5) : ['Review feedback for improvements'];
                        
                        return gradingData;
                        
                    } catch (attemptErr) {
                        lastError = attemptErr;
                        handleAIError(attemptErr);
                        console.error(`AI Grading attempt ${attempt + 1}/${maxRetries} failed:`, attemptErr.message);
                        
                        const isRateLimit = attemptErr.message?.includes('429') || 
                                           attemptErr.message?.toLowerCase().includes('quota') ||
                                           attemptErr.message?.toLowerCase().includes('rate') ||
                                           attemptErr.message?.toLowerCase().includes('resource');
                        
                        const isDailyQuotaExceeded = attemptErr.message?.includes('free_tier_requests') ||
                                                     attemptErr.message?.includes('FreeTier') ||
                                                     attemptErr.message?.includes('limit: 20');
                        
                        if (isRateLimit) {
                            console.log('Rate limit detected, will retry with longer wait...');
                        }
                        
                        if (isDailyQuotaExceeded) {
                            console.log('Daily quota exceeded - stopping retries and falling back to PendingReview');
                            break;
                        }
                    }
                }
                
                console.error('All AI grading attempts failed after', maxRetries, 'tries:', lastError?.message);
                
                const submissionText = submission.submission?.trim() || '';
                const submissionLength = submissionText.length;
                const isQuotaError = lastError?.message?.includes('quota') || 
                                     lastError?.message?.includes('429') ||
                                     lastError?.message?.includes('FreeTier');
                
                return {
                    score: 0,
                    feedback: isQuotaError 
                        ? `AI grading service has reached its daily limit. Your submission (${submissionLength} characters) has been saved and will be graded when the quota resets (usually within 24 hours). You can also click "Retry AI Grading" later, or request a manual review from an instructor.`
                        : `AI grading encountered an error. Your submission has been saved. Please try "Retry AI Grading" or request a manual review.`,
                    strengths: ['Submission received successfully', 'Content saved for review'],
                    improvements: ['AI grading temporarily unavailable', 'Try again later or request manual review'],
                    isFallback: true,
                    isQuotaError: isQuotaError
                };
            });

            const updatedSubmission = await step.run('Update submission with grades', async () => {
                const updateData = {
                    score: gradingResult.score,
                    feedback: gradingResult.feedback,
                    strengths: gradingResult.strengths,
                    improvements: gradingResult.improvements,
                    status: gradingResult.isFallback ? 'PendingReview' : 'Graded',
                    gradedAt: new Date(),
                    gradedBy: gradingResult.isFallback ? 'Fallback' : 'AI',
                    reviewRequested: gradingResult.isFallback ? true : false,
                    reviewRequestedAt: gradingResult.isFallback ? new Date() : null,
                    reviewReason: gradingResult.isFallback ? 'AI grading unavailable - quota exceeded' : null
                };

                const result = await db.update(ASSIGNMENT_SUBMISSIONS_TABLE)
                    .set(updateData)
                    .where(eq(ASSIGNMENT_SUBMISSIONS_TABLE.id, submission.id))
                    .returning();
                
                return result[0];
            });

            if (!gradingResult.isFallback) {
                await step.run('Update student progress', async () => {
                    const progress = await db.select().from(STUDENT_PROGRESS_TABLE)
                        .where(
                            and(
                                eq(STUDENT_PROGRESS_TABLE.courseId, submission.courseId),
                                eq(STUDENT_PROGRESS_TABLE.studentEmail, submission.studentEmail)
                            )
                        );

                    if (progress.length > 0) {
                        let assignmentScores;
                        if (typeof progress[0].assignmentScores === 'string') {
                            assignmentScores = JSON.parse(progress[0].assignmentScores || '{}');
                        } else {
                            assignmentScores = progress[0].assignmentScores || {};
                        }
                        
                        assignmentScores[submission.assignmentId] = gradingResult.score;
                        
                        let quizScores;
                        if (typeof progress[0].quizScores === 'string') {
                            quizScores = JSON.parse(progress[0].quizScores || '{}');
                        } else {
                            quizScores = progress[0].quizScores || {};
                        }
                        
                        const quizArray = Object.values(quizScores);
                        const assignmentArray = Object.values(assignmentScores);
                        const allScores = [...quizArray, ...assignmentArray];
                        const finalScore = allScores.length > 0 
                            ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
                            : 0;

                        await db.update(STUDENT_PROGRESS_TABLE)
                            .set({
                                assignmentScores: JSON.stringify(assignmentScores),
                                finalScore,
                                lastActivityAt: new Date()
                            })
                            .where(
                                and(
                                    eq(STUDENT_PROGRESS_TABLE.courseId, submission.courseId),
                                    eq(STUDENT_PROGRESS_TABLE.studentEmail, submission.studentEmail)
                                )
                            );
                    }
                });
            }

            console.log(`Assignment graded: ${submission.assignmentId} - Score: ${gradingResult.score}`);
            return { success: true, submission: updatedSubmission };
        } catch (err) {
            console.error('GradeAssignment error:', err);
            throw err;
        }
    }
);

export const GenerateAssignments = inngest.createFunction(
    { id: 'generate-assignments', retries: 2 },
    { event: 'assignments.generate' },
    async ({ event, step }) => {
        try {
            const { course } = event.data;
            
            if (!course) {
                console.error('GenerateAssignments: No course data provided');
                throw new Error('No course data provided');
            }

            const assignmentsResult = await step.run('Generate assignments with AI', async () => {
                let courseLayout = course?.courseLayout;
                if (typeof courseLayout === 'string') {
                    try {
                        courseLayout = JSON.parse(courseLayout);
                    } catch (e) {
                        console.error('GenerateAssignments: Failed to parse courseLayout', e);
                        courseLayout = {};
                    }
                }
                const chapters = courseLayout?.chapters || [];
                const ASSIGNMENT_PROMPT = `
                    Generate exactly 1 comprehensive assignment for a ${course?.courseType} course on "${course?.topic}" with difficulty level "${course?.difficultyLevel}".
                    The course has these chapters: ${chapters.map(c => c.chapter_title || c.chapterTitle).join(', ')}.
                    
                    This single assignment should:
                    - Cover the main concepts from all chapters
                    - Have a clear, specific title related to the course topic
                    - Include a detailed description of what students should do
                    - Be worth 100 points
                    - Have a rubric with 4 grading criteria and their point values
                    - Have a reasonable dueDate (7 days from today)
                    
                    Return a JSON array with exactly 1 assignment having: title, description, totalPoints, rubric (as object with criteria), and dueDate.
                `;

                let retries = 0;
                const maxRetries = 3;
                
                while (retries < maxRetries) {
                    try {
                        const timeoutMs = AI_TIMEOUTS.ASSIGNMENTS + Math.random() * 15000;
                        const timeoutPromise = new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('Assignment generation timeout')), timeoutMs)
                        );
                        const aiPromise = GenerateAssignmentsAiModel.sendMessage(ASSIGNMENT_PROMPT);
                        const aiResponse = await Promise.race([aiPromise, timeoutPromise]);
                        
                        const { data, error } = safeJsonParse(aiResponse.response.text());
                        if (error) {
                            throw new Error('Invalid JSON response from AI');
                        }
                        return Array.isArray(data) ? data : [data];
                    } catch (aiErr) {
                        const errorMsg = aiErr.message?.toLowerCase() || '';
                        const isRetryable = aiErr.status === 429 || aiErr.status === 503 || 
                                           errorMsg.includes('timeout') || errorMsg.includes('rate') ||
                                           errorMsg.includes('quota') || errorMsg.includes('overloaded');
                        if (isRetryable && retries < maxRetries - 1) {
                            const waitTime = (retries + 1) * 4000;
                            console.log(`Assignment API issue. Waiting ${waitTime/1000}s before retry ${retries + 1}/${maxRetries}`);
                            await new Promise(resolve => setTimeout(resolve, waitTime));
                            retries++;
                        } else {
                            handleAIError(aiErr);
                            console.error('AI Assignment Generation Error:', aiErr.message);
                            return [
                                {
                                    title: 'Chapter Review Assignment',
                                    description: `Review and summarize the key concepts from the ${course?.topic} course.`,
                                    totalPoints: 100,
                                    rubric: { completeness: 40, accuracy: 40, clarity: 20 },
                                    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                                }
                            ];
                        }
                    }
                }
            });

            const savedAssignments = await step.run('Save assignments to database', async () => {
                const results = [];
                const now = new Date();
                for (let i = 0; i < assignmentsResult.length; i++) {
                    const assignment = assignmentsResult[i];
                    try {
                        const assignmentId = uuidv4();
                        const dueDate = new Date(now);
                        dueDate.setDate(dueDate.getDate() + (7 * (i + 1)));
                        
                        const result = await db
                            .insert(COURSE_ASSIGNMENTS_TABLE)
                            .values({
                                courseId: course.courseId,
                                assignmentId,
                                title: assignment.title,
                                description: assignment.description,
                                totalPoints: assignment.totalPoints || 100,
                                rubric: JSON.stringify(assignment.rubric || {}),
                                dueDate: dueDate,
                            })
                            .returning();
                        results.push(result[0]);
                    } catch (dbErr) {
                        console.error('Error saving assignment:', dbErr);
                    }
                }
                return results;
            });

            console.log(`Generated ${savedAssignments.length} assignments for course: ${course.courseId}`);
            return { success: true, assignments: savedAssignments };
        } catch (err) {
            console.error('GenerateAssignments error:', err);
            throw err;
        }
    }
);
