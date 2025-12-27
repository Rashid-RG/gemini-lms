import { useState, useCallback } from 'react'

/**
 * Hook to manage adaptive difficulty for quizzes
 * Tracks performance and recommends difficulty for next assessment
 */
export const useAdaptiveDifficulty = (courseId, studentEmail) => {
    const [difficulty, setDifficulty] = useState('Easy')
    const [loading, setLoading] = useState(false)
    const [performanceRecord, setPerformanceRecord] = useState(null)

    // Fetch current performance record to determine difficulty
    const loadCurrentDifficulty = useCallback(async (topicId) => {
        try {
            setLoading(true)
            const response = await fetch(
                `/api/adaptive-performance?courseId=${courseId}&studentEmail=${studentEmail}`
            )
            const data = await response.json()
            const records = data.result || []
            
            const topicRecord = records.find(r => r.topicId === topicId)
            if (topicRecord) {
                setDifficulty(topicRecord.recommendedDifficulty || 'Easy')
                setPerformanceRecord(topicRecord)
            }
        } catch (error) {
            console.error('Error loading difficulty:', error)
            setDifficulty('Easy')
        } finally {
            setLoading(false)
        }
    }, [courseId, studentEmail])

    // Submit score and get updated recommendation
    const submitScore = useCallback(async (topicId, topicName, score) => {
        try {
            setLoading(true)
            const response = await fetch('/api/adaptive-performance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    courseId,
                    studentEmail,
                    topicId,
                    topicName,
                    score,
                    assessmentType: 'quiz'
                })
            })

            const data = await response.json()
            if (data.result) {
                setPerformanceRecord(data.result)
                setDifficulty(data.result.recommendedDifficulty)
                return data.result
            }
        } catch (error) {
            console.error('Error submitting score:', error)
        } finally {
            setLoading(false)
        }
    }, [courseId, studentEmail])

    return {
        difficulty,
        performanceRecord,
        loading,
        loadCurrentDifficulty,
        submitScore,
        masteryLevel: performanceRecord?.masteryLevel || 'novice',
        isWeakTopic: performanceRecord?.isWeakTopic || false,
        averageScore: performanceRecord?.averageScore || 0,
        totalAttempts: performanceRecord?.totalAttempts || 0
    }
}
