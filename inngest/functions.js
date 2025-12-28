import { db } from "@/configs/db";
import { inngest } from "./client";
import { CHAPTER_NOTES_TABLE, STUDY_MATERIAL_TABLE, STUDY_TYPE_CONTENT_TABLE, USER_TABLE, ASSIGNMENT_SUBMISSIONS_TABLE, STUDENT_PROGRESS_TABLE, COURSE_ASSIGNMENTS_TABLE, ADAPTIVE_PERFORMANCE_TABLE, CREDIT_TRANSACTION_TABLE } from "@/configs/schema";
import { eq, and, lt, sql } from "drizzle-orm";
import { courseOutlineAIModel, generateNotesAiModel, GenerateQuizAiModel, GenerateStudyTypeContentAiModel, AssignmentGradingAiModel, GenerateAssignmentsAiModel, GenerateMCQAiModel } from "@/configs/AiModel";
import { Resend } from "resend";
import { getMasterySummary } from "@/lib/adaptiveDifficulty";
import { buildReminderEmailHTML } from "@/lib/reminderEmail";
import { v4 as uuidv4 } from "uuid";
import { safeJsonParse, retryWithBackoff } from "@/lib/rateLimit";
import { initializeUserCredits, refundCourseCredits } from "@/lib/credits";
import { emailService } from "@/lib/emailService";

export const helloWorld = inngest.createFunction(
    { id: "hello-world" },
    { event: "test/hello.world" },
    async ({ event, step }) => {
        await step.sleep("wait-a-moment", "1s");
        return { event, body: "Hello, World!" };
    },
);

export const CreateNewUser = inngest.createFunction(
    { id: 'create-user',retries:1 },
    { event: 'user.create' },
    async ({ event, step }) => {
        const {user}=event.data;
        // Get Event Data
        const result = await step.run('Check User and create New if Not in DB', async () => {
            // Try multiple email sources (Clerk can have email in different places depending on auth method)
            const email = user?.primaryEmailAddress?.emailAddress 
                || user?.emailAddresses?.[0]?.emailAddress 
                || user?.email;
            
            // Validate email exists before proceeding
            if (!email) {
                console.error('CreateNewUser: No email found for user', JSON.stringify(user, null, 2));
                return { error: 'No email found for user', skipped: true };
            }
            
            // Check Is User Already Exist
            const result = await db.select().from(USER_TABLE)
                .where(eq(USER_TABLE.email, email))

            if (result?.length == 0) {
                //If Not, Then add to DB with initial credits
                const userResp = await db.insert(USER_TABLE).values({
                    name: user?.fullName || user?.firstName || 'User',
                    email: email,
                    credits: 5,
                    totalCreditsUsed: 0,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }).returning({ USER_TABLE })
                
                // Log the initial credit grant
                await initializeUserCredits(email, 5);
                
                return userResp;
            }

            return result;
        })

        // Send Welcome Email
        try {
            const email = user?.primaryEmailAddress?.emailAddress 
                || user?.emailAddresses?.[0]?.emailAddress 
                || user?.email;
            
            const firstName = user?.firstName || user?.fullName?.split(' ')[0] || 'User';
            
            await step.run('send-welcome-email', async () => {
                return await emailService.sendWelcomeEmail(email, firstName);
            });
        } catch (emailError) {
            console.error('Welcome email failed (non-fatal):', emailError?.message);
            // Don't fail the entire function if email fails
        }

        return 'Success';
    }
)

