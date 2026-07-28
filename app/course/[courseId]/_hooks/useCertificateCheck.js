"use client"
import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import axios from 'axios'
import { toast } from 'sonner'
import { getMergedQuizScores } from '@/lib/gradingEngine'

/**
 * Hook to check if course is completed and auto-generate certificate
 * @param {string} courseId - The course ID
 * @param {object} progress - Student progress object
 * @param {object} course - Course object with hasAssignments/assignmentCount
 */
export function useCertificateCheck(courseId, progress, course = null) {
    const { user } = useUser()
    const [certificateGenerated, setCertificateGenerated] = useState(false)
    const [checking, setChecking] = useState(false)

    useEffect(() => {
        if (!user || !courseId || !progress || checking || certificateGenerated) return

        checkAndGenerateCertificate()
    }, [progress, user, courseId, course])

    const checkAndGenerateCertificate = async () => {
        try {
            setChecking(true)

            // Parse scores
            const completedChapters = Array.isArray(progress.completedChapters)
                ? progress.completedChapters
                : JSON.parse(progress.completedChapters || '[]')

            const combinedQuizScores = getMergedQuizScores(progress.quizScores, progress.mcqScores)

            const assignmentScores = typeof progress.assignmentScores === 'string'
                ? JSON.parse(progress.assignmentScores || '{}')
                : (progress.assignmentScores || {})

            // Check completion criteria
            const totalChapters = progress.totalChapters || 0
            const chaptersCompleted = completedChapters.length >= totalChapters && totalChapters > 0

            // Check if course has assignments
            const courseHasAssignments = course?.hasAssignments === true || (course?.assignmentCount && course?.assignmentCount > 0)

            // Get quiz scores
            const quizScoreValues = Object.values(combinedQuizScores)
            const assignmentScoreEntries = Object.entries(assignmentScores)

            // REQUIREMENT: Must have completed ALL quizzes
            const allQuizzesCompleted = quizScoreValues.length >= totalChapters && totalChapters > 0
            if (!allQuizzesCompleted) {
                return // Don't auto-generate if quizzes not fully completed
            }

            const avgQuizScore = quizScoreValues.reduce((sum, score) => sum + score, 0) / quizScoreValues.length

            // Check if quizzes passed (≥60%) - required
            const passedQuizzes = avgQuizScore >= 60
            
            // REQUIREMENT: If course has assignments, must have completed ALL assignments
            const expectedAssignmentCount = course?.assignmentCount || 0
            const allAssignmentsCompleted = !courseHasAssignments || (assignmentScoreEntries.length >= expectedAssignmentCount)
            
            let allAssignmentsPassed = allAssignmentsCompleted
            if (courseHasAssignments && allAssignmentsCompleted) {
                for (const [, score] of assignmentScoreEntries) {
                    const scoreNum = Number(score)
                    if (!isNaN(scoreNum) && scoreNum < 60) {
                        allAssignmentsPassed = false
                        break
                    }
                }
            }

            // Course is complete if:
            // 1. All chapters completed
            // 2. All quizzes completed with average ≥60%
            // 3. If course has assignments: ALL assignments completed with EACH assignment ≥60 points
            const isComplete = chaptersCompleted && passedQuizzes && allAssignmentsPassed

            if (isComplete && progress.status !== 'Completed') {
                // Check if certificate already exists
                try {
                    await axios.get(
                        `/api/generate-certificate?courseId=${courseId}&studentEmail=${user?.primaryEmailAddress?.emailAddress}`
                    )
                    setCertificateGenerated(true)
                } catch (error) {
                    if (error.response?.status === 404) {
                        // Certificate doesn't exist, generate it
                        await generateCertificate()
                    }
                }
            }
        } catch (error) {
            console.error('Certificate check error:', error)
        } finally {
            setChecking(false)
        }
    }

    const generateCertificate = async () => {
        try {
            const response = await axios.post('/api/generate-certificate', {
                courseId,
                studentEmail: user?.primaryEmailAddress?.emailAddress,
                studentName: user?.fullName || user?.firstName || 'Student'
            })

            if (response.data.result) {
                setCertificateGenerated(true)
                
                // Show celebration toast
                toast.success('🎉 Congratulations! Certificate Earned!', {
                    description: 'You\'ve completed the course! Check your certificate now.',
                    duration: 8000,
                    position: 'top-center',
                    action: {
                        label: 'View Certificate',
                        onClick: () => {
                            window.location.href = `/course/${courseId}/certificate`
                        }
                    }
                })

                // Send email notification
                await sendCertificateEmail(response.data.result)
            }
        } catch (error) {
            console.error('Certificate generation error:', error)
        }
    }

    const sendCertificateEmail = async (certificate) => {
        try {
            await axios.post('/api/send-certificate-email', {
                studentEmail: certificate.studentEmail,
                studentName: certificate.studentName,
                courseName: certificate.courseName,
                certificateId: certificate.certificateId,
                finalScore: certificate.finalScore,
                courseId: courseId
            })
            console.log('Certificate email sent successfully via Resend')
        } catch (error) {
            console.error('Email send error:', error)
            // Don't fail the certificate generation if email fails
        }
    }

    return { certificateGenerated, checking }
}
