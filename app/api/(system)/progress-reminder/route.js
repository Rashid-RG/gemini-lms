import { NextResponse } from 'next/server'
import { db } from '@/configs/db'
import { ADAPTIVE_PERFORMANCE_TABLE } from '@/configs/schema'
import { and, eq } from 'drizzle-orm'
import { getMasterySummary } from '@/lib/adaptiveDifficulty'

export async function POST(req) {
    try {
        const { studentEmail, courseId } = await req.json()

        if (!studentEmail || !courseId) {
            return NextResponse.json(
                { error: 'studentEmail and courseId are required' },
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

        const summary = getMasterySummary(records)

        // Pick a next action topic: prefer weak topics, else lowest score
        const candidate = records.length
            ? records
                .slice()
                .sort((a, b) => {
                    const weakA = a.isWeakTopic ? 0 : 1
                    const weakB = b.isWeakTopic ? 0 : 1
                    if (weakA !== weakB) return weakA - weakB
                    return (a.averageScore || 0) - (b.averageScore || 0)
                })[0]
            : null

        const nextAction = candidate
            ? {
                topicId: candidate.topicId,
                topicName: candidate.topicName,
                averageScore: candidate.averageScore,
                recommendedDifficulty: candidate.recommendedDifficulty,
                isWeakTopic: candidate.isWeakTopic,
                suggestion: candidate.isWeakTopic
                    ? 'Revisit this topic and retake a quiz.'
                    : 'Keep your streak—take the next quiz to reinforce learning.'
            }
            : null

        return NextResponse.json({
            result: {
                summary,
                nextAction,
                totalTopics: records.length
            }
        })
    } catch (error) {
        console.error('Error creating progress reminder summary:', error)
        return NextResponse.json(
            { error: 'Failed to create reminder summary' },
            { status: 500 }
        )
    }
}
