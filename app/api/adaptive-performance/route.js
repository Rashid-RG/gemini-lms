import { NextResponse } from 'next/server'
import { db } from '@/configs/db'
import { ADAPTIVE_PERFORMANCE_TABLE } from '@/configs/schema'
import { eq, and } from 'drizzle-orm'
import { calculatePerformanceMetrics } from '@/lib/adaptiveDifficulty'

/**
 * POST /api/adaptive-performance
 * Track assessment score and update adaptive difficulty
 * Body: { courseId, studentEmail, topicId, topicName, score, assessmentType }
 */
export async function POST(req) {
    try {
        const { courseId, studentEmail, topicId, topicName, score, assessmentType } = await req.json()

        if (!courseId || !studentEmail || !topicId || !topicName || score === undefined) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        // Validate score is 0-100
        if (score < 0 || score > 100) {
            return NextResponse.json(
                { error: 'Score must be between 0-100' },
                { status: 400 }
            )
        }

        // Get existing performance record
        const existing = await db.select().from(ADAPTIVE_PERFORMANCE_TABLE)
            .where(
                and(
                    eq(ADAPTIVE_PERFORMANCE_TABLE.courseId, courseId),
                    eq(ADAPTIVE_PERFORMANCE_TABLE.studentEmail, studentEmail),
                    eq(ADAPTIVE_PERFORMANCE_TABLE.topicId, topicId)
                )
            )

        const existingRecord = existing[0] || null

        // Calculate new metrics
        const metrics = calculatePerformanceMetrics(existingRecord, score, topicName)

        let result

        if (existingRecord) {
            // Update existing record
            result = await db.update(ADAPTIVE_PERFORMANCE_TABLE)
                .set({
                    totalAttempts: metrics.totalAttempts,
                    correctAnswers: metrics.correctAnswers,
                    averageScore: metrics.averageScore,
                    recommendedDifficulty: metrics.recommendedDifficulty,
                    currentDifficulty: metrics.currentDifficulty,
                    masteryLevel: metrics.masteryLevel,
                    isWeakTopic: metrics.isWeakTopic,
                    lastAttemptAt: metrics.lastAttemptAt,
                    updatedAt: metrics.updatedAt
                })
                .where(
                    and(
                        eq(ADAPTIVE_PERFORMANCE_TABLE.courseId, courseId),
                        eq(ADAPTIVE_PERFORMANCE_TABLE.studentEmail, studentEmail),
                        eq(ADAPTIVE_PERFORMANCE_TABLE.topicId, topicId)
                    )
                )
                .returning()

            return NextResponse.json({
                result: result[0],
                isNew: false,
                message: `Performance updated. Recommended difficulty: ${metrics.recommendedDifficulty}`
            })
        } else {
            // Create new record
            result = await db.insert(ADAPTIVE_PERFORMANCE_TABLE)
                .values({
                    courseId,
                    studentEmail,
                    topicId,
                    topicName,
                    totalAttempts: metrics.totalAttempts,
                    correctAnswers: metrics.correctAnswers,
                    averageScore: metrics.averageScore,
                    currentDifficulty: metrics.currentDifficulty,
                    recommendedDifficulty: metrics.recommendedDifficulty,
                    masteryLevel: metrics.masteryLevel,
                    isWeakTopic: metrics.isWeakTopic,
                    lastAttemptAt: metrics.lastAttemptAt
                })
                .returning()

            return NextResponse.json({
                result: result[0],
                isNew: true,
                message: `Performance tracked. Recommended difficulty: ${metrics.recommendedDifficulty}`
            })
        }
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
        const { searchParams } = new URL(req.url)
        const courseId = searchParams.get('courseId')
        const studentEmail = searchParams.get('studentEmail')

        if (!courseId || !studentEmail) {
            return NextResponse.json(
                { error: 'Missing courseId or studentEmail' },
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
