import { db } from "@/configs/db";
import { CHAPTER_NOTES_TABLE, STUDY_TYPE_CONTENT_TABLE, STUDY_MATERIAL_TABLE } from "@/configs/schema";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
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

        const {courseId,studyType}=await req.json();

        // Enforce ownership check (BOLA)
        const course = await withDbRetry(() => db.select({ createdBy: STUDY_MATERIAL_TABLE.createdBy, isPublic: STUDY_MATERIAL_TABLE.isPublic })
            .from(STUDY_MATERIAL_TABLE)
            .where(eq(STUDY_MATERIAL_TABLE.courseId, courseId))
            .limit(1)
        );
        
        if (course.length === 0) {
            return NextResponse.json({ error: "Course not found" }, { status: 404 });
        }
        
        if (course[0].createdBy.toLowerCase() !== authEmail && !course[0].isPublic) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        if(studyType=='ALL')
        {
            const [notes, contentList] = await Promise.all([
                withDbRetry(() => db.select().from(CHAPTER_NOTES_TABLE)
                    .where(eq(CHAPTER_NOTES_TABLE?.courseId,courseId))),
                withDbRetry(() => db.select().from(STUDY_TYPE_CONTENT_TABLE)
                    .where(eq(STUDY_TYPE_CONTENT_TABLE?.courseId,courseId)))
            ]);

            const result={
                notes:notes,
                flashcard:contentList?.filter(item=>item.type=='Flashcard'),
                quiz:contentList?.filter(item=>item.type=='Quiz'),
                mcq:contentList?.filter(item=>item.type=='MCQ'),
                qa:contentList?.filter(item=>item.type=='QA'),
            }
            return NextResponse.json(result);
        }
        else if(studyType=='notes')
        {
            const notes = await withDbRetry(() => db.select().from(CHAPTER_NOTES_TABLE)
                .where(eq(CHAPTER_NOTES_TABLE?.courseId,courseId)));

            return NextResponse.json(notes);
        }
        else {
            const result = await withDbRetry(() => db.select().from(STUDY_TYPE_CONTENT_TABLE)
                .where(and( eq(STUDY_TYPE_CONTENT_TABLE?.courseId,courseId),
                eq(STUDY_TYPE_CONTENT_TABLE.type,studyType))));

            // Return the first result if it exists, otherwise return null
            return NextResponse.json(result && result.length > 0 ? result[0] : null);
        }
    } catch (error) {
        console.error('Error in study-type route:', error);
        return NextResponse.json({ error: 'Failed to fetch study content' }, { status: 500 });
    }
}