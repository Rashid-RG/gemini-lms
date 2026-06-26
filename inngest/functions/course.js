import { db } from "@/configs/db";
import { inngest } from "../client";
import { CHAPTER_NOTES_TABLE, STUDY_MATERIAL_TABLE, CONTENT_REVIEW_TABLE, ADMIN_TABLE } from "@/configs/schema";
import { eq, and } from "drizzle-orm";
import { emailService } from "@/lib/emailService";
import { generateNotesAiModel } from "@/configs/AiModel";
import { refundCourseCredits } from "@/lib/credits";
import { handleAIError } from "./aiHelper";
import { AI_TIMEOUTS } from "@/lib/constants";

export const GenerateNotes = inngest.createFunction(
    {
        id: 'generate-course',
        retries: 3, 
        concurrency: { limit: 2 },
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
    { event: 'notes.generate' },
    async ({ event, step }) => {
        try {
            const { course } = event.data;
            
            if (!course) {
                console.error('GenerateNotes: No course data provided');
                throw new Error('No course data provided');
            }

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
                await db.update(STUDY_MATERIAL_TABLE).set({
                    status: 'Error'
                }).where(eq(STUDY_MATERIAL_TABLE.courseId, course?.courseId));
                throw new Error('No chapters found in course layout');
            }

            for (let index = 0; index < Chapters.length; index++) {
                const chapter = Chapters[index];
                
                await step.run(`Generate Chapter Notes - Chapter ${index + 1}`, async () => {
                    let success = false;
                    let lastError = null;
                    let aiResp = "";
                    
                    for (let attempt = 0; attempt < 3 && !success; attempt++) {
                        try {
                            if (attempt > 0) {
                                await new Promise(resolve => setTimeout(resolve, 3000 * (attempt + 1)));
                            }
                            
                            const PROMPT = `Generate beautifully formatted study notes in HTML for:
Chapter: ${chapter.chapter_title || chapter.chapterTitle}
Topics: ${(chapter.topics || []).join(', ')}

FORMAT RULES (strictly follow):
- Start with an <h2> chapter title with an emoji prefix (e.g. "📘 Chapter Title")
- Add a brief intro paragraph after the title
- Use <h3> with emoji for each topic heading (e.g. "🔹 Topic Name")
- Use <h4> for subtopics
- Use <p> for paragraphs (3-4 sentences max)
- Use <strong> to bold key terms and definitions
- Use <ul><li> or <ol><li> for lists
- Use <pre><code> for code examples with inline comments
- Add a <blockquote> for important tips or common mistakes
- End with a <div class="summary-box"><h4>📝 Key Takeaways</h4><ul>...</ul></div>
- Use <hr> between major sections
- Max 1200 words, clean semantic HTML only, no CSS or style attributes`;
                            
                            const timeoutMs = AI_TIMEOUTS.NOTES + (attempt * 15000);
                            const timeoutPromise = new Promise((_, reject) => 
                                setTimeout(() => reject(new Error('Notes generation timeout')), timeoutMs)
                            );
                            const result = await Promise.race([
                                generateNotesAiModel.sendMessage(PROMPT),
                                timeoutPromise
                            ]);
                            
                            aiResp = result.response.text();
                            console.log('Chapter notes generated for index:', index, 'attempt:', attempt + 1);
                            success = true;
                        } catch (chapterErr) {
                            lastError = chapterErr;
                            handleAIError(chapterErr);
                            console.error('Error generating notes for chapter', index, 'attempt', attempt + 1, ':', chapterErr.message);
                            
                            const isRateLimit = chapterErr.message?.includes('429') || 
                                               chapterErr.message?.toLowerCase().includes('quota') ||
                                               chapterErr.message?.toLowerCase().includes('rate');
                            if (isRateLimit && attempt < 2) {
                                console.log('Rate limit detected, waiting longer...');
                                await new Promise(resolve => setTimeout(resolve, 5000 * (attempt + 1)));
                            }
                        }
                    }
                    
                    if (!success) {
                        console.error('All retries failed for chapter', index, lastError?.message);
                        aiResp = `<h3>${chapter.chapter_title || chapter.chapterTitle || 'Chapter ' + (index+1)}</h3><p>Notes generation temporarily unavailable. Please try regenerating later.</p>`;
                    }

                    const existing = await db.select({ id: CHAPTER_NOTES_TABLE.id })
                        .from(CHAPTER_NOTES_TABLE)
                        .where(and(
                            eq(CHAPTER_NOTES_TABLE.courseId, course?.courseId),
                            eq(CHAPTER_NOTES_TABLE.chapterId, index)
                        )).limit(1);
                    
                    if (existing.length > 0) {
                        console.log(`Chapter notes already exist for index ${index}, updating...`);
                        await db.update(CHAPTER_NOTES_TABLE)
                            .set({ notes: aiResp })
                            .where(eq(CHAPTER_NOTES_TABLE.id, existing[0].id));
                    } else {
                        await db.insert(CHAPTER_NOTES_TABLE).values({
                            chapterId: index,
                            courseId: course?.courseId,
                            notes: aiResp
                        });
                    }
                });
            }

            await step.run('Update Course Status to PendingReview', async () => {
                await db.update(STUDY_MATERIAL_TABLE).set({
                    status: 'PendingReview'
                }).where(eq(STUDY_MATERIAL_TABLE.courseId, course?.courseId));
                return 'Success';
            });

            await step.run('Create Content Review Items', async () => {
                try {
                    await db.insert(CONTENT_REVIEW_TABLE).values({
                        courseId: course?.courseId,
                        contentType: 'course_outline',
                        contentId: null,
                        status: 'pending',
                        originalContent: courseLayout,
                        priority: 'normal',
                        flaggedBy: 'system',
                        flagReason: 'Auto-queued: New AI-generated course outline',
                        autoFlagged: true,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    });

                    for (let i = 0; i < Chapters.length; i++) {
                        const chapterNotes = await db.select()
                            .from(CHAPTER_NOTES_TABLE)
                            .where(and(
                                eq(CHAPTER_NOTES_TABLE.courseId, course?.courseId),
                                eq(CHAPTER_NOTES_TABLE.chapterId, i)
                            ));
                        
                        if (chapterNotes.length > 0) {
                            await db.insert(CONTENT_REVIEW_TABLE).values({
                                courseId: course?.courseId,
                                contentType: 'notes',
                                contentId: String(i),
                                status: 'pending',
                                originalContent: chapterNotes[0].notes,
                                priority: 'normal',
                                flaggedBy: 'system',
                                flagReason: `Auto-queued: AI-generated notes for chapter ${i + 1}`,
                                autoFlagged: true,
                                createdAt: new Date(),
                                updatedAt: new Date(),
                            });
                        }
                    }
                    return 'Review items created';
                } catch (reviewErr) {
                    console.error('Failed to create review items (non-fatal):', reviewErr.message);
                    return 'Review creation skipped';
                }
            });

            await step.run('Notify Admins and Tutors by Email', async () => {
                try {
                    const adminsAndTutors = await db.select({
                        email: ADMIN_TABLE.email,
                        name: ADMIN_TABLE.name
                    })
                    .from(ADMIN_TABLE)
                    .where(eq(ADMIN_TABLE.isActive, true));

                    for (const recipient of adminsAndTutors) {
                        try {
                            await emailService.sendPendingReviewNotificationEmail(
                                recipient.email,
                                recipient.name,
                                course?.topic || 'New Course',
                                course?.createdBy || 'Student',
                                course?.courseId
                            );
                        } catch (emailErr) {
                            console.error(`Failed to send review email to ${recipient.email}:`, emailErr.message);
                        }
                    }
                    return `Notified ${adminsAndTutors.length} admins and tutors`;
                } catch (err) {
                    console.error('Failed to notify admins/tutors:', err.message);
                    return 'Notification failed';
                }
            });

            return { success: true };
        } catch (err) {
            console.error('GenerateNotes unhandled error:', err);
            
            try {
                const courseId = event.data?.course?.courseId;
                if (courseId) {
                    await db.update(STUDY_MATERIAL_TABLE).set({
                        status: 'Error'
                    }).where(eq(STUDY_MATERIAL_TABLE.courseId, courseId));
                    console.log('Updated course status to Error:', courseId);
                    
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
);

export const FetchYouTubeVideos = inngest.createFunction(
    { 
        id: 'fetch-youtube-videos',
        retries: 2,
        concurrency: { limit: 1 }
    },
    { event: 'youtube.fetch' },
    async ({ event, step }) => {
        try {
            const { courseId, chapters, topic, courseType } = event.data;

            if (!courseId || !Array.isArray(chapters)) {
                console.warn('FetchYouTubeVideos: Missing required data');
                return { success: false, error: 'Missing courseId or chapters' };
            }

            const videoResult = await step.run('Fetch YouTube videos', async () => {
                const apiKey = process.env.YOUTUBE_API_KEY;
                if (!apiKey) {
                    console.warn('YouTube API key not configured. Skipping video search.');
                    return { success: false, videos: {} };
                }

                const videos = {};
                let quotaExceeded = false;

                for (const chapter of chapters) {
                    const chapterTitle = chapter.chapter_title || chapter.chapterTitle || '';
                    if (!chapterTitle) continue;

                    if (quotaExceeded) {
                        videos[chapterTitle] = [];
                        continue;
                    }

                    try {
                        const searchQuery = `${topic} ${chapterTitle}`.slice(0, 100);
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 5000);

                        const response = await fetch(
                            `https://www.googleapis.com/youtube/v3/search?` +
                            `part=snippet&` +
                            `q=${encodeURIComponent(searchQuery)}&` +
                            `type=video&` +
                            `maxResults=3&` +
                            `order=relevance&` +
                            `key=${apiKey}&` +
                            `videoDuration=medium`,
                            { 
                                headers: { 'User-Agent': 'Gemini-LMS' },
                                signal: controller.signal
                            }
                        );

                        clearTimeout(timeoutId);

                        if (!response.ok) {
                            const body = await response.json().catch(() => null);
                            const reason = body?.error?.errors?.[0]?.reason || body?.error?.message || 'Unknown YouTube API error';
                            console.error(`YouTube API error for chapter "${chapterTitle}": ${response.status} ${reason}`);
                            
                            if (reason === 'quotaExceeded' || response.status === 403) {
                                quotaExceeded = true;
                            }
                            videos[chapterTitle] = [];
                            continue;
                        }

                        const data = await response.json();
                        const chapterVideos = (data.items || []).slice(0, 3).map(item => ({
                            id: item.id.videoId,
                            title: item.snippet.title,
                            description: item.snippet.description,
                            thumbnail: item.snippet.thumbnails.default.url,
                            channel: item.snippet.channelTitle,
                            url: `https://www.youtube.com/watch?v=${item.id.videoId}`
                        }));

                        videos[chapterTitle] = chapterVideos;

                    } catch (error) {
                        console.error(`Error searching videos for chapter "${chapterTitle}":`, error.message);
                        videos[chapterTitle] = [];
                    }
                }

                return {
                    success: true,
                    videos
                };
            });

            const hasVideos = videoResult.success && videoResult.videos && Object.keys(videoResult.videos).length > 0;
            if (hasVideos) {
                await step.run('Save videos to course', async () => {
                    try {
                        await db.update(STUDY_MATERIAL_TABLE)
                            .set({ videos: videoResult.videos })
                            .where(eq(STUDY_MATERIAL_TABLE.courseId, courseId));
                        
                        console.log(`Saved videos for course:`, courseId);
                        return { success: true };
                    } catch (err) {
                        console.error('Failed to save videos to database:', err.message);
                        return { success: false, error: err.message };
                    }
                });
            }

            return { success: true, message: 'YouTube videos processed' };
        } catch (err) {
            console.error('FetchYouTubeVideos unhandled error:', err);
            return { success: false, error: err.message };
        }
    }
);
