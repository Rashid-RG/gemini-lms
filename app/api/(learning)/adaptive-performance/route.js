import { NextResponse } from 'next/server'
import { db } from '@/configs/db'
import { ADAPTIVE_PERFORMANCE_TABLE } from '@/configs/schema'
import { eq, and } from 'drizzle-orm'
import { recordAdaptivePerformance } from '@/lib/recordAdaptivePerformance'
import { requireUserAuth } from "@/lib/userApiAuth";

/**
 * POST /api/adaptive-performance
 * Track assessment score and update adaptive difficulty
 * Body: { courseId, studentEmail, topicId, topicName, score, assessmentType }
 */
export async function POST(req) {
    try {
        const authResult = await requireUserAuth(req);
        if (!authResult.authenticated) return authResult.error;

        const body = await req.json();
        if (!authResult.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const studentEmail = authResult.email;
        const { courseId, topicId, topicName, score } = body;

        if (!courseId || !topicId || !topicName || score === undefined) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }
        if (typeof score !== "number" || !Number.isFinite(score) || score < 0 || score > 100) {
            return NextResponse.json({ error: "Score must be between 0-100" }, { status: 400 });
        }

        const { record, isNew } = await recordAdaptivePerformance({
            courseId, studentEmail, topicId, topicName, score
        });
        return NextResponse.json({ result: record, isNew });
    } catch (error) {
        console.error('Error tracking adaptive performance:', error)
        return NextResponse.json(
            { error: 'Failed to track performance' },
            { status: 500 }
        )
    }
}

/**
 * GET /api/adaptive-performance?courseId=X&studentEmail=Y
 * Fetch performance records for a student in a course
 */
export async function GET(req) {
    try {
        const authResult = await requireUserAuth(req);
        if (!authResult.authenticated) return authResult.error;
        const studentEmail = authResult.email;

        const { searchParams } = new URL(req.url)
        const courseId = searchParams.get('courseId')

        if (!courseId) {
            return NextResponse.json(
                { error: 'Missing courseId' },
                { status: 400 }
            )
        }

        const records = await db.select().from(ADAPTIVE_PERFORMANCE_TABLE)
            .where(
                and(
                    eq(ADAPTIVE_PERFORMANCE_TABLE.courseId, courseId),
                    eq(ADAPTIVE_PERFORMANCE_TABLE.studentEmail, studentEmail)
                )
            )
            .orderBy(ADAPTIVE_PERFORMANCE_TABLE.updatedAt)

        return NextResponse.json({ result: records })
    } catch (error) {
        console.error('Error fetching adaptive performance:', error)
        return NextResponse.json(
            { error: 'Failed to fetch performance' },
            { status: 500 }
        )
    }
}
