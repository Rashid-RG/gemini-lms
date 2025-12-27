import { db } from "@/configs/db";
import { CHAPTER_NOTES_TABLE, STUDY_TYPE_CONTENT_TABLE } from "@/configs/schema";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { withDbRetry } from "@/lib/dbUtils";

export const maxDuration = 30;

export async function POST(req) {
    try {
        const {courseId,studyType}=await req.json();

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