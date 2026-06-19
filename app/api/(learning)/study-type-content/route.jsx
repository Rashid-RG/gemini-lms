import { db } from "@/configs/db";
import { STUDY_TYPE_CONTENT_TABLE } from "@/configs/schema";
import { inngest } from "@/inngest/client";
import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { withDbRetry } from "@/lib/dbUtils";
import { auth } from "@clerk/nextjs/server";
import { getAuthEmail } from "@/lib/clerkUtils";

export const maxDuration = 30;

export async function POST(req) {
    try {
        const { userId, sessionClaims } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const authEmail = await getAuthEmail(sessionClaims);

        const {chapters,courseId,type,courseType,topic,courseDetails,createdBy}=await req.json();

        if (authEmail !== createdBy.trim().toLowerCase()) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // 🛡️ Rate limiting - 20 requests per 15 minutes per user
        const rateCheck = checkRateLimit(authEmail, 'study-content');
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

        let PROMPT;
        if(type=='Flashcard') {
          PROMPT=`Generate 10 flashcards on: ${chapters}
Return JSON array: [{"front":"Question?","back":"Short answer"}]
Keep answers under 80 chars.`;
        } else if(type=='MCQ') {
          const context = courseDetails || `${topic || 'Topic'} - ${chapters}`;
          PROMPT=`Generate 10 MCQs on: ${context}
Return JSON: {"questions":[{"question":"?","options":["A","B","C","D"],"answer":"Correct"}]}`;
        } else if(type=='qa') {
          PROMPT=`Generate 10 Q&A on: ${chapters}
Return JSON: {"questions":[{"question":"?","answer":"Detailed answer"}]}`;
        } else {
          PROMPT='Generate Quiz on: '+chapters+' with questions, options, answer in JSON (Max 10)';
        }

        // Insert Record to DB with retry
        const result = await withDbRetry(() => 
            db.insert(STUDY_TYPE_CONTENT_TABLE).values({
                courseId:courseId,
                type:type
            }).returning({id:STUDY_TYPE_CONTENT_TABLE.id})
        );

        // Trigger Inngest Function
        await inngest.send({
            name:'studyType.content',
            data:{
               studyType:type, 
               prompt:PROMPT,
               courseId:courseId,
               recordId:result[0].id 
            }
        });

        return NextResponse.json(result[0].id);
    } catch (error) {
        console.error('Error in study-type-content:', error);
        return NextResponse.json({ error: 'Failed to create study content' }, { status: 500 });
    }
}