import { NextResponse } from 'next/server'
import { db } from '@/configs/db'
import { STUDY_TYPE_CONTENT_TABLE } from '@/configs/schema'
import axios from 'axios'

/**
 * POST /api/submit-quiz
 * Submit quiz answers, grade, and track adaptive performance
 * Body: { courseId, studentEmail, chapterId, topicName, answers, quizData }
 */
export async function POST(req) {
    try {
        const { courseId, studentEmail, chapterId, topicName, answers, quizData } = await req.json()

        if (!courseId || !studentEmail || !chapterId || !answers || !quizData) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        // Calculate score
        let correctCount = 0
        const totalQuestions = quizData.length
        const detailedResults = []

        quizData.forEach((question, index) => {
            const studentAnswer = answers[index]
            const isCorrect = studentAnswer === question.answer
            
            if (isCorrect) correctCount++
            
            detailedResults.push({
                question: question.question,
                studentAnswer,
                correctAnswer: question.answer,
                isCorrect,
                options: question.options
            })
        })

        const score = Math.round((correctCount / totalQuestions) * 100)

        // Track adaptive performance via background job
        try {
            await axios.post(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/adaptive-performance`, {
                courseId,
                studentEmail,
                topicId: `chapter_${chapterId}`,
                topicName,
                score,
                assessmentType: 'quiz'
            })
        } catch (perfError) {
            console.error('Warning: Could not track adaptive performance:', perfError.message)
            // Continue even if performance tracking fails
        }

        return NextResponse.json({
            result: {
                score,
                correctCount,
                totalQuestions,
                percentage: score,
                passed: score >= 45,
                detailedResults,
                timestamp: new Date()
            }
        })
    } catch (error) {
        console.error('Error submitting quiz:', error)
        return NextResponse.json(
            { error: 'Failed to submit quiz' },
            { status: 500 }
        )
    }
}
