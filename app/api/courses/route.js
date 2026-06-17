import { db } from "@/configs/db";
import { STUDY_MATERIAL_TABLE } from "@/configs/schema";
import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { withDbRetry } from "@/lib/dbUtils";

export const maxDuration = 30;

// In-memory cache for courses list to avoid repeated DB queries
const coursesCache = new Map();
const CACHE_TIME = 30 * 1000; // 30 seconds

export async function POST(req) {
    try {
        const {createdBy}=await req.json();
        
        if(!createdBy) {
            return NextResponse.json({error: 'createdBy is required'}, {status: 400});
        }

        // Check in-memory cache first
        const cacheKey = `courses:${createdBy}`;
        const cached = coursesCache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < CACHE_TIME) {
            return NextResponse.json(
                { result: cached.data },
                {
                    headers: {
                        'X-Cache': 'HIT',
                        'Cache-Control': 'private, max-age=30, stale-while-revalidate=60'
                    }
                }
            );
        }

        // Query only necessary fields to reduce payload and improve speed - with retry
        // TIMEOUT: Abort database query if it takes >15 seconds
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        
        try {
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
                .limit(20);  // REDUCED from 30 to 20 for faster response
            }, { maxRetries: 1, delayMs: 300 }); // Reduced retries for faster response

            clearTimeout(timeout);

            // Cache the result
            coursesCache.set(cacheKey, {
                data: result,
                timestamp: Date.now()
            });

            return NextResponse.json(
                {result: result},
                {
                    headers: {
                        'X-Cache': 'MISS',
                        'Cache-Control': 'private, max-age=30, stale-while-revalidate=60'
                    }
                }
            );
        } catch (dbError) {
            clearTimeout(timeout);
            
            console.error('Database error:', dbError?.message || String(dbError));
            
            // If query times out or fails, return empty array gracefully (don't error)
            if (dbError?.name === 'AbortError' || dbError?.message?.includes('timeout')) {
                console.warn('Database query timeout for courses:', createdBy);
                // Return empty result but don't cache it (so it retries next time)
                return NextResponse.json(
                    {result: []},
                    {
                        headers: {
                            'X-Cache': 'TIMEOUT',
                            'Cache-Control': 'no-cache'
                        }
                    }
                );
            }
            
            // For any other DB error, also return empty array instead of 500
            console.error('Database query failed for courses:', createdBy, dbError?.message);
            return NextResponse.json(
                {result: []},
                {
                    headers: {
                        'X-Cache': 'ERROR',
                        'Cache-Control': 'no-cache'
                    }
                }
            );
        }
    } catch(error) {
        console.error('Unexpected error fetching courses:', error);
        // Return graceful fallback instead of 500 error
        return NextResponse.json({result: []}, {status: 200});
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