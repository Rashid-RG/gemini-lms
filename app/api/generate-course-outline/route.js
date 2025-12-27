//import { courseOutlineAIModel } from "@/configs/AiModel";
//import { db } from "@/configs/db";
//import { STUDY_MATERIAL_TABLE } from "@/configs/schema";
//import { inngest } from "@/inngest/client";
//import { NextResponse } from "next/server";

//export async function POST(req) {

 //   const {courseId,topic,courseType,difficultyLevel,createdBy}=await req.json();
    
// const PROMPT='Generate a study material for '+topic+' for '+courseType+' and level of difficulty  will be '+difficultyLevel+' with sumery of course, List of Chapters (Max 3) along with summery and Emoji icon for each chapter, Topic list in each chapter, and all result in  JSON format'
    // Generate Course Layout using AI
//    const aiResp=await courseOutlineAIModel.sendMessage(PROMPT);
 //   const aiResult= JSON.parse(aiResp.response.text());

    // Save the result along with User Input
//    const dbResult=await db.insert(STUDY_MATERIAL_TABLE).values({
  //      courseId:courseId,
    //    courseType:courseType,
     //  createdBy:createdBy,
        //topic:topic,
       // courseLayout:aiResult
 //   }).returning({resp:STUDY_MATERIAL_TABLE})

    //Trigger the Inngest function to generate chapter notes

   // inngest.send({
     //   name:'notes.generate',
       /// data:{
          //  course:dbResult[0].resp
       // }
    //});
    // console.log(result);
    
    //return NextResponse.json({result:dbResult[0]})
    
//}

import { courseOutlineAIModel } from "@/configs/AiModel";
import { db } from "@/configs/db";
import { STUDY_MATERIAL_TABLE } from "@/configs/schema";
import { inngest } from "@/inngest/client";
import { NextResponse } from "next/server";
import { eq, isNotNull } from "drizzle-orm";
import { checkRateLimit, safeJsonParse, retryWithBackoff } from "@/lib/rateLimit";
import { hasEnoughCredits, deductCredits, CREDIT_TYPES } from "@/lib/credits";
import { withDbRetry } from "@/lib/dbUtils";

// Set max duration for this route (Vercel serverless)
export const maxDuration = 120;

/**
 * Helper: Call AI model with retry on 429/503 with timeout
 */
async function callAIWithRetry(prompt, retries = 4, delayMs = 3000) {
  return retryWithBackoff(async () => {
    // Generous timeout for model response (Gemini can be slow under load)
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('AI request timeout')), 55000)
    );
    
    const aiPromise = courseOutlineAIModel.sendMessage(prompt);
    const resp = await Promise.race([aiPromise, timeoutPromise]);
    
    const responseText = resp.response.text();
    console.log('AI Response length:', responseText.length);
    
    const { data, error } = safeJsonParse(responseText);
    
    if (error) {
      console.error('Failed to parse course outline JSON:', error.message);
      throw new Error('Invalid JSON response from AI');
    }
    
    // Validate required fields
    if (!data.chapters || !Array.isArray(data.chapters) || data.chapters.length === 0) {
      console.error('AI returned invalid structure:', Object.keys(data));
      throw new Error('AI response missing chapters array');
    }
    
    console.log('Parsed course with', data.chapters.length, 'chapters');
    return data;
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
    const { courseId, topic, courseType, difficultyLevel, createdBy, includeVideos, isPublic, category, tags } = await req.json();

    if (!courseId || !topic || !courseType || !difficultyLevel || !createdBy) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 🛡️ Rate limiting - 5 courses per hour per user
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

    // 💰 Check user credits before proceeding (with retry for cold starts)
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

    // 2️⃣ Build AI prompt - simplified for faster generation
    const PROMPT = `Create study material for "${topic}" (${courseType}, ${difficultyLevel} level).

Return JSON with exactly this structure:
{
  "course_title": "Course title here",
  "difficulty": "${difficultyLevel}",
  "summary": "2 sentence course summary",
  "chapters": [
    {"chapter_title": "Chapter 1 title", "summary": "Brief summary", "emoji": "📚", "topics": ["topic1", "topic2", "topic3", "topic4"]},
    {"chapter_title": "Chapter 2 title", "summary": "Brief summary", "emoji": "💡", "topics": ["topic1", "topic2", "topic3", "topic4"]},
    {"chapter_title": "Chapter 3 title", "summary": "Brief summary", "emoji": "🎯", "topics": ["topic1", "topic2", "topic3", "topic4"]}
  ]
}

Generate EXACTLY 3 chapters with 4 specific topics each. Return only valid JSON.`;

    // 3️⃣ Call AI with retry (more retries and longer delays for rate limits)
    let aiResult;
    try {
      aiResult = await callAIWithRetry(PROMPT, 4, 3000);
    } catch (aiErr) {
      console.error("AI Model Error:", aiErr);
      const status = aiErr?.status || 500;
      const message = aiErr?.message || "Failed to generate course outline";
      return NextResponse.json({ error: message }, { status });
    }

    // 💰 Deduct credit after successful AI generation (before DB insert)
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
    inngest.send({
      name: "notes.generate",
      data: { course: courseForInngest }
    });

    // 5a️⃣ Trigger Inngest workflow for assignments generation
    inngest.send({
      name: "assignments.generate",
      data: { course: courseForInngest }
    });

    // 5b️⃣ Fetch YouTube videos if enabled
    if (includeVideos) {
      try {
        // Call YouTube search API with proper error handling
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const videoResponse = await fetch(
          `${baseUrl}/api/youtube-search`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chapters: aiResult.chapters,
              topic: topic,
              courseType: courseType
            })
          }
        );

        if (videoResponse.ok) {
          const videoData = await videoResponse.json();
          if (Array.isArray(videoData.errors) && videoData.errors.length > 0) {
            console.warn('YouTube API returned errors:', videoData.errors);
          }
          // Update course with video data
          await db.update(STUDY_MATERIAL_TABLE)
            .set({ videos: videoData.videos })
            .where(eq(STUDY_MATERIAL_TABLE.courseId, courseId));
          
          console.log('Videos fetched and saved for course:', courseId);
        } else {
          console.warn('YouTube video fetch failed with status:', videoResponse.status);
        }
      } catch (videoErr) {
        console.warn('Error fetching YouTube videos:', videoErr);
        // Don't fail course creation if video fetch fails
      }
    }

    // 6️⃣ Return success
    return NextResponse.json({ result: dbResult[0] });

  } catch (err) {
    console.error("API Error:", err);
    return NextResponse.json(
      { error: "Internal Server Error. Check server logs." },
      { status: 500 }
    );
  }
}