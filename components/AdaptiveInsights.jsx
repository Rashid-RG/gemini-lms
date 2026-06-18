import React, { useState, useEffect } from 'react'
import { AlertCircle, TrendingUp, BookOpen, Zap, Loader2, Award } from 'lucide-react'

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
            <div className="backdrop-blur-md bg-white/70 border border-slate-200/50 shadow-sm rounded-2xl p-6 flex items-center justify-center min-h-[200px]">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                    <p className="text-slate-500 text-xs font-semibold">Generating adaptive learning insights...</p>
                </div>
            </div>
        )
    }

    if (!performanceData || performanceData.length === 0) {
        return (
            <div className="backdrop-blur-md bg-white/70 border border-slate-200/50 shadow-sm rounded-2xl p-8 flex flex-col md:flex-row items-center gap-6">
                <div className="p-4 bg-indigo-50 border border-indigo-200/50 rounded-2xl text-indigo-600 shadow-sm">
                    <BookOpen className="w-8 h-8" />
                </div>
                <div className="flex-1 text-center md:text-left">
                    <h3 className="text-base font-bold text-slate-800">Unlock Adaptive Learning Insights</h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-xl">
                        Complete course quizzes and assessments to generate personalized insights, track your mastery levels, and get intelligent task difficulty recommendations.
                    </p>
                    <button
                        onClick={() => window.location.href = `/course/${courseId}/quiz`}
                        className="mt-4 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/10 active:scale-[0.98] transition-all duration-200"
                    >
                        Take a Quiz Now
                    </button>
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
                <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white p-5 rounded-2xl shadow-md shadow-indigo-500/10 hover:shadow-lg transition-all duration-300 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider opacity-85">Overall Mastery</p>
                        <p className="text-3xl font-extrabold mt-1 tracking-tight">{avgScore}%</p>
                    </div>
                    <div className="p-3 bg-white/10 rounded-xl">
                        <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                </div>

                {/* Topics Mastered */}
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white p-5 rounded-2xl shadow-md shadow-emerald-500/10 hover:shadow-lg transition-all duration-300 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider opacity-85">Topics Mastered</p>
                        <p className="text-3xl font-extrabold mt-1 tracking-tight">{masteredTopics.length}</p>
                    </div>
                    <div className="p-3 bg-white/10 rounded-xl">
                        <Award className="w-6 h-6 text-white" />
                    </div>
                </div>

                {/* Topics Needing Review */}
                <div className={`bg-gradient-to-br from-orange-500 to-orange-600 text-white p-5 rounded-2xl shadow-md shadow-orange-500/10 hover:shadow-lg transition-all duration-300 flex items-center justify-between ${weakTopics.length > 0 ? 'ring-2 ring-orange-300' : ''}`}>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider opacity-85">Needs Review</p>
                        <p className="text-3xl font-extrabold mt-1 tracking-tight">{weakTopics.length}</p>
                    </div>
                    <div className="p-3 bg-white/10 rounded-xl">
                        <AlertCircle className="w-6 h-6 text-white animate-pulse" />
                    </div>
                </div>
            </div>

            {/* Mastery Breakdown */}
            <div className="backdrop-blur-md bg-white/70 border border-slate-200/50 shadow-sm rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-base font-bold text-slate-800">Mastery Breakdown</h3>
                    <p className="text-xs text-slate-400 font-medium">Topic distribution by mastery level</p>
                </div>
                <div className="space-y-4">
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
                            expert: 'bg-emerald-500 shadow-sm shadow-emerald-500/20',
                            proficient: 'bg-teal-500 shadow-sm shadow-teal-500/20',
                            intermediate: 'bg-indigo-500 shadow-sm shadow-indigo-500/20',
                            beginner: 'bg-amber-500 shadow-sm shadow-amber-500/20',
                            novice: 'bg-rose-500 shadow-sm shadow-rose-500/20'
                        }
                        return (
                            <div key={level} className="space-y-1.5">
                                <div className="flex items-center justify-between text-xs text-slate-600 font-semibold">
                                    <span>{labels[level]}</span>
                                    <span className="text-slate-400">{count} • {pct}%</span>
                                </div>
                                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/20">
                                    <div
                                        className={`${barColors[level]} h-full rounded-full transition-all duration-500`}
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
                <div className="bg-orange-50/50 border border-orange-200/60 backdrop-blur-sm p-6 rounded-2xl shadow-sm space-y-4">
                    <h3 className="flex items-center text-base font-bold text-orange-950">
                        <Zap className="w-5 h-5 mr-2 text-orange-500" />
                        Topics to Master via Spaced Repetition
                    </h3>
                    <div className="space-y-3">
                        {weakTopics.map((topic) => (
                            <div key={topic.id} className="bg-white/90 border border-slate-100 p-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-slate-800 text-sm">{topic.topicName}</h4>
                                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                                        topic.averageScore >= 60
                                            ? 'bg-amber-50 text-amber-600 border-amber-200/50'
                                            : 'bg-rose-50 text-rose-600 border-rose-200/50'
                                    }`}>
                                        {topic.averageScore}%
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 mb-3 font-medium">
                                    {topic.totalAttempts} attempts • Current difficulty: <span className="font-bold text-slate-700 capitalize">{topic.currentDifficulty}</span> • Mastery: <span className="font-bold text-slate-700 capitalize">{topic.masteryLevel}</span>
                                </p>
                                <div className="w-full bg-slate-100 rounded-full h-2 mb-4 overflow-hidden">
                                    <div
                                        className="bg-orange-500 h-full rounded-full"
                                        style={{ width: `${topic.averageScore}%` }}
                                    />
                                </div>
                                <button
                                    className="text-xs w-full py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-lg transition-colors active:scale-95"
                                    onClick={() => {
                                        const sanitizedId = String(topic.topicId).replace(/[^a-zA-Z0-9-_]/g, '')
                                        const element = document.getElementById(`review-${sanitizedId}`)
                                        if (element) {
                                            element.scrollIntoView({ behavior: 'smooth' })
                                        }
                                    }}
                                >
                                    Review This Topic
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* All Topics Progress */}
            <div className="backdrop-blur-md bg-white/70 border border-slate-200/50 shadow-sm rounded-2xl p-6">
                <h3 className="text-base font-bold text-slate-800 mb-4">Topic Performance Overview</h3>
                <div className="space-y-2.5">
                    {performanceData.map((topic) => (
                        <div key={topic.id} className="flex items-center justify-between p-3.5 bg-white/60 hover:bg-white border border-slate-100 rounded-xl hover:shadow-sm hover:border-slate-200/50 transition-all duration-200">
                            <div className="flex-1">
                                <p className="font-bold text-slate-800 text-sm">{topic.topicName}</p>
                                <p className="text-[10px] text-slate-400 font-semibold mt-0.5 capitalize">
                                    {topic.totalAttempts} attempt{topic.totalAttempts !== 1 ? 's' : ''} • {topic.masteryLevel}
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-24 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/10">
                                    <div
                                        className={`h-full rounded-full ${
                                            topic.averageScore >= 80
                                                ? 'bg-emerald-500'
                                                : topic.averageScore >= 60
                                                ? 'bg-amber-500'
                                                : 'bg-rose-500'
                                        }`}
                                        style={{ width: `${topic.averageScore}%` }}
                                    />
                                </div>
                                <span className="text-xs font-bold text-slate-700 w-12 text-right">{topic.averageScore}%</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Tips Section */}
            <div className="bg-gradient-to-br from-indigo-50/40 to-violet-50/40 border border-indigo-100/50 p-6 rounded-2xl">
                <h3 className="font-bold text-indigo-950 text-sm mb-3">💡 Learning Tips</h3>
                <ul className="text-xs text-indigo-900/85 space-y-2 font-medium">
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
