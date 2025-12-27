"use client"
import React, { useEffect, useState, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import axios from 'axios'
import { TrendingUp, BookOpen, CheckCircle2, Target, Zap, Award, RefreshCw } from 'lucide-react'
import { getGradeLabel, GRADING_SCALE } from '@/lib/gradingSystem'

function ProgressPage() {
    const { user } = useUser()
    const [courses, setCourses] = useState([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [stats, setStats] = useState({
        totalCourses: 0,
        completedCourses: 0,
        inProgressCourses: 0,
        averageGrade: 0,
        totalProgressPercentage: 0,
        totalAssignmentsSubmitted: 0,
        totalQuizzesTaken: 0
    })

    const fetchCourses = useCallback(async (isRefresh = false) => {
        if (!user?.primaryEmailAddress?.emailAddress) return
        
        try {
            if (isRefresh) setRefreshing(true)
            const result = await axios.post('/api/courses', {
                createdBy: user.primaryEmailAddress.emailAddress
            })
            const courseList = result.data.result || []
            setCourses(courseList)
            await calculateStats(courseList)
        } catch (err) {
            console.error('Error fetching courses:', err)
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [user?.primaryEmailAddress?.emailAddress])

    // Initial load
    useEffect(() => {
        if (user) {
            fetchCourses()
        }
    }, [user, fetchCourses])

    // Refetch on visibility change (when user returns to tab)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && user) {
                fetchCourses(true)
            }
        }
        document.addEventListener('visibilitychange', handleVisibilityChange)
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
    }, [user, fetchCourses])

    const calculateStats = async (courseList) => {
        try {
            let totalGrade = 0
            let totalProgress = 0
            let completedCount = 0
            let inProgressCount = 0
            let totalAssignments = 0
            let totalQuizzes = 0

            for (const course of courseList) {
                try {
                    const progressRes = await axios.get(
                        `/api/student-progress?courseId=${course.courseId}&studentEmail=${user?.primaryEmailAddress?.emailAddress}`
                    )
                    const progress = progressRes.data.result
                    
                    if (progress) {
                        totalGrade += progress.finalScore || 0
                        totalProgress += progress.progressPercentage || 0
                        
                        if (progress.status === 'Completed') {
                            completedCount++
                        } else {
                            inProgressCount++
                        }

                        const quizScores = typeof progress.quizScores === 'string' 
                            ? JSON.parse(progress.quizScores || '{}') 
                            : (progress.quizScores || {})
                        const assignmentScores = typeof progress.assignmentScores === 'string' 
                            ? JSON.parse(progress.assignmentScores || '{}') 
                            : (progress.assignmentScores || {})

                        totalQuizzes += Object.keys(quizScores).length
                        totalAssignments += Object.keys(assignmentScores).length
                    }
                } catch (err) {
                    console.error('Error fetching progress for course:', course.courseId, err)
                }
            }

            const avgGrade = courseList.length > 0 ? Math.round(totalGrade / courseList.length) : 0
            const avgProgress = courseList.length > 0 ? Math.round(totalProgress / courseList.length) : 0

            setStats({
                totalCourses: courseList.length,
                completedCourses: completedCount,
                inProgressCourses: inProgressCount,
                averageGrade: avgGrade,
                totalProgressPercentage: avgProgress,
                totalAssignmentsSubmitted: totalAssignments,
                totalQuizzesTaken: totalQuizzes
            })
        } catch (err) {
            console.error('Error calculating stats:', err)
        }
    }

    if (loading) {
        return (
            <div className="p-8">
                <div className="space-y-4 animate-pulse">
                    <div className="h-10 bg-slate-200 rounded-lg w-40"></div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="h-32 bg-slate-200 rounded-lg"></div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="p-8">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-bold text-slate-900 mb-2">Learning Progress</h1>
                    <p className="text-slate-600">Track your learning journey and performance across all courses</p>
                </div>
                <button 
                    onClick={() => fetchCourses(true)}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition"
                >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Total Courses */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-6 hover:shadow-lg transition">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-medium text-slate-700">Total Courses</h3>
                        <BookOpen className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="text-3xl font-bold text-blue-600">{stats.totalCourses}</div>
                    <p className="text-xs text-slate-600 mt-1">Courses enrolled</p>
                </div>

                {/* Completed Courses */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-6 hover:shadow-lg transition">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-medium text-slate-700">Completed</h3>
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="text-3xl font-bold text-green-600">{stats.completedCourses}</div>
                    <p className="text-xs text-slate-600 mt-1">Courses completed</p>
                </div>

                {/* In Progress */}
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-xl p-6 hover:shadow-lg transition">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-medium text-slate-700">In Progress</h3>
                        <Target className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="text-3xl font-bold text-orange-600">{stats.inProgressCourses}</div>
                    <p className="text-xs text-slate-600 mt-1">Currently learning</p>
                </div>

                {/* Average Grade */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-6 hover:shadow-lg transition">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-medium text-slate-700">Avg Grade</h3>
                        <Award className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="text-3xl font-bold text-purple-600">{stats.averageGrade}%</div>
                    <p className="text-xs text-slate-600 mt-1">Overall performance</p>
                </div>
            </div>

            {/* Additional Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Average Progress */}
                <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 border border-cyan-200 rounded-xl p-6 hover:shadow-lg transition">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-medium text-slate-700">Avg Progress</h3>
                        <TrendingUp className="w-5 h-5 text-cyan-600" />
                    </div>
                    <div className="text-3xl font-bold text-cyan-600">{stats.totalProgressPercentage}%</div>
                    <p className="text-xs text-slate-600 mt-1">Completion rate</p>
                </div>

                {/* Quizzes Taken */}
                <div className="bg-gradient-to-br from-pink-50 to-pink-100 border border-pink-200 rounded-xl p-6 hover:shadow-lg transition">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-medium text-slate-700">Quizzes</h3>
                        <Zap className="w-5 h-5 text-pink-600" />
                    </div>
                    <div className="text-3xl font-bold text-pink-600">{stats.totalQuizzesTaken}</div>
                    <p className="text-xs text-slate-600 mt-1">Quizzes attempted</p>
                </div>

                {/* Assignments Submitted */}
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 rounded-xl p-6 hover:shadow-lg transition">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-medium text-slate-700">Assignments</h3>
                        <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="text-3xl font-bold text-indigo-600">{stats.totalAssignmentsSubmitted}</div>
                    <p className="text-xs text-slate-600 mt-1">Submitted</p>
                </div>
            </div>

            {/* Grading Scale Reference */}
            <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl shadow-sm p-6 border border-slate-200 mb-8">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">📊 Grading Scale Reference</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-2">
                    {GRADING_SCALE.map((gradeEntry) => (
                        <div key={gradeEntry.grade} className={`p-3 ${gradeEntry.bgColor} rounded-lg border ${gradeEntry.borderColor} text-center`}>
                            <p className={`font-bold text-lg ${gradeEntry.color}`}>{gradeEntry.grade}</p>
                            <p className={`text-xs font-semibold ${gradeEntry.color}`}>
                                {gradeEntry.min}-{gradeEntry.max}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Courses Breakdown */}
            {courses.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">Courses Overview</h2>
                    <div className="space-y-4">
                        {courses.map((course) => (
                            <div key={course.courseId} className="p-4 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition">
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <h3 className="font-semibold text-slate-900">{course.topic}</h3>
                                        <p className="text-sm text-slate-600">{course.courseType} • {course.difficultyLevel}</p>
                                    </div>
                                    <span className={`text-xs font-bold px-2 py-1 rounded ${
                                        course.status === 'Ready' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                    }`}>
                                        {course.status === 'Ready' ? '✓ Ready' : '⏳ Generating'}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500">
                                    Created: {new Date(course.createdAt || Date.now()).toLocaleDateString()}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {courses.length === 0 && (
                <div className="bg-white rounded-xl border border-slate-200 text-center py-16">
                    <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">No Courses Yet</h3>
                    <p className="text-slate-600 mb-6">Start by creating your first course to track your progress</p>
                </div>
            )}
        </div>
    )
}

export default ProgressPage
