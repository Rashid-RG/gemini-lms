/**
 * Adaptive Difficulty Engine
 * Tracks student performance per topic and recommends difficulty adjustments
 * Identifies weak topics for spaced repetition
 */

/**
 * Calculate mastery level based on score and attempts
 * @param {number} averageScore - Average score percentage
 * @param {number} totalAttempts - Total attempts
 * @returns {string} mastery level
 */
export const calculateMasteryLevel = (averageScore, totalAttempts) => {
    if (totalAttempts === 0) return 'novice'
    if (averageScore >= 85 && totalAttempts >= 2) return 'expert'
    if (averageScore >= 80 && totalAttempts >= 1) return 'proficient'
    if (averageScore >= 70 && totalAttempts >= 1) return 'intermediate'
    if (averageScore >= 60) return 'beginner'
    return 'novice'
}

/**
 * Recommend next difficulty level based on performance
 * @param {number} averageScore - Average score percentage
 * @param {number} totalAttempts - Total attempts
 * @param {string} currentDifficulty - Current difficulty level
 * @returns {string} recommended difficulty
 */
export const recommendDifficulty = (averageScore, totalAttempts, currentDifficulty) => {
    const difficulties = ['Easy', 'Medium', 'Hard']
    const currentIndex = difficulties.indexOf(currentDifficulty)

    // If score is very high and attempted multiple times, increase difficulty
    if (averageScore >= 85 && totalAttempts >= 2 && currentIndex < 2) {
        return difficulties[currentIndex + 1]
    }

    // If score is high, keep current or slightly increase
    if (averageScore >= 70 && totalAttempts >= 1) {
        return currentDifficulty
    }

    // If score is low, decrease difficulty or keep at Easy
    if (averageScore < 60 && totalAttempts >= 2 && currentIndex > 0) {
        return difficulties[currentIndex - 1]
    }

    return currentDifficulty
}

/**
 * Identify if topic is weak (needs spaced repetition)
 * @param {number} averageScore - Average score percentage
 * @param {number} totalAttempts - Total attempts
 * @param {number} recentScore - Most recent attempt score
 * @returns {boolean} true if weak topic
 */
export const isWeakTopic = (averageScore, totalAttempts, recentScore = averageScore) => {
    // Topic is weak if:
    // 1. Attempted multiple times AND average score < 60%
    // 2. Single attempt with score below 70%
    // 3. Average score below 75% after 2+ attempts
    if (totalAttempts === 1) return recentScore < 70
    return (totalAttempts >= 2 && averageScore < 75) || recentScore < 60
}

/**
 * Calculate performance metrics after assessment
 * @param {Object} existingRecord - Existing performance record or null
 * @param {number} newScore - New assessment score (0-100)
 * @param {string} topicName - Topic name
 * @returns {Object} updated metrics
 */
export const calculatePerformanceMetrics = (existingRecord, newScore, topicName) => {
    const totalAttempts = (existingRecord?.totalAttempts || 0) + 1
    const correctAnswers = (existingRecord?.correctAnswers || 0) + (newScore >= 45 ? 1 : 0)
    
    // Calculate running average
    const previousTotal = (existingRecord?.averageScore || 0) * (existingRecord?.totalAttempts || 0)
    const averageScore = Math.round((previousTotal + newScore) / totalAttempts)

    const recommendedDifficulty = recommendDifficulty(
        averageScore,
        totalAttempts,
        existingRecord?.currentDifficulty || 'Easy'
    )

    const masteryLevel = calculateMasteryLevel(averageScore, totalAttempts)
    const isWeak = isWeakTopic(averageScore, totalAttempts, newScore)

    return {
        totalAttempts,
        correctAnswers,
        averageScore,
        recommendedDifficulty,
        masteryLevel,
        isWeakTopic: isWeak,
        currentDifficulty: existingRecord?.currentDifficulty || recommendedDifficulty,
        reviewCount: existingRecord?.reviewCount || 0,
        lastAttemptAt: new Date(),
        updatedAt: new Date()
    }
}

/**
 * Get topics that need review (weak topics)
 * @param {Array} performanceRecords - Array of performance records
 * @returns {Array} sorted by need for review (lowest score first)
 */
export const getTopicsNeedingReview = (performanceRecords) => {
    return performanceRecords
        .filter(record => record.isWeakTopic)
        .sort((a, b) => a.averageScore - b.averageScore)
}

/**
 * Generate quiz difficulty based on performance
 * @param {Object} performanceRecord - Performance record for topic
 * @returns {string} difficulty level for next quiz
 */
export const getQuizDifficulty = (performanceRecord) => {
    if (!performanceRecord) return 'Easy'
    return performanceRecord.recommendedDifficulty || 'Easy'
}

/**
 * Calculate engagement score (for dashboard insights)
 * @param {Object} performanceRecord - Performance record
 * @returns {number} engagement score 0-100
 */
export const calculateEngagementScore = (performanceRecord) => {
    if (!performanceRecord) return 0
    
    const attemptBonus = Math.min(performanceRecord.totalAttempts * 10, 40)
    const scoreBonus = performanceRecord.averageScore * 0.6
    
    return Math.round(attemptBonus + scoreBonus)
}

/**
 * Get mastery summary for course dashboard
 * @param {Array} performanceRecords - All performance records for course
 * @returns {Object} mastery summary
 */
export const getMasterySummary = (performanceRecords = []) => {
    if (performanceRecords.length === 0) {
        return {
            overallMastery: 0,
            topicsMastered: 0,
            topicsProficient: 0,
            topicsNeedingWork: 0,
            weakTopics: []
        }
    }

    const topicsMastered = performanceRecords.filter(r => ['expert', 'proficient'].includes(r.masteryLevel)).length
    const topicsProficient = performanceRecords.filter(r => r.masteryLevel === 'intermediate').length
    const topicsNeedingWork = performanceRecords.filter(r => ['novice', 'beginner'].includes(r.masteryLevel)).length
    const weakTopics = performanceRecords.filter(r => r.isWeakTopic).sort((a, b) => a.averageScore - b.averageScore).slice(0, 5)

    const overallMastery = Math.round(
        performanceRecords.reduce((sum, r) => sum + r.averageScore, 0) / performanceRecords.length
    )

    return {
        overallMastery,
        topicsMastered,
        topicsProficient,
        topicsNeedingWork,
        weakTopics: weakTopics.map(t => ({
            topicId: t.topicId,
            topicName: t.topicName,
            score: t.averageScore,
            attempts: t.totalAttempts
        }))
    }
}
