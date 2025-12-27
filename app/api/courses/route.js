import { db } from "@/configs/db";
import { STUDY_MATERIAL_TABLE } from "@/configs/schema";
import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { withDbRetry } from "@/lib/dbUtils";

export const maxDuration = 30;

export async function POST(req) {
    try {
        const {createdBy}=await req.json();
        
        if(!createdBy) {
            return NextResponse.json({error: 'createdBy is required'}, {status: 400});
        }

        // Query only necessary fields to reduce payload and improve speed - with retry
        const result = await withDbRetry(async () => {
            return db.select({
                id: STUDY_MATERIAL_TABLE.id,
                courseId: STUDY_MATERIAL_TABLE.courseId,
                courseType: STUDY_MATERIAL_TABLE.courseType,
                topic: STUDY_MATERIAL_TABLE.topic,
                difficultyLevel: STUDY_MATERIAL_TABLE.difficultyLevel,
                status: STUDY_MATERIAL_TABLE.status,
                createdAt: STUDY_MATERIAL_TABLE.createdAt,
                createdBy: STUDY_MATERIAL_TABLE.createdBy,
                courseLayout: STUDY_MATERIAL_TABLE.courseLayout,
                videos: STUDY_MATERIAL_TABLE.videos,
            }).from(STUDY_MATERIAL_TABLE)
            .where(eq(STUDY_MATERIAL_TABLE.createdBy,createdBy))
            .orderBy(desc(STUDY_MATERIAL_TABLE.id))
            .limit(30);
        }, { maxRetries: 2, delayMs: 500 });

        return NextResponse.json(
            {result:result},
            {
                headers: {
                    'Cache-Control': 'private, max-age=10, stale-while-revalidate=30'
                }
            }
        );
    } catch(error) {
        console.error('Error fetching courses:', error);
        return NextResponse.json({error: error.message || 'Failed to fetch courses'}, {status: 500});
    }
}

export async function GET(req) {
    try {
        const reqUrl=req.url;
        const {searchParams}=new URL(reqUrl);
        const courseId=searchParams?.get('courseId');
        
        if(!courseId) {
            return NextResponse.json({error: 'courseId is required'}, {status: 400});
        }

        const course = await withDbRetry(async () => {
            return db.select().from(STUDY_MATERIAL_TABLE)
            .where(eq(STUDY_MATERIAL_TABLE?.courseId,courseId))
            .limit(1);
        }, { maxRetries: 2, delayMs: 500 });

        if (!course || course.length === 0) {
            console.warn('Course not found:', courseId);
            return NextResponse.json(
                {error: 'Course not found'},
                {status: 404}
            );
        }

        // Ensure courseLayout is properly returned
        const courseData = course[0];
        if (courseData.courseLayout && typeof courseData.courseLayout === 'string') {
            // Parse if it's stored as string
            try {
                courseData.courseLayout = JSON.parse(courseData.courseLayout);
            } catch (e) {
                console.warn('Failed to parse courseLayout for courseId:', courseId);
            }
        }

        return NextResponse.json(
            {result:courseData},
            {
                headers: {
                    'Cache-Control': 'private, max-age=30, stale-while-revalidate=60'
                }
            }
        );
    } catch(error) {
        console.error('Error fetching course:', error);
        return NextResponse.json({error: error.message || 'Failed to fetch course'}, {status: 500});
    }
}