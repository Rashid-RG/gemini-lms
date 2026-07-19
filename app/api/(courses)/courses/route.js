import { db } from "@/configs/db";
import { STUDY_MATERIAL_TABLE, USER_TABLE, TUTOR_REQUESTS_TABLE, ADMIN_TABLE, COURSE_ENROLLMENT_TABLE, STUDENT_PROGRESS_TABLE } from "@/configs/schema";
import { desc, eq, and, or, ilike, inArray, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { withDbRetry } from "@/lib/dbUtils";
import { auth } from "@clerk/nextjs/server";
import { getAuthEmail } from "@/lib/clerkUtils";

export const maxDuration = 45;

// In-memory cache for courses list to avoid repeated DB queries
const coursesCache = new Map();
const CACHE_TIME = 30 * 1000; // 30 seconds

async function getUserRoles(email) {
    if (!email) return { isTutor: false, isAdminOrSuperAdmin: false };
    const normalizedEmail = email.trim().toLowerCase();

    // Check env admins
    const adminEmails = (process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
        .split(',')
        .map(e => e.trim().toLowerCase())
        .filter(Boolean);
    adminEmails.push('geminilmsadmin@gmail.com');

    let isAdminOrSuperAdmin = adminEmails.includes(normalizedEmail);
    let isTutor = false;

    try {
        // Check tutor requests status
        const tutorReq = await db.select()
            .from(TUTOR_REQUESTS_TABLE)
            .where(and(
                eq(TUTOR_REQUESTS_TABLE.userEmail, normalizedEmail),
                eq(TUTOR_REQUESTS_TABLE.status, 'approved')
            ))
            .limit(1);
        if (tutorReq.length > 0) {
            isTutor = true;
        }

        // Check admins table role
        const adminUser = await db.select()
            .from(ADMIN_TABLE)
            .where(eq(ADMIN_TABLE.email, normalizedEmail))
            .limit(1);
        
        if (adminUser.length > 0) {
            const role = adminUser[0].role;
            if (role === 'tutor') {
                isTutor = true;
            } else if (role === 'admin' || role === 'super_admin') {
                isAdminOrSuperAdmin = true;
            }
        }
    } catch (err) {
        console.error("Error fetching user roles in courses API:", err);
    }

    return { isTutor, isAdminOrSuperAdmin };
}

export async function POST(req) {
    try {
        const { userId, sessionClaims } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const authEmail = await getAuthEmail(sessionClaims);

        const { createdBy, creatorName } = await req.json();
        
        if (!createdBy && !creatorName) {
            return NextResponse.json({error: 'createdBy or creatorName is required'}, {status: 400});
        }

        const roles = await getUserRoles(authEmail);
        const isAuthorized = roles.isTutor || roles.isAdminOrSuperAdmin;

        if (!isAuthorized) {
            if (!createdBy || authEmail !== createdBy.trim().toLowerCase()) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
        }

        // Check in-memory cache first
        const cacheKey = `courses:${createdBy || ''}:${creatorName || ''}`;
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
        const timeout = setTimeout(() => controller.abort(), 30000);
        
        try {
            const result = await withDbRetry(async () => {
                const query = db.select({
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
                    creatorName: USER_TABLE.name,
                }).from(STUDY_MATERIAL_TABLE)
                .leftJoin(USER_TABLE, eq(STUDY_MATERIAL_TABLE.createdBy, USER_TABLE.email));

                let whereClause;
                if (createdBy) {
                    whereClause = eq(STUDY_MATERIAL_TABLE.createdBy, createdBy.trim().toLowerCase());
                } else {
                    whereClause = ilike(USER_TABLE.name, `%${creatorName.trim()}%`);
                }

                return query.where(whereClause)
                    .orderBy(desc(STUDY_MATERIAL_TABLE.id))
                    .limit(20);  // REDUCED from 30 to 20 for faster response
            }, { maxRetries: 1, delayMs: 300 }); // Reduced retries for faster response

            clearTimeout(timeout);

            // Fetch enrolled student counts for these courses
            const courseIds = result.map(c => c.courseId).filter(Boolean);
            let enrollmentMap = new Map();
            let progressMap = new Map();

            if (courseIds.length > 0) {
                const [enrollmentCounts, progressCounts] = await Promise.all([
                    db.select({
                        courseId: COURSE_ENROLLMENT_TABLE.courseId,
                        count: sql`count(distinct ${COURSE_ENROLLMENT_TABLE.studentEmail})`
                    })
                    .from(COURSE_ENROLLMENT_TABLE)
                    .where(inArray(COURSE_ENROLLMENT_TABLE.courseId, courseIds))
                    .groupBy(COURSE_ENROLLMENT_TABLE.courseId),
                    db.select({
                        courseId: STUDENT_PROGRESS_TABLE.courseId,
                        count: sql`count(distinct ${STUDENT_PROGRESS_TABLE.studentEmail})`
                    })
                    .from(STUDENT_PROGRESS_TABLE)
                    .where(inArray(STUDENT_PROGRESS_TABLE.courseId, courseIds))
                    .groupBy(STUDENT_PROGRESS_TABLE.courseId)
                ]);

                enrollmentMap = new Map(enrollmentCounts.map(item => [item.courseId, Number(item.count || 0)]));
                progressMap = new Map(progressCounts.map(item => [item.courseId, Number(item.count || 0)]));
            }

            const resultWithStats = result.map(course => ({
                ...course,
                totalStudents: Math.max(
                    enrollmentMap.get(course.courseId) ?? 0,
                    progressMap.get(course.courseId) ?? 0
                )
            }));

            // Cache the result
            coursesCache.set(cacheKey, {
                data: resultWithStats,
                timestamp: Date.now()
            });

            return NextResponse.json(
                {result: resultWithStats},
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
                console.warn('Database query timeout for courses:', createdBy || creatorName);
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
            console.error('Database query failed for courses:', createdBy || creatorName, dbError?.message);
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
        const { userId, sessionClaims } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const authEmail = await getAuthEmail(sessionClaims);

        const reqUrl=req.url;
        const {searchParams}=new URL(reqUrl);
        const courseId=searchParams?.get('courseId');
        
        if(!courseId) {
            return NextResponse.json({error: 'courseId is required'}, {status: 400});
        }

        const course = await withDbRetry(async () => {
            return db.select({
                id: STUDY_MATERIAL_TABLE.id,
                courseId: STUDY_MATERIAL_TABLE.courseId,
                courseType: STUDY_MATERIAL_TABLE.courseType,
                topic: STUDY_MATERIAL_TABLE.topic,
                description: STUDY_MATERIAL_TABLE.description,
                difficultyLevel: STUDY_MATERIAL_TABLE.difficultyLevel,
                courseLayout: STUDY_MATERIAL_TABLE.courseLayout,
                createdBy: STUDY_MATERIAL_TABLE.createdBy,
                status: STUDY_MATERIAL_TABLE.status,
                includeVideos: STUDY_MATERIAL_TABLE.includeVideos,
                videos: STUDY_MATERIAL_TABLE.videos,
                hasAssignments: STUDY_MATERIAL_TABLE.hasAssignments,
                assignmentCount: STUDY_MATERIAL_TABLE.assignmentCount,
                isPublic: STUDY_MATERIAL_TABLE.isPublic,
                category: STUDY_MATERIAL_TABLE.category,
                tags: STUDY_MATERIAL_TABLE.tags,
                enrolledUsers: STUDY_MATERIAL_TABLE.enrolledUsers,
                averageRating: STUDY_MATERIAL_TABLE.averageRating,
                reviewCount: STUDY_MATERIAL_TABLE.reviewCount,
                totalStudents: STUDY_MATERIAL_TABLE.totalStudents,
                createdAt: STUDY_MATERIAL_TABLE.createdAt,
                updatedAt: STUDY_MATERIAL_TABLE.updatedAt,
                creatorName: USER_TABLE.name,
            })
            .from(STUDY_MATERIAL_TABLE)
            .leftJoin(USER_TABLE, eq(STUDY_MATERIAL_TABLE.createdBy, USER_TABLE.email))
            .where(eq(STUDY_MATERIAL_TABLE.courseId, courseId))
            .limit(1);
        }, { maxRetries: 2, delayMs: 500 });

        if (!course || course.length === 0) {
            console.warn('Course not found:', courseId);
            return NextResponse.json(
                {error: 'Course not found'},
                {status: 404}
            );
        }

        const courseData = course[0];
        const roles = await getUserRoles(authEmail);
        const isAuthorized = roles.isTutor || roles.isAdminOrSuperAdmin;

        // Enforce ownership check (BOLA) unless the course is public or user is authorized
        if (courseData.createdBy.toLowerCase() !== authEmail && !courseData.isPublic && !isAuthorized) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
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