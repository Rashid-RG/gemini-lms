
import { courseOutlineAIModel } from "@/configs/AiModel";
import { db } from "@/configs/db";
import { STUDY_MATERIAL_TABLE, USER_TABLE } from "@/configs/schema";
import { inngest } from "@/inngest/client";
import { NextResponse } from "next/server";
import { eq, isNotNull, and, gte, ne, sql } from "drizzle-orm";
import { checkRateLimit, safeJsonParse, retryWithBackoff } from "@/lib/rateLimit";
import { auth } from "@clerk/nextjs/server";
import { getAuthEmail } from "@/lib/clerkUtils";
import { hasEnoughCredits, deductCredits, CREDIT_TYPES } from "@/lib/credits";
import { withDbRetry } from "@/lib/dbUtils";
import { getApiKeyRotationManager } from "@/lib/apiKeyRotation";

// Set max duration for this route (Vercel serverless)
export const maxDuration = 240; // 4 minutes - allow very aggressive AI timeouts

/**
 * Helper: Generate fallback course structure if AI fails
 */
function generateFallbackCourse(topic, courseType, difficultyLevel) {
  return {
    course_title: `${topic} - ${courseType}`,
    difficulty: difficultyLevel,
    summary: `Learn ${topic} through structured lessons and practice. This ${difficultyLevel.toLowerCase()} level course covers essential concepts and practical applications.`,
    chapters: [
      {
        chapter_title: 'Fundamentals',
        summary: `Introduction to ${topic} basics and core concepts`,
        emoji: '📚',
        topics: ['Introduction', 'Basic Concepts', 'Getting Started', 'Common Patterns']
      },
      {
        chapter_title: 'Intermediate Concepts',
        summary: `Explore intermediate topics and techniques`,
        emoji: '💡',
        topics: ['Best Practices', 'Common Challenges', 'Problem Solving', 'Optimization']
      },
      {
        chapter_title: 'Advanced Applications',
        summary: `Apply concepts to real-world scenarios`,
        emoji: '🎯',
        topics: ['Real-world Examples', 'Integration', 'Testing', 'Deployment']
      }
    ]
  };
}

/**
 * Helper: Call AI model with retry on 429/503 with timeout AND key rotation
 */
async function callAIWithRetry(prompt, retries = 4, delayMs = 3000) {
  let attemptCount = 0;
  let rotationManager = null;
  
  return retryWithBackoff(async () => {
    attemptCount++;
    
    try {
      rotationManager = getApiKeyRotationManager();
      console.log(`[AI] Attempt ${attemptCount} using key ${rotationManager.getCurrentKeyIndex() + 1}/${rotationManager.apiKeys.length}`);
    } catch (err) {
      console.warn('API Key Rotation Manager failed to initialize:', err.message);
    }
    
    // Very aggressive timeouts to prevent timeout errors
    // 1st attempt: 120s, 2nd: 150s, 3rd: 180s, 4th: 180s (max)
    const timeoutMs = Math.min(120000 + (attemptCount - 1) * 30000, 180000);
    console.log(`[AI] Attempt ${attemptCount}: Starting with ${timeoutMs}ms timeout`);
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('AI request timeout')), timeoutMs)
    );
    
    try {
      const aiPromise = courseOutlineAIModel.sendMessage(prompt);
      const resp = await Promise.race([aiPromise, timeoutPromise]);
      
      const responseText = resp.response.text();
      console.log('AI Response length:', responseText.length);
      
      // CHECK FOR INCOMPLETE RESPONSES (truncated JSON)
      const trimmed = responseText.trim();
      if (trimmed.length > 500 && !trimmed.endsWith('}')) {
        console.warn('Response appears truncated - ends with:', trimmed.substring(Math.max(0, trimmed.length - 50)));
        throw new Error('AI response appears truncated - incomplete JSON');
      }
      
      const { data, error } = safeJsonParse(responseText);
      
      if (error) {
        console.error('Failed to parse course outline JSON:', error.message);
        console.error('Response preview:', responseText.substring(0, 300));
        throw new Error('Invalid JSON response from AI');
      }
      
      // Validate required fields
      if (!data.chapters || !Array.isArray(data.chapters) || data.chapters.length === 0) {
        console.error('AI returned invalid structure:', Object.keys(data));
        throw new Error('AI response missing chapters array');
      }
      
      // Ensure we have exactly 3 chapters
      if (data.chapters.length > 3) {
        console.log(`AI returned ${data.chapters.length} chapters, slicing to exactly 3.`);
        data.chapters = data.chapters.slice(0, 3);
      }
      if (data.chapters.length < 3) {
        console.error('AI returned insufficient chapters:', data.chapters.length);
        throw new Error('AI returned too few chapters (need exactly 3)');
      }
      
      // Ensure each chapter has required fields
      for (let i = 0; i < data.chapters.length; i++) {
        const ch = data.chapters[i];
        if (!ch.chapter_title || !ch.topics || !Array.isArray(ch.topics)) {
          console.error(`Chapter ${i} missing required fields`);
          throw new Error(`Chapter ${i} has invalid structure`);
        }
      }
      
      console.log('✅ Parsed course with', data.chapters.length, 'chapters');
      return data;
    } catch (error) {
      if (rotationManager) {
        if (rotationManager.constructor.isQuotaError(error) || rotationManager.constructor.isAuthError(error)) {
          console.error(`❌ API key issue (quota or auth) detected, rotating to next API key...`);
          rotationManager.handleQuotaExhausted();
        } else if (rotationManager.constructor.isRateLimitError(error)) {
          console.warn('⚠️ Rate limit detected, rotating API key...');
          rotationManager.handleRateLimit();
        }
      }
      throw error;
    }
  }, {
    maxRetries: retries,
    baseDelayMs: delayMs,
    maxDelayMs: 30000,
    onRetry: (attempt, max, delay, err) => {
      console.warn(`AI retry ${attempt}/${max} in ${delay}ms: ${err.message}`);
    }
  });
}

export async function POST(req) {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const authEmail = await getAuthEmail(sessionClaims);

    const { courseId, topic, courseType, difficultyLevel, createdBy, includeVideos, isPublic, category, tags } = await req.json();

    if (!courseId || !topic || !courseType || !difficultyLevel || !createdBy) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (authEmail !== createdBy.trim().toLowerCase()) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 1️⃣ Check if THIS SPECIFIC COURSE already exists (by courseId) - with retry
    const existingCourse = await withDbRetry(() => 
      db.select()
        .from(STUDY_MATERIAL_TABLE)
        .where(eq(STUDY_MATERIAL_TABLE.courseId, courseId))
    );

    if (existingCourse.length > 0) {
      console.log("Course already exists with this ID:", courseId);
      return NextResponse.json({ result: existingCourse[0] });
    }

    // 2️⃣ Prompt Caching - Check if the creator has already generated a course for the exact same topic, courseType, and difficultyLevel
    const cachedCourse = await withDbRetry(() => 
      db.select()
        .from(STUDY_MATERIAL_TABLE)
        .where(
          and(
            eq(STUDY_MATERIAL_TABLE.createdBy, createdBy),
            sql`lower(${STUDY_MATERIAL_TABLE.topic}) = ${topic.trim().toLowerCase()}`,
            eq(STUDY_MATERIAL_TABLE.courseType, courseType),
            eq(STUDY_MATERIAL_TABLE.difficultyLevel, difficultyLevel),
            ne(STUDY_MATERIAL_TABLE.status, 'Error')
          )
        )
    );

    if (cachedCourse.length > 0) {
      console.log("Cached course found, returning existing course outline:", cachedCourse[0].courseId);
      return NextResponse.json({ result: cachedCourse[0] });
    }

    // 3️⃣ 🛡️ In-memory Rate limiting - 5 courses per hour per user
    const rateCheck = checkRateLimit(createdBy, 'course-generation');
    if (rateCheck.limited) {
      return NextResponse.json(
        { error: rateCheck.message, retryAfter: Math.ceil(rateCheck.resetIn / 1000) },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil(rateCheck.resetIn / 1000).toString()
          }
        }
      );
    }

    // 4️⃣ 🛡️ Database-backed Rate limiting - 1 course per 60 seconds per user
    const sixtySecondsAgo = new Date(Date.now() - 60 * 1000);
    const recentCourses = await withDbRetry(() => 
      db.select()
        .from(STUDY_MATERIAL_TABLE)
        .where(
          and(
            eq(STUDY_MATERIAL_TABLE.createdBy, createdBy),
            gte(STUDY_MATERIAL_TABLE.createdAt, sixtySecondsAgo)
          )
        )
    );

    if (recentCourses.length > 0) {
      console.log(`[Rate Limit] User ${createdBy} attempted course generation too quickly.`);
      return NextResponse.json(
        { 
          error: "Too many requests. Please wait 60 seconds between course generations.", 
          retryAfter: 60 
        },
        { 
          status: 429,
          headers: {
            'Retry-After': '60'
          }
        }
      );
    }

    //  Check if user is a Premium Member (with retry for cold starts)
    const userResult = await withDbRetry(() => 
      db.select().from(USER_TABLE).where(eq(USER_TABLE.email, createdBy))
    );
    const isPremiumMember = userResult.length > 0 && userResult[0].isMember === true;

    // 💰 Check user credits before proceeding (skip for Premium members)
    if (!isPremiumMember) {
      const hasCredits = await withDbRetry(() => hasEnoughCredits(createdBy, 1));
      if (!hasCredits) {
        return NextResponse.json(
          { 
            error: "Insufficient credits. You need at least 1 credit to create a course.", 
            code: "INSUFFICIENT_CREDITS" 
          },
          { status: 402 } // Payment Required
        );
      }
    }

    // 2️⃣ Build AI prompt - simplified for faster generation and complete responses
    const PROMPT = `Create a course outline for "${topic}" (${courseType}, ${difficultyLevel} level).
Generate exactly 3 chapters (no more, no less).

Return ONLY valid JSON with NO markdown, code blocks, or explanations:

{
  "course_title": "${topic} - ${courseType}",
  "difficulty": "${difficultyLevel}",
  "summary": "Complete course covering ${topic} from basics to advanced concepts.",
  "chapters": [
    {"chapter_title": "Chapter 1", "summary": "Learn the basics", "emoji": "📚", "topics": ["Topic 1", "Topic 2", "Topic 3", "Topic 4"]},
    {"chapter_title": "Chapter 2", "summary": "Master core concepts", "emoji": "💡", "topics": ["Topic 1", "Topic 2", "Topic 3", "Topic 4"]},
    {"chapter_title": "Chapter 3", "summary": "Advanced applications", "emoji": "🎯", "topics": ["Topic 1", "Topic 2", "Topic 3", "Topic 4"]}
  ]
}`;

    // 3️⃣ Call AI with retry (more retries and longer delays for rate limits)
    let aiResult;
    try {
      aiResult = await callAIWithRetry(PROMPT, 4, 3000);
    } catch (aiErr) {
      console.error("AI Model Error:", aiErr);
      console.warn("Using fallback course structure due to AI failure");
      
      // Use fallback if AI fails completely (after all retries)
      aiResult = generateFallbackCourse(topic, courseType, difficultyLevel);
    }

    // 💰 Deduct credit after successful AI generation (skip for Premium members)
    if (!isPremiumMember) {
      const deductResult = await deductCredits(createdBy, 1, {
        type: CREDIT_TYPES.COURSE_CREATION,
        reason: `Course creation: ${topic}`,
        courseId,
        createdBy: 'system'
      });
      
      if (!deductResult.success) {
        console.error("Failed to deduct credits:", deductResult.error);
        return NextResponse.json(
          { error: "Failed to process credits. Please try again." },
          { status: 500 }
        );
      }
    }

    // 4️⃣ Save new course outline to DB (with retry for cold starts)
    const dbResult = await withDbRetry(() => 
      db.insert(STUDY_MATERIAL_TABLE)
        .values({
          courseId,
          courseType,
          difficultyLevel,
          createdBy,
          topic,
          courseLayout: aiResult,
          includeVideos: includeVideos || false,
          isPublic: isPublic || false,
          category: category || 'General',
          tags: tags || [],
          videos: null
        })
        .returning()
    );

    // Build the course object with parsed courseLayout for Inngest
    const courseForInngest = {
      ...dbResult[0],
      courseLayout: aiResult // Use the original parsed aiResult, not the DB-returned value
    };

    // 5️⃣ Trigger Inngest workflow for notes generation
    const notesEventResult = await inngest.send({
      name: "notes.generate",
      data: { course: courseForInngest }
    });
    
    // Check if Inngest event was actually sent (null = skipped due to missing key)
    if (notesEventResult === null) {
      console.error('CRITICAL: Inngest event was not sent! Check INNGEST_EVENT_KEY environment variable.');
      // Mark course as Error since notes won't be generated
      await db.update(STUDY_MATERIAL_TABLE)
        .set({ status: 'Error' })
        .where(eq(STUDY_MATERIAL_TABLE.courseId, courseId));
    }

    // 5a️⃣ Trigger Inngest workflow for assignments generation
    await inngest.send({
      name: "assignments.generate",
      data: { course: courseForInngest }
    });

    // 5b️⃣ Trigger YouTube video fetching in background (don't wait for it)
    if (includeVideos) {
      inngest.send({
        name: "youtube.fetch",
        data: { 
          courseId,
          chapters: aiResult.chapters,
          topic: topic,
          courseType: courseType
        }
      }).catch(err => console.warn('Failed to queue YouTube job:', err));
    }

    // 6️⃣ Return success immediately (background tasks will complete asynchronously)
    return NextResponse.json({ result: dbResult[0] });

  } catch (err) {
    console.error("API Error:", err);
    return NextResponse.json(
      { error: "Internal Server Error. Check server logs." },
      { status: 500 }
    );
  }
}