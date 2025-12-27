import React, { useState, useEffect } from 'react'
import { AlertCircle, TrendingUp, BookOpen, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'

const AdaptiveInsights = ({ courseId, studentEmail }) => {
    const [performanceData, setPerformanceData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        fetchPerformanceData()
    }, [courseId, studentEmail])

    const fetchPerformanceData = async () => {
        try {
            setLoading(true)
            const response = await fetch(
                `/api/adaptive-performance?courseId=${courseId}&studentEmail=${studentEmail}`
            )
            const data = await response.json()
            setPerformanceData(data.result || [])
            setError(null)
        } catch (err) {
            console.error('Error fetching performance data:', err)
            setError('Failed to load adaptive insights')
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="bg-blue-50 p-6 rounded-lg">
                <p className="text-gray-600">Loading adaptive insights...</p>
            </div>
        )
    }

    if (!performanceData || performanceData.length === 0) {
        return (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 p-8 rounded-lg">
                <div className="flex items-start gap-4">
                    <div className="bg-blue-100 p-3 rounded-full">
                        <BookOpen className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-800 mb-2">No Performance Data Yet</h3>
                        <p className="text-gray-600 mb-4">
                            Complete quizzes or assessments to unlock personalized adaptive learning insights, 
                            track your mastery level, and get intelligent difficulty recommendations.
                        </p>
                        <Button 
                            onClick={() => window.location.href = `/course/${courseId}/quiz`}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            Take a Quiz Now
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    // Calculate summary metrics
    const avgScore = Math.round(
        performanceData.reduce((sum, p) => sum + p.averageScore, 0) / performanceData.length
    )
    const weakTopics = performanceData.filter(p => p.isWeakTopic)
    const masteredTopics = performanceData.filter(p => ['expert', 'proficient'].includes(p.masteryLevel))

    // Mastery distribution for simple charting
    const masteryCounts = performanceData.reduce((acc, topic) => {
        acc[topic.masteryLevel] = (acc[topic.masteryLevel] || 0) + 1
        return acc
    }, {})

    const masteryLevels = ['expert', 'proficient', 'intermediate', 'beginner', 'novice']
    const totalTopics = performanceData.length

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Overall Mastery */}
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-lg shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-semibold opacity-90">Overall Mastery</p>
                            <p className="text-3xl font-bold">{avgScore}%</p>
                        </div>
                        <TrendingUp className="w-10 h-10 opacity-50" />
                    </div>
                </div>

                {/* Topics Mastered */}
                <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-lg shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-semibold opacity-90">Topics Mastered</p>
                            <p className="text-3xl font-bold">{masteredTopics.length}</p>
                        </div>
                        <BookOpen className="w-10 h-10 opacity-50" />
                    </div>
                </div>

                {/* Topics Needing Review */}
                <div className={`bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-lg shadow ${weakTopics.length > 0 ? 'ring-2 ring-orange-300' : ''}`}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-semibold opacity-90">Needs Review</p>
                            <p className="text-3xl font-bold">{weakTopics.length}</p>
                        </div>
                        <AlertCircle className="w-10 h-10 opacity-50" />
                    </div>
                </div>
            </div>

            {/* Mastery Breakdown */}
            <div className="bg-white border border-gray-200 p-6 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-800">Mastery Breakdown</h3>
                    <p className="text-sm text-gray-500">Topic distribution by mastery level</p>
                </div>
                <div className="space-y-3">
                    {masteryLevels.map(level => {
                        const count = masteryCounts[level] || 0
                        const pct = totalTopics ? Math.round((count / totalTopics) * 100) : 0
                        const labels = {
                            expert: 'Expert',
                            proficient: 'Proficient',
                            intermediate: 'Intermediate',
                            beginner: 'Beginner',
                            novice: 'Novice'
                        }
                        const barColors = {
                            expert: 'bg-emerald-500',
                            proficient: 'bg-green-400',
                            intermediate: 'bg-blue-400',
                            beginner: 'bg-amber-400',
                            novice: 'bg-rose-400'
                        }
                        return (
                            <div key={level} className="space-y-1">
                                <div className="flex items-center justify-between text-sm text-gray-700">
                                    <span>{labels[level]}</span>
                                    <span className="text-gray-500">{count} • {pct}%</span>
                                </div>
                                <div className="w-full h-2 bg-gray-200 rounded-full">
                                    <div
                                        className={`${barColors[level]} h-2 rounded-full transition-all`}
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Weak Topics - Spaced Repetition */}
            {weakTopics.length > 0 && (
                <div className="bg-orange-50 border-l-4 border-orange-400 p-6 rounded">
                    <h3 className="flex items-center text-lg font-bold text-orange-900 mb-4">
                        <Zap className="w-5 h-5 mr-2 text-orange-500" />
                        Topics to Master via Spaced Repetition
                    </h3>
                    <div className="space-y-3">
                        {weakTopics.map((topic) => (
                            <div key={topic.id} className="bg-white p-4 rounded-lg shadow-sm">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-semibold text-gray-800">{topic.topicName}</h4>
                                    <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                                        topic.averageScore >= 60
                                            ? 'bg-yellow-100 text-yellow-800'
                                            : 'bg-red-100 text-red-800'
                                    }`}>
                                        {topic.averageScore}%
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600 mb-3">
                                    {topic.totalAttempts} attempts • Current difficulty: <span className="font-semibold">{topic.currentDifficulty}</span> • Mastery: {topic.masteryLevel}
                                </p>
                                <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                                    <div
                                        className="bg-orange-500 h-2 rounded-full"
                                        style={{ width: `${topic.averageScore}%` }}
                                    />
                                </div>
                                <Button
                                    variant="outline"
                                    className="text-sm w-full"
                                    onClick={() => {
                                        const sanitizedId = String(topic.topicId).replace(/[^a-zA-Z0-9-_]/g, '')
                                        const element = document.getElementById(`review-${sanitizedId}`)
                                        if (element) {
                                            element.scrollIntoView({ behavior: 'smooth' })
                                        }
                                    }}
                                >
                                    Review This Topic
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* All Topics Progress */}
            <div className="bg-white border border-gray-200 p-6 rounded-lg">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Topic Performance Overview</h3>
                <div className="space-y-3">
                    {performanceData.map((topic) => (
                        <div key={topic.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                            <div className="flex-1">
                                <p className="font-semibold text-gray-800">{topic.topicName}</p>
                                <p className="text-xs text-gray-500">
                                    {topic.totalAttempts} attempt{topic.totalAttempts !== 1 ? 's' : ''} • {topic.masteryLevel}
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-24 bg-gray-200 rounded-full h-2">
                                    <div
                                        className={`h-2 rounded-full ${
                                            topic.averageScore >= 80
                                                ? 'bg-green-500'
                                                : topic.averageScore >= 60
                                                ? 'bg-yellow-500'
                                                : 'bg-red-500'
                                        }`}
                                        style={{ width: `${topic.averageScore}%` }}
                                    />
                                </div>
                                <span className="text-sm font-bold text-gray-700 w-12 text-right">{topic.averageScore}%</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Tips Section */}
            <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg">
                <h3 className="font-bold text-gray-800 mb-3">💡 Learning Tips</h3>
                <ul className="text-sm text-gray-700 space-y-2">
                    <li>• <strong>Difficulty Adjusts Automatically</strong>: As you improve, quizzes get harder to challenge you</li>
                    <li>• <strong>Spaced Repetition</strong>: Review weak topics regularly to build long-term memory</li>
                    <li>• <strong>Aim for Mastery</strong>: Target 80%+ on assessments to unlock "Proficient" level</li>
                    <li>• <strong>Consistent Practice</strong>: 3+ attempts per topic accelerates mastery</li>
                </ul>
            </div>
        </div>
    )
}

export default AdaptiveInsights