export const GenerateNotes=inngest.createFunction(
    {
        id:'generate-course',
        retries:3, 
        concurrency: { limit: 2 },
        // Called when all retries are exhausted - ensures cleanup happens
        onFailure: async ({ event, error }) => {
            console.error('GenerateNotes failed permanently:', error.message);
            try {
                const courseId = event.data?.course?.courseId;
                const createdBy = event.data?.course?.createdBy;
                if (courseId) {
                    await db.update(STUDY_MATERIAL_TABLE).set({
                        status: 'Error'
                    }).where(eq(STUDY_MATERIAL_TABLE.courseId, courseId));
                    console.log('onFailure: Updated course status to Error:', courseId);
                    
                    if (createdBy) {
                        await refundCourseCredits(createdBy, courseId, 'Course generation failed after retries');
                    }
                }
            } catch (e) {
                console.error('onFailure cleanup failed:', e);
            }
        }
    },
    {event:'notes.generate'},
    async({event,step})=>{
        try {
            const {course}=event.data; // All Record Info
            
            if (!course) {
                console.error('GenerateNotes: No course data provided');
                throw new Error('No course data provided');
            }

            // Parse courseLayout if it's a string (Drizzle may return JSON as string)
            let courseLayout = course?.courseLayout;
            if (typeof courseLayout === 'string') {
                try {
                    courseLayout = JSON.parse(courseLayout);
                } catch (e) {
                    console.error('GenerateNotes: Failed to parse courseLayout', e);
                }
            }

            const Chapters = courseLayout?.chapters;
            if (!Chapters || !Array.isArray(Chapters)) {
                console.error('GenerateNotes: No chapters found', { 
                    courseId: course?.courseId,
                    courseLayoutType: typeof courseLayout,
                    hasChapters: !!courseLayout?.chapters
                });
                // Still update status to avoid stuck "Generating" state
                await db.update(STUDY_MATERIAL_TABLE).set({
                    status:'Error'
                }).where(eq(STUDY_MATERIAL_TABLE.courseId,course?.courseId));
                throw new Error('No chapters found in course layout');
            }

            // Generate Notes for Each Chapter with AI - SEQUENTIAL with retry
            const notesResult=await step.run('Generate Chapter Notes',async()=>{
                // Process chapters SEQUENTIALLY to avoid rate limits
                for (let index = 0; index < Chapters.length; index++) {
                    const chapter = Chapters[index];
                    
                    // Retry logic for each chapter
                    let success = false;
                    let lastError = null;
                    
                    for (let attempt = 0; attempt < 3 && !success; attempt++) {
                        try {
                            // Stagger requests - wait between chapters
                            if (index > 0 || attempt > 0) {
                                const delay = attempt === 0 ? 1500 : 3000 * (attempt + 1);
                                await new Promise(resolve => setTimeout(resolve, delay));
                            }
                            
                            // Simplified prompt for faster generation
                            const PROMPT=`Generate study notes in HTML for: ${chapter.chapter_title || chapter.chapterTitle}
Topics: ${(chapter.topics || []).join(', ')}
Use <h3> headings, <ul><li> lists, <pre><code> for code. Max 1200 words.`;
                            
                            // Longer timeout to handle slow API responses
                            const timeoutPromise = new Promise((_, reject) => 
                                setTimeout(() => reject(new Error('Notes generation timeout')), 45000)
                            );
                            const result = await Promise.race([
                                generateNotesAiModel.sendMessage(PROMPT),
                                timeoutPromise
                            ]);
                            
                            const aiResp=result.response.text();
                            console.log('Chapter notes generated for index:', index, 'attempt:', attempt + 1);
                            await db.insert(CHAPTER_NOTES_TABLE).values({
                                chapterId:index,
                                courseId:course?.courseId,
                                notes:aiResp
                            });
                            success = true;
                        } catch (chapterErr) {
                            lastError = chapterErr;
                            console.error('Error generating notes for chapter', index, 'attempt', attempt + 1, ':', chapterErr.message);
                            
                            // Check if it's a rate limit - wait longer
                            const isRateLimit = chapterErr.message?.includes('429') || 
                                               chapterErr.message?.toLowerCase().includes('quota') ||
                                               chapterErr.message?.toLowerCase().includes('rate');
                            if (isRateLimit && attempt < 2) {
                                console.log('Rate limit detected, waiting longer...');
                                await new Promise(resolve => setTimeout(resolve, 5000 * (attempt + 1)));
                            }
                        }
                    }
                    
                    // If all retries failed, insert placeholder
                    if (!success) {
                        console.error('All retries failed for chapter', index, lastError?.message);
                        await db.insert(CHAPTER_NOTES_TABLE).values({
                            chapterId:index,
                            courseId:course?.courseId,
                            notes:`<h3>${chapter.chapter_title || chapter.chapterTitle || 'Chapter ' + (index+1)}</h3><p>Notes generation temporarily unavailable. Please try regenerating later.</p>`
                        }).catch(() => {});
                    }
                }
                return Chapters;
            })

            // Update Status to 'Ready'
            const updateCourseStatusResult=await step.run('Update Course Status to Ready',async()=>{
                const result=await db.update(STUDY_MATERIAL_TABLE).set({
                    status:'Ready'
                }).where(eq(STUDY_MATERIAL_TABLE.courseId,course?.courseId))
                return 'Success';
            });

            return { success: true };
        } catch (err) {
            console.error('GenerateNotes unhandled error:', err);
            
            // CRITICAL: Update status to 'Error' so course doesn't stay stuck forever
            try {
                const courseId = event.data?.course?.courseId;
                if (courseId) {
                    await db.update(STUDY_MATERIAL_TABLE).set({
                        status: 'Error'
                    }).where(eq(STUDY_MATERIAL_TABLE.courseId, courseId));
                    console.log('Updated course status to Error:', courseId);
                    
                    // Refund the credit since generation failed
                    const createdBy = event.data?.course?.createdBy;
                    if (createdBy) {
                        await refundCourseCredits(createdBy, courseId, 'Course generation failed');
                        console.log('Refunded credit to user:', createdBy);
                    }
                }
            } catch (updateErr) {
                console.error('Failed to update course status to Error:', updateErr);
            }
            
            throw err;
        }
    }
)


