"use client"
import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { Progress } from '@/components/ui/progress'
import { Award, CheckCircle, Clock, BookOpen, Zap, RefreshCw } from 'lucide-react'
import { getGradeColor, getGradeLabel, getGradeBgColor, getGradeBorderColor, GRADING_SCALE } from '@/lib/gradingSystem'
import { useCertificateCheck } from '../_hooks/useCertificateCheck'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

// Shared cache for progress data across components
const progressCache = {
    data: null,
    timestamp: 0,
    isLoading: false,
    CACHE_DURATION: 60000 // Cache for 60 seconds to reduce API calls
}

function ProgressTracker({ courseId, studentEmail, course }) {
    const [progress, setProgress] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [syncing, setSyncing] = useState(false)
    const retryCountRef = React.useRef(0)
    const MAX_RETRIES = 3

    useEffect(() => {
        if (courseId && studentEmail) {
            fetchProgress()
            // Increased interval to 90s to reduce API load significantly
            const interval = setInterval(fetchProgress, 90000)
            return () => clearInterval(interval)
        }
    }, [courseId, studentEmail])

    const fetchProgress = async (isRetry = false) => {
        const now = Date.now()
        
        // Use cache if valid - show stale data immediately
        if (progressCache.data && (now - progressCache.timestamp) < progressCache.CACHE_DURATION) {
            setProgress(progressCache.data)
            setLoading(false)
            if (!isRetry) return // Only skip fetch if not a retry
        }
        
        // Prevent concurrent requests
        if (progressCache.isLoading && !isRetry) {
            return
        }

        try {
            progressCache.isLoading = true
            const response = await axios.get(
                `/api/student-progress?courseId=${courseId}&studentEmail=${studentEmail}`,
                { timeout: 30000 } // Increased to 30s for slow DB connections
            )
            setProgress(response.data.result)
            progressCache.data = response.data.result
            progressCache.timestamp = now
            retryCountRef.current = 0
            setError(null)
        } catch (err) {
            // Silently use cached data if available
            if (progressCache.data) {
                setProgress(progressCache.data)
                console.log('Using cached progress data due to fetch error')
            }
            
            // Retry logic for timeout errors with exponential backoff
            if (err.code === 'ECONNABORTED' && retryCountRef.current < MAX_RETRIES) {
                retryCountRef.current += 1
                const delay = 2000 * retryCountRef.current // 2s, 4s, 6s
                console.log(`Retrying progress fetch (attempt ${retryCountRef.current}) in ${delay}ms...`)
                setTimeout(() => fetchProgress(true), delay)
            }
            // Don't set error for timeouts - just use cached data
        } finally {
            progressCache.isLoading = false
            setLoading(false)
        }
    }

    // Sync progress from all graded submissions
    const syncProgress = async () => {
        setSyncing(true)
        try {
            const response = await axios.post('/api/sync-progress', {
                courseId,
                studentEmail
            })
            
            if (response.data.success) {
                toast.success(`Progress synced! Final score updated to ${response.data.newFinalScore}%`)
                // Clear cache and refetch
                progressCache.timestamp = 0
                await fetchProgress()
            } else {
                toast.error('Could not sync progress')
            }
        } catch (err) {
            console.error('Sync error:', err)
            toast.error('Failed to sync progress')
        } finally {
            setSyncing(false)
        }
    }

    // Check for certificate eligibility - pass course to check if it has assignments
    useCertificateCheck(courseId, progress, course)

    // Memoize parsed values to avoid re-parsing on every render
    // NOTE: This must be called unconditionally (before any returns) to follow Rules of Hooks
    const memoizedProgress = React.useMemo(() => {
        if (!progress) {
            return {
                completedChapters: [],
                quizScores: {},
                assignmentScores: {},
                progressPercent: 0,
                quizScoresArray: [],
                assignmentScoresArray: [],
                avgQuizScore: 0,
                avgAssignmentScore: 0
            }
        }

        const completedChapters = Array.isArray(progress.completedChapters) 
            ? progress.completedChapters 
            : JSON.parse(progress.completedChapters || '[]')
        
        const quizScores = typeof progress.quizScores === 'string' 
            ? JSON.parse(progress.quizScores || '{}') 
            : (progress.quizScores || {})
        
        const assignmentScores = typeof progress.assignmentScores === 'string' 
            ? JSON.parse(progress.assignmentScores || '{}') 
            : (progress.assignmentScores || {})

        const progressPercent = progress.progressPercentage || 0
        const quizScoresArray = Object.values(quizScores).filter(s => typeof s === 'number')
        const assignmentScoresArray = Object.values(assignmentScores).filter(s => typeof s === 'number')
        const avgQuizScore = quizScoresArray.length > 0 
            ? Math.round(quizScoresArray.reduce((a, b) => a + b, 0) / quizScoresArray.length)
            : 0
        const avgAssignmentScore = assignmentScoresArray.length > 0 
            ? Math.round(assignmentScoresArray.reduce((a, b) => a + b, 0) / assignmentScoresArray.length)
            : 0
        
        return {
            completedChapters,
            quizScores,
            assignmentScores,
            progressPercent,
            quizScoresArray,
            assignmentScoresArray,
            avgQuizScore,
            avgAssignmentScore
        }
    }, [progress])
    
    const { completedChapters, quizScores, assignmentScores, progressPercent, quizScoresArray, assignmentScoresArray, avgQuizScore, avgAssignmentScore } = memoizedProgress

    if (loading) {
        return (
            <div className="w-full space-y-4 animate-pulse">
                <div className="h-32 bg-slate-200 rounded-lg"></div>
            </div>
        )
    }

    if (!progress) {
        return <div className="text-center text-gray-500">No progress data available</div>
    }

    return (
        <div className="w-full space-y-6 p-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl">
            {error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-lg">
                    {error}
                </div>
            )}

            {/* Completed vs Remaining Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Completed Chapters */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-sm p-6 border border-green-200 hover:shadow-md transition">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-lg font-semibold text-slate-900">Chapters Completed</h4>
                        <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="text-4xl font-bold text-green-600 mb-2">
                        {completedChapters.length}
                    </div>
                    <div className="text-sm text-slate-600">
                        of {progress.totalChapters} total chapters
                    </div>
                    <div className="mt-4 p-3 bg-white rounded-lg">
                        <p className="text-xs text-slate-600 font-medium">COMPLETION RATE</p>
                        <div className="flex items-center gap-2 mt-2">
                            <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-gradient-to-r from-green-500 to-emerald-600" 
                                    style={{ width: `${(completedChapters.length / progress.totalChapters) * 100 || 0}%` }}
                                ></div>
                            </div>
                            <span className="text-sm font-bold text-green-600">
                                {Math.round((completedChapters.length / progress.totalChapters) * 100 || 0)}%
                            </span>
                        </div>
                    </div>
                </div>

                {/* Remaining Chapters */}
                <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl shadow-sm p-6 border border-orange-200 hover:shadow-md transition">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-lg font-semibold text-slate-900">Chapters Remaining</h4>
                        <Clock className="w-6 h-6 text-orange-600" />
                    </div>
                    <div className="text-4xl font-bold text-orange-600 mb-2">
                        {progress.totalChapters - completedChapters.length}
                    </div>
                    <div className="text-sm text-slate-600">
                        chapters to complete
                    </div>
                    <div className="mt-4 p-3 bg-white rounded-lg">
                        <p className="text-xs text-slate-600 font-medium">REMAINING PROGRESS</p>
                        <div className="flex items-center gap-2 mt-2">
                            <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-gradient-to-r from-orange-500 to-red-600" 
                                    style={{ width: `${((progress.totalChapters - completedChapters.length) / progress.totalChapters) * 100 || 0}%` }}
                                ></div>
                            </div>
                            <span className="text-sm font-bold text-orange-600">
                                {Math.round(((progress.totalChapters - completedChapters.length) / progress.totalChapters) * 100 || 0)}%
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Overall Progress */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <Zap className="w-6 h-6 text-blue-600" />
                        <h3 className="text-lg font-semibold text-slate-900">Overall Course Progress</h3>
                    </div>
                    <span className="text-3xl font-bold text-blue-600">{progressPercent}%</span>
                </div>
                <Progress value={progressPercent} className="h-3" />
                <div className="mt-3 text-sm text-slate-600">
                    {completedChapters.length} of {progress.totalChapters} chapters completed
                </div>
            </div>

            {/* Score Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Quiz Scores */}
                <div className="bg-white rounded-xl shadow-sm p-5 border border-slate-200 hover:shadow-md transition">
                    <div className="flex items-center gap-2 mb-3">
                        <BookOpen className="w-5 h-5 text-purple-600" />
                        <h4 className="font-semibold text-slate-900">Quiz Average</h4>
                    </div>
                    <div className={`text-4xl font-bold ${getGradeColor(avgQuizScore)}`}>
                        {avgQuizScore}
                    </div>
                    <div className="text-sm text-slate-600 mt-2">
                        {quizScoresArray.length} quizzes attempted
                    </div>
                </div>

                {/* Assignment Scores */}
                <div className="bg-white rounded-xl shadow-sm p-5 border border-slate-200 hover:shadow-md transition">
                    <div className="flex items-center gap-2 mb-3">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <h4 className="font-semibold text-slate-900">Assignment Average</h4>
                    </div>
                    <div className={`text-4xl font-bold ${getGradeColor(avgAssignmentScore)}`}>
                        {avgAssignmentScore}
                    </div>
                    <div className="text-sm text-slate-600 mt-2">
                        {assignmentScoresArray.length} assignments submitted
                    </div>
                </div>

                {/* Final Grade */}
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl shadow-sm p-5 border border-blue-200 hover:shadow-md transition">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Award className="w-5 h-6 text-blue-600" />
                            <h4 className="font-semibold text-slate-900">Final Grade</h4>
                        </div>
                        <Button
                            onClick={syncProgress}
                            disabled={syncing}
                            variant="ghost"
                            size="sm"
                            className="text-blue-600 hover:bg-blue-100 text-xs"
                            title="Sync scores from all graded assignments"
                        >
                            <RefreshCw className={`w-3 h-3 mr-1 ${syncing ? 'animate-spin' : ''}`} />
                            {syncing ? 'Syncing...' : 'Sync'}
                        </Button>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className={`text-4xl font-bold ${getGradeColor(progress.finalScore)}`}>
                            {progress.finalScore}
                        </div>
                        <div className={`text-2xl font-bold px-3 py-1 rounded-lg bg-white ${getGradeColor(progress.finalScore)}`}>
                            {getGradeLabel(progress.finalScore)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Status Badge */}
            <div className="bg-white rounded-xl shadow-sm p-4 border border-slate-200 flex items-center gap-3">
                {progress.status === 'Completed' ? (
                    <>
                        <CheckCircle className="w-6 h-6 text-green-600" />
                        <div>
                            <p className="font-semibold text-slate-900">Course Completed</p>
                            <p className="text-sm text-slate-600">
                                Completed on {progress.completedAt ? new Date(progress.completedAt).toLocaleDateString() : 'N/A'}
                            </p>
                        </div>
                    </>
                ) : (
                    <>
                        <Clock className="w-6 h-6 text-amber-600" />
                        <div>
                            <p className="font-semibold text-slate-900">In Progress</p>
                            <p className="text-sm text-slate-600">
                                Last activity: {progress.lastActivityAt ? new Date(progress.lastActivityAt).toLocaleDateString() : 'N/A'}
                            </p>
                        </div>
                    </>
                )}
            </div>

            {/* Grading Scale Reference */}
            <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl shadow-sm p-6 border border-slate-200">
                <h4 className="font-semibold text-slate-900 mb-4">📊 Grading Scale Reference</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-2">
                    <div className="p-3 bg-green-100 rounded-lg border border-green-300 text-center">
                        <p className="font-bold text-green-700 text-lg">A+</p>
                        <p className="text-xs text-green-600 font-semibold">85+</p>
                    </div>
                    <div className="p-3 bg-emerald-100 rounded-lg border border-emerald-300 text-center">
                        <p className="font-bold text-emerald-700 text-lg">A</p>
                        <p className="text-xs text-emerald-600 font-semibold">75-84</p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-lg border border-blue-300 text-center">
                        <p className="font-bold text-blue-700 text-lg">A-</p>
                        <p className="text-xs text-blue-600 font-semibold">70-74</p>
                    </div>
                    <div className="p-3 bg-cyan-100 rounded-lg border border-cyan-300 text-center">
                        <p className="font-bold text-cyan-700 text-lg">B+</p>
                        <p className="text-xs text-cyan-600 font-semibold">65-69</p>
                    </div>
                    <div className="p-3 bg-indigo-100 rounded-lg border border-indigo-300 text-center">
                        <p className="font-bold text-indigo-700 text-lg">B</p>
                        <p className="text-xs text-indigo-600 font-semibold">60-64</p>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-lg border border-purple-300 text-center">
                        <p className="font-bold text-purple-700 text-lg">B-</p>
                        <p className="text-xs text-purple-600 font-semibold">55-59</p>
                    </div>
                    <div className="p-3 bg-yellow-100 rounded-lg border border-yellow-300 text-center">
                        <p className="font-bold text-yellow-700 text-lg">C+</p>
                        <p className="text-xs text-yellow-600 font-semibold">50-54</p>
                    </div>
                    <div className="p-3 bg-amber-100 rounded-lg border border-amber-300 text-center">
                        <p className="font-bold text-amber-700 text-lg">C</p>
                        <p className="text-xs text-amber-600 font-semibold">46-49</p>
                    </div>
                    <div className="p-3 bg-orange-100 rounded-lg border border-orange-300 text-center">
                        <p className="font-bold text-orange-700 text-lg">C-</p>
                        <p className="text-xs text-orange-600 font-semibold">40-45</p>
                    </div>
                    <div className="p-3 bg-orange-200 rounded-lg border border-orange-400 text-center">
                        <p className="font-bold text-orange-800 text-lg">S</p>
                        <p className="text-xs text-orange-700 font-semibold">35-39</p>
                    </div>
                    <div className="p-3 bg-red-100 rounded-lg border border-red-300 text-center lg:col-span-2">
                        <p className="font-bold text-red-700 text-lg">F</p>
                        <p className="text-xs text-red-600 font-semibold">Below 35</p>
                    </div>
                </div>
            </div>

            {/* Performance Indicators */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
                <h4 className="font-semibold text-slate-900 mb-4">Detailed Performance Summary</h4>
                <div className="space-y-3">
                    {/* Chapters Section */}
                    <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-slate-700 font-medium">📚 Chapters Completed</span>
                            <span className="font-bold text-green-600">{completedChapters.length}/{progress.totalChapters}</span>
                        </div>
                        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-gradient-to-r from-green-500 to-emerald-600" 
                                style={{ width: `${(completedChapters.length / progress.totalChapters) * 100 || 0}%` }}
                            ></div>
                        </div>
                    </div>

                    {/* Quiz Attempts Section */}
                    <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-slate-700 font-medium">🎯 Quiz Attempts</span>
                            <span className="font-bold text-purple-600">{quizScoresArray.length} Attempted</span>
                        </div>
                        {quizScoresArray.length > 0 && (
                            <>
                                <div className="text-sm text-slate-600 mb-2">Average Score: <span className="font-semibold text-purple-600">{avgQuizScore}%</span></div>
                                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-gradient-to-r from-purple-500 to-blue-600" 
                                        style={{ width: `${avgQuizScore}%` }}
                                    ></div>
                                </div>
                                {/* Individual Quiz Scores */}
                                <div className="mt-3 space-y-2">
                                    {Object.entries(quizScores).map(([key, score]) => (
                                        <div key={key} className="flex justify-between items-center text-xs bg-white p-2 rounded">
                                            <span className="text-slate-600 font-medium capitalize">{key.replace(/_/g, ' ')}</span>
                                            <span className={`font-bold px-2 py-1 rounded ${
                                                score >= 80 ? 'bg-green-100 text-green-700' :
                                                score >= 60 ? 'bg-blue-100 text-blue-700' :
                                                'bg-orange-100 text-orange-700'
                                            }`}>{score}%</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                        {quizScoresArray.length === 0 && (
                            <p className="text-sm text-slate-500">No quizzes attempted yet</p>
                        )}
                    </div>

                    {/* Assignments Section */}
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-slate-700 font-medium">📝 Assignments Submitted</span>
                            <span className="font-bold text-blue-600">{assignmentScoresArray.length} Submitted</span>
                        </div>
                        {assignmentScoresArray.length > 0 && (
                            <>
                                <div className="text-sm text-slate-600 mb-2">Average Score: <span className="font-semibold text-blue-600">{avgAssignmentScore}%</span></div>
                                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-600" 
                                        style={{ width: `${avgAssignmentScore}%` }}
                                    ></div>
                                </div>
                            </>
                        )}
                        {assignmentScoresArray.length === 0 && (
                            <p className="text-sm text-slate-500">No assignments submitted yet</p>
                        )}
                    </div>

                    {/* Overall Grade Section */}
                    <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-slate-700 font-medium">🏆 Overall Course Grade</span>
                            <span className={`font-bold text-lg ${getGradeColor(progress.finalScore)}`}>
                                {progress.finalScore}% ({getGradeLabel(progress.finalScore)})
                            </span>
                        </div>
                        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-gradient-to-r from-amber-500 to-orange-600" 
                                style={{ width: `${progress.finalScore}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                {/* Summary Stats */}
                <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <h5 className="font-semibold text-slate-900 mb-3">Quick Stats</h5>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="text-center p-3 bg-white rounded-lg">
                            <p className="text-2xl font-bold text-slate-900">{completedChapters.length}</p>
                            <p className="text-xs text-slate-600 mt-1">Chapters Done</p>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg">
                            <p className="text-2xl font-bold text-slate-900">{progress.totalChapters - completedChapters.length}</p>
                            <p className="text-xs text-slate-600 mt-1">To Complete</p>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg">
                            <p className="text-2xl font-bold text-slate-900">{quizScoresArray.length}</p>
                            <p className="text-xs text-slate-600 mt-1">Quizzes</p>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg">
                            <p className="text-2xl font-bold text-slate-900">{assignmentScoresArray.length}</p>
                            <p className="text-xs text-slate-600 mt-1">Assignments</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ProgressTracker
