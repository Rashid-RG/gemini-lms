import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { db } from '@/configs/db'
import { ADAPTIVE_PERFORMANCE_TABLE } from '@/configs/schema'
import { and, eq } from 'drizzle-orm'
import { getMasterySummary } from '@/lib/adaptiveDifficulty'
import { buildReminderEmailHTML } from '@/lib/reminderEmail'

// Initialize Resend with API key (will be undefined if not set in env)
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export async function POST(req) {
    try {
        if (!resend || !process.env.RESEND_API_KEY) {
            return NextResponse.json(
                { error: 'Email service not configured. Set RESEND_API_KEY in environment variables.' },
                { status: 500 }
            )
        }

        const { studentEmail, studentName, courseId, courseName } = await req.json()

        if (!studentEmail || !courseId || !studentName || !courseName) {
            return NextResponse.json(
                { error: 'studentEmail, studentName, courseId, and courseName are required' },
                { status: 400 }
            )
        }

        // Fetch performance data for the course
        const records = await db.select().from(ADAPTIVE_PERFORMANCE_TABLE)
            .where(
                and(
                    eq(ADAPTIVE_PERFORMANCE_TABLE.courseId, courseId),
                    eq(ADAPTIVE_PERFORMANCE_TABLE.studentEmail, studentEmail)
                )
            )

        const summary = getMasterySummary(records)
        const weakTopics = records
            .filter(r => r.isWeakTopic)
            .slice(0, 3)
            .map(t => ({
                topicName: t.topicName,
                score: t.averageScore,
                recommendedDifficulty: t.recommendedDifficulty
            }))

        // Get next action
        const nextAction = records.length
            ? records
                .slice()
                .sort((a, b) => {
                    const weakA = a.isWeakTopic ? 0 : 1
                    const weakB = b.isWeakTopic ? 0 : 1
                    if (weakA !== weakB) return weakA - weakB
                    return (a.averageScore || 0) - (b.averageScore || 0)
                })[0]
            : null

        const nextActionData = nextAction
            ? {
                topicName: nextAction.topicName,
                score: nextAction.averageScore,
                recommendedDifficulty: nextAction.recommendedDifficulty,
                isWeakTopic: nextAction.isWeakTopic,
                suggestion: nextAction.isWeakTopic
                    ? `Revisit ${nextAction.topicName} and take a quiz at ${nextAction.recommendedDifficulty} difficulty.`
                    : `Keep your streak—take a quiz on ${nextAction.topicName} to reinforce learning.`
            }
            : null

        // Build HTML email
        const html = buildReminderEmailHTML({
            studentName,
            courseName,
            overallMastery: summary.overallMastery,
            topicsMastered: summary.topicsMastered,
            topicsNeedingWork: summary.topicsNeedingWork,
            nextActionTopic: nextActionData,
            weakTopics
        })

        // Send email via Resend
        const result = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
            to: studentEmail,
            subject: `Your Weekly Progress Summary - ${courseName}`,
            html
        })

        if (result.error) {
            console.error('Resend error:', result.error)
            return NextResponse.json(
                { error: `Email service error: ${result.error.message || 'Unknown error'}` },
                { status: 500 }
            )
        }

        return NextResponse.json({
            result: {
                success: true,
                emailId: result.data?.id,
                message: `Email sent to ${studentEmail}`
            }
        })
    } catch (error) {
        console.error('Error sending reminder email:', error)
        return NextResponse.json(
            { error: `Server error: ${error.message || 'Failed to send reminder email'}` },
            { status: 500 }
        )
    }
}