// Used to generate Flashcard, Quiz, Question Answer
export const GenerateStudyTypeContent=inngest.createFunction(
    {id:'Generate Study Type Content',retries:2},
    {event:'studyType.content'},

    async({event,step})=>{
        try {
            const {studyType,prompt,courseId,recordId}=event.data;

            if (!studyType || !prompt || !recordId) {
                console.error('GenerateStudyTypeContent: Missing required data', {studyType, recordId});
                throw new Error('Missing required fields: studyType, prompt, or recordId');
            }

            const AiResult= await step.run('Generating Study Content using AI',async()=>{
                // Use retry with exponential backoff for AI calls
                const result = await retryWithBackoff(async () => {
                    // Generous timeout for AI response
                    const timeoutPromise = new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Study content timeout')), 40000)
                    );
                    
                    const aiPromise = 
                        studyType=='Flashcard' ? GenerateStudyTypeContentAiModel.sendMessage(prompt) :
                        studyType=='MCQ' ? GenerateMCQAiModel.sendMessage(prompt) :
                        GenerateQuizAiModel.sendMessage(prompt);
                    
                    const aiResponse = await Promise.race([aiPromise, timeoutPromise]);
                    
                    const responseText = aiResponse.response.text();
                    const { data, error } = safeJsonParse(responseText);
                    
                    if (error) {
                        console.error('Failed to parse AI response for', studyType, ':', error.message);
                        throw new Error(`Invalid JSON response from AI: ${error.message}`);
                    }
                    
                    // Validate we have usable data
                    if (studyType === 'Flashcard') {
                        // For flashcards, we need an array with at least 3 items
                        const flashcards = Array.isArray(data) ? data : data?.flashcards || data?.cards || [];
                        if (!Array.isArray(flashcards) || flashcards.length < 3) {
                            throw new Error('Insufficient flashcard data received');
                        }
                        // Filter to only valid flashcards
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
                        console.log(`AI retry ${attempt}/${max} for ${studyType} after ${delay}ms. Error: ${err.message}`);
                    }
                });
                
                return result;
            })

            // Save the Result
            const DbResult=await step.run('Save Result to DB',async()=>{
                const result=await db.update(STUDY_TYPE_CONTENT_TABLE)
                .set({
                    content:AiResult,
                    status:'Ready'
                }).where(eq(STUDY_TYPE_CONTENT_TABLE.id,recordId))
                
                return 'Data Inserted'
            })

            return { success: true };
        } catch (err) {
            console.error('GenerateStudyTypeContent error:', err);
            
            // Update status to Error so UI doesn't show infinite loading
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

)

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

            // Get assignment details
            const assignment = await step.run('Get assignment details', async () => {
                const result = await db.select().from(COURSE_ASSIGNMENTS_TABLE)
                    .where(eq(COURSE_ASSIGNMENTS_TABLE.assignmentId, submission.assignmentId));
                return result[0];
            });

            // Grade the assignment using AI with robust retry logic
            const gradingResult = await step.run('Grade assignment with AI', async () => {
                // Build context-aware prompt based on submission type
                let submissionContext = '';
                if (submission.submissionType === 'code') {
                    submissionContext = `\n\nSubmission Type: CODE SUBMISSION\nProgramming Language: ${submission.language || 'Not specified'}\n`;
                } else if (submission.submissionType === 'document') {
                    submissionContext = `\n\nSubmission Type: DOCUMENT/FILE\n`;
                } else {
                    submissionContext = `\n\nSubmission Type: TEXT ANSWER\n`;
                }

                // Parse rubric if available
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

                // Robust retry logic with exponential backoff
                const maxRetries = 5;
                let lastError = null;
                
                for (let attempt = 0; attempt < maxRetries; attempt++) {
                    try {
                        // Wait between attempts with exponential backoff
                        if (attempt > 0) {
                            const delayMs = Math.min(2000 * Math.pow(2, attempt), 30000); // 2s, 4s, 8s, 16s, 30s max
                            console.log(`AI grading attempt ${attempt + 1}/${maxRetries}, waiting ${delayMs}ms...`);
                            await new Promise(resolve => setTimeout(resolve, delayMs));
                        }

                        // Longer timeout for grading (60 seconds)
                        const timeoutPromise = new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('Grading timeout')), 60000)
                        );
                        const aiPromise = AssignmentGradingAiModel.sendMessage(GRADING_PROMPT);
                        const aiResponse = await Promise.race([aiPromise, timeoutPromise]);
                        
                        let responseText = aiResponse.response.text().trim();
                        
                        console.log('Raw AI Response:', responseText.substring(0, 300));
                        
                        // Remove markdown code blocks if present
                        if (responseText.includes('```json')) {
                            responseText = responseText.split('```json')[1]?.split('```')[0]?.trim() || responseText;
                        } else if (responseText.includes('```')) {
                            responseText = responseText.split('```')[1]?.split('```')[0]?.trim() || responseText;
                        }
                        
                        // Try to find JSON object if wrapped in text
                        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
                        if (jsonMatch) {
                            responseText = jsonMatch[0];
                        }
                        
                        console.log('Cleaned Response:', responseText.substring(0, 300));
                        
                        const gradingData = JSON.parse(responseText);
                        
                        // Validate and ensure proper format - ALWAYS 0-100
                        gradingData.score = Math.min(Math.max(parseInt(gradingData.score) || 0, 0), 100);
                        gradingData.feedback = gradingData.feedback || 'No feedback available';
                        gradingData.strengths = Array.isArray(gradingData.strengths) ? gradingData.strengths.filter(s => s && typeof s === 'string').slice(0, 5) : ['Submission received'];
                        gradingData.improvements = Array.isArray(gradingData.improvements) ? gradingData.improvements.filter(i => i && typeof i === 'string').slice(0, 5) : ['Review feedback for improvements'];
                        
                        console.log('Grading Data:', { score: gradingData.score, feedback: gradingData.feedback.substring(0, 150) });
                        
                        // Success! Return the grading data
                        return gradingData;
                        
                    } catch (attemptErr) {
                        lastError = attemptErr;
                        console.error(`AI Grading attempt ${attempt + 1}/${maxRetries} failed:`, attemptErr.message);
                        
                        // Check if it's a rate limit/quota error
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
                        
                        // If daily quota is exceeded, no point in retrying - break out early
                        if (isDailyQuotaExceeded) {
                            console.log('Daily quota exceeded - stopping retries and falling back to PendingReview');
                            break;
                        }
                        
                        // Continue to next retry attempt
                    }
                }
                
                // All retries failed - gracefully fallback to PendingReview instead of throwing
                // This prevents infinite Inngest retries when quota is exhausted
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

            // Update submission with grade and feedback
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

            // Update student progress with assignment score (only if actually graded)
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
                        // Handle both string and object for assignmentScores
                        let assignmentScores;
                        if (typeof progress[0].assignmentScores === 'string') {
                            assignmentScores = JSON.parse(progress[0].assignmentScores || '{}');
                        } else {
                            assignmentScores = progress[0].assignmentScores || {};
                        }
                        
                        assignmentScores[submission.assignmentId] = gradingResult.score;
                        
                        // Calculate new final score
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

            // Generate assignments using AI
            const assignmentsResult = await step.run('Generate assignments with AI', async () => {
                // Parse courseLayout if it's a string
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

                // Improved retry logic with longer timeout
                let retries = 0;
                const maxRetries = 3;
                
                while (retries < maxRetries) {
                    try {
                        // Generous timeout for AI response
                        const timeoutPromise = new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('Assignment generation timeout')), 45000)
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
                            const waitTime = (retries + 1) * 4000; // 4s, 8s, 12s
                            console.log(`Assignment API issue. Waiting ${waitTime/1000}s before retry ${retries + 1}/${maxRetries}`);
                            await new Promise(resolve => setTimeout(resolve, waitTime));
                            retries++;
                        } else {
                            console.error('AI Assignment Generation Error:', aiErr.message);
                            // Return default assignments if AI fails after all retries
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

            // Save assignments to database
            const savedAssignments = await step.run('Save assignments to database', async () => {
                const results = [];
                const now = new Date();
                for (let i = 0; i < assignmentsResult.length; i++) {
                    const assignment = assignmentsResult[i];
                    try {
                        const assignmentId = uuidv4();
                        // Always set due date to (i+1) weeks from now, ignore AI-generated dates
                        const dueDate = new Date(now);
                        dueDate.setDate(dueDate.getDate() + (7 * (i + 1))); // 1 week, 2 weeks, 3 weeks...
                        
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
)

export const SendWeeklyProgressReminders = inngest.createFunction(
    { id: 'weekly-progress-reminders', cron: '0 9 * * 1' },
    async ({ step }) => {
        if (!process.env.RESEND_API_KEY) {
            console.error('SendWeeklyProgressReminders: RESEND_API_KEY missing; skipping run');
            throw new Error('RESEND_API_KEY not configured');
        }

        const resend = new Resend(process.env.RESEND_API_KEY);

        const performance = await step.run('Load performance records', async () => {
            return await db.select().from(ADAPTIVE_PERFORMANCE_TABLE);
        });

        if (!performance?.length) {
            return { message: 'No performance data to send reminders' };
        }

        const courseMeta = await step.run('Load course metadata', async () => {
            return await db
                .select({
                    courseId: STUDY_MATERIAL_TABLE.courseId,
                    topic: STUDY_MATERIAL_TABLE.topic,
                    courseType: STUDY_MATERIAL_TABLE.courseType,
                })
                .from(STUDY_MATERIAL_TABLE);
        });

        const userMeta = await step.run('Load users', async () => {
            return await db.select({ email: USER_TABLE.email, name: USER_TABLE.name }).from(USER_TABLE);
        });

        const courseMap = new Map(courseMeta.map((c) => [c.courseId, c]));
        const userMap = new Map(userMeta.map((u) => [u.email?.toLowerCase(), u]));

        const grouped = new Map();
        for (const row of performance) {
            const key = `${row.studentEmail}|${row.courseId}`;
            if (!grouped.has(key)) {
                grouped.set(key, { studentEmail: row.studentEmail, courseId: row.courseId, records: [] });
            }
            grouped.get(key).records.push(row);
        }

        let sent = 0;
        const failures = [];

        for (const [_, data] of grouped) {
            const { studentEmail, courseId, records } = data;

            const summary = getMasterySummary(records);
            const weakTopics = records
                .filter((r) => r.isWeakTopic)
                .slice(0, 3)
                .map((t) => ({
                    topicName: t.topicName,
                    score: t.averageScore,
                    recommendedDifficulty: t.recommendedDifficulty,
                }));

            const nextAction = records.length
                ? records
                    .slice()
                    .sort((a, b) => {
                        const weakA = a.isWeakTopic ? 0 : 1;
                        const weakB = b.isWeakTopic ? 0 : 1;
                        if (weakA !== weakB) return weakA - weakB;
                        return (a.averageScore || 0) - (b.averageScore || 0);
                    })[0]
                : null;

            const nextActionData = nextAction
                ? {
                    topicName: nextAction.topicName,
                    score: nextAction.averageScore,
                    recommendedDifficulty: nextAction.recommendedDifficulty,
                    isWeakTopic: nextAction.isWeakTopic,
                    suggestion: nextAction.isWeakTopic
                        ? `Revisit ${nextAction.topicName} and take a quiz at ${nextAction.recommendedDifficulty} difficulty.`
                        : `Keep your streak—take a quiz on ${nextAction.topicName} to reinforce learning.`,
                }
                : null;

            const courseName = courseMap.get(courseId)?.topic || 'Your Course';
            const studentName = userMap.get(studentEmail?.toLowerCase())?.name || 'Learner';

            const html = buildReminderEmailHTML({
                studentName,
                courseName,
                overallMastery: summary.overallMastery,
                topicsMastered: summary.topicsMastered,
                topicsNeedingWork: summary.topicsNeedingWork,
                nextActionTopic: nextActionData,
                weakTopics,
            });

            try {
                await step.run(`send-${sent + 1}`, async () => {
                    const res = await resend.emails.send({
                        from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
                        to: studentEmail,
                        subject: `Your Weekly Progress Summary - ${courseName}`,
                        html,
                    });

                    if (res.error) {
                        throw new Error(res.error.message || 'Resend send failed');
                    }

                    return res.data?.id || null;
                });

                sent += 1;
            } catch (err) {
                console.error('Weekly reminder send failed', { studentEmail, courseId, error: err?.message });
                failures.push({ studentEmail, courseId, error: err?.message });
            }
        }

        return { sent, attempted: grouped.size, failures };
    },
);

// Cleanup stale "Generating" courses that have been stuck for too long
// Runs every 15 minutes to check for stuck courses
export const CleanupStaleCourses = inngest.createFunction(
    { id: 'cleanup-stale-courses' },
    { cron: '*/15 * * * *' }, // Every 15 minutes
    async ({ step }) => {
        const STALE_THRESHOLD_MINUTES = 30;
        
        const result = await step.run('Find and cleanup stale courses', async () => {
            const cutoffTime = new Date(Date.now() - STALE_THRESHOLD_MINUTES * 60 * 1000);
            
            // Find courses stuck in "Generating" status for too long
            const staleCourses = await db.select()
                .from(STUDY_MATERIAL_TABLE)
                .where(
                    and(
                        eq(STUDY_MATERIAL_TABLE.status, 'Generating'),
                        lt(STUDY_MATERIAL_TABLE.createdAt, cutoffTime)
                    )
                );
            
            if (staleCourses.length === 0) {
                return { processed: 0, refunded: 0, message: 'No stale courses found' };
            }
            
            let refunded = 0;
            const processedCourses = [];
            
            for (const course of staleCourses) {
                try {
                    // Update course status to Failed
                    await db.update(STUDY_MATERIAL_TABLE)
                        .set({ status: 'Failed' })
                        .where(eq(STUDY_MATERIAL_TABLE.courseId, course.courseId));
                    
                    // Refund credit to user
                    const refundResult = await refundCourseCredits(
                        course.createdBy,
                        course.courseId,
                        `Auto-refund: Course generation timed out after ${STALE_THRESHOLD_MINUTES} minutes`
                    );
                    
                    if (refundResult.success) {
                        refunded++;
                    }
                    
                    processedCourses.push({
                        courseId: course.courseId,
                        topic: course.topic,
                        createdBy: course.createdBy,
                        refunded: refundResult.success
                    });
                    
                    console.log('Cleaned up stale course:', {
                        courseId: course.courseId,
                        topic: course.topic,
                        createdBy: course.createdBy,
                        refunded: refundResult.success
                    });
                } catch (err) {
                    console.error('Failed to cleanup stale course:', course.courseId, err);
                }
            }
            
            return {
                processed: staleCourses.length,
                refunded,
                courses: processedCourses
            };
        });
        
        return result;
    }
);

// Health check function - monitors system status
export const SystemHealthCheck = inngest.createFunction(
    { id: 'system-health-check' },
    { cron: '0 * * * *' }, // Every hour
    async ({ step }) => {
        const healthReport = await step.run('Generate health report', async () => {
            const now = new Date();
            const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
            const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            
            // Count courses by status
            const generatingCourses = await db.select({ count: sql`count(*)` })
                .from(STUDY_MATERIAL_TABLE)
                .where(eq(STUDY_MATERIAL_TABLE.status, 'Generating'));
            
            const failedCourses = await db.select({ count: sql`count(*)` })
                .from(STUDY_MATERIAL_TABLE)
                .where(eq(STUDY_MATERIAL_TABLE.status, 'Failed'));
            
            const readyCourses = await db.select({ count: sql`count(*)` })
                .from(STUDY_MATERIAL_TABLE)
                .where(eq(STUDY_MATERIAL_TABLE.status, 'Ready'));
            
            const errorCourses = await db.select({ count: sql`count(*)` })
                .from(STUDY_MATERIAL_TABLE)
                .where(eq(STUDY_MATERIAL_TABLE.status, 'Error'));
            
            // Count study type content by status
            const generatingContent = await db.select({ count: sql`count(*)` })
                .from(STUDY_TYPE_CONTENT_TABLE)
                .where(eq(STUDY_TYPE_CONTENT_TABLE.status, 'Generating'));
            
            const errorContent = await db.select({ count: sql`count(*)` })
                .from(STUDY_TYPE_CONTENT_TABLE)
                .where(eq(STUDY_TYPE_CONTENT_TABLE.status, 'Error'));
            
            // Total users
            const totalUsers = await db.select({ count: sql`count(*)` })
                .from(USER_TABLE);
            
            return {
                timestamp: now.toISOString(),
                courses: {
                    generating: Number(generatingCourses[0]?.count || 0),
                    ready: Number(readyCourses[0]?.count || 0),
                    failed: Number(failedCourses[0]?.count || 0),
                    error: Number(errorCourses[0]?.count || 0)
                },
                studyContent: {
                    generating: Number(generatingContent[0]?.count || 0),
                    error: Number(errorContent[0]?.count || 0)
                },
                users: {
                    total: Number(totalUsers[0]?.count || 0)
                }
            };
        });
        
        // Log health report
        console.log('System Health Report:', JSON.stringify(healthReport, null, 2));
        
        return healthReport;
    }
);
