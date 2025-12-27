"use client"
import React, { useState, useEffect } from 'react'
import { useAdminAuth } from '@/app/_context/AdminAuthContext'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { 
    BarChart3,
    AlertCircle,
    Loader2,
    RefreshCw,
    Users,
    BookOpen,
    FileText,
    TrendingUp,
    Calendar
} from 'lucide-react'
import { toast } from 'sonner'
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts'

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe', '#00C49F']

function AnalyticsPage() {
    const { admin, loading: authLoading } = useAdminAuth()
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [days, setDays] = useState(30)

    useEffect(() => {
        if (!authLoading && admin) {
            fetchAnalytics()
        }
    }, [authLoading, admin, days])

    const fetchAnalytics = async () => {
        try {
            setLoading(true)
            const response = await axios.get(`/api/admin/analytics?days=${days}`)
            setData(response.data)
        } catch (error) {
            console.error('Error fetching analytics:', error)
            toast.error('Failed to load analytics')
        } finally {
            setLoading(false)
        }
    }

    const formatDate = (dateStr) => {
        const date = new Date(dateStr)
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/10 rounded-xl">
                        <BarChart3 className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Analytics Dashboard</h1>
                        <p className="text-gray-500">Platform performance and insights</p>
                    </div>
                </div>
                <div className="flex gap-2 items-center">
                    <select
                        value={days}
                        onChange={(e) => setDays(parseInt(e.target.value))}
                        className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                    >
                        <option value={7}>Last 7 days</option>
                        <option value={30}>Last 30 days</option>
                        <option value={90}>Last 90 days</option>
                        <option value={365}>Last year</option>
                    </select>
                    <Button onClick={fetchAnalytics} disabled={loading} variant="outline">
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : data ? (
                <>
                    {/* Overview Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                        <StatCard
                            title="Total Users"
                            value={data.overview.totalUsers}
                            icon={<Users className="w-6 h-6" />}
                            color="blue"
                        />
                        <StatCard
                            title="Total Courses"
                            value={data.overview.totalCourses}
                            icon={<BookOpen className="w-6 h-6" />}
                            color="green"
                        />
                        <StatCard
                            title="Total Submissions"
                            value={data.overview.totalSubmissions}
                            icon={<FileText className="w-6 h-6" />}
                            color="purple"
                        />
                        <StatCard
                            title="Avg Score"
                            value={`${data.overview.avgScore}%`}
                            icon={<TrendingUp className="w-6 h-6" />}
                            color="orange"
                        />
                    </div>

                    {/* Trend Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        {/* User Signups Trend */}
                        <div className="bg-white rounded-xl border p-6">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Users className="w-5 h-5 text-blue-500" />
                                User Signups
                            </h3>
                            <ResponsiveContainer width="100%" height={250}>
                                <AreaChart data={data.trends.userSignups.map(d => ({...d, date: formatDate(d.date)}))}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" fontSize={12} />
                                    <YAxis fontSize={12} />
                                    <Tooltip />
                                    <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="#93c5fd" name="New Users" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Course Creations Trend */}
                        <div className="bg-white rounded-xl border p-6">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-green-500" />
                                Course Creations
                            </h3>
                            <ResponsiveContainer width="100%" height={250}>
                                <AreaChart data={data.trends.courseCreations.map(d => ({...d, date: formatDate(d.date)}))}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" fontSize={12} />
                                    <YAxis fontSize={12} />
                                    <Tooltip />
                                    <Area type="monotone" dataKey="count" stroke="#22c55e" fill="#86efac" name="Courses" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Distribution Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                        {/* Score Distribution */}
                        <div className="bg-white rounded-xl border p-6">
                            <h3 className="text-lg font-semibold mb-4">Score Distribution</h3>
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie
                                        data={data.distributions.scoreDistribution}
                                        dataKey="count"
                                        nameKey="range"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={80}
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                        labelLine={false}
                                    >
                                        {data.distributions.scoreDistribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Completion Status */}
                        <div className="bg-white rounded-xl border p-6">
                            <h3 className="text-lg font-semibold mb-4">Course Completion</h3>
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie
                                        data={data.distributions.completionStats}
                                        dataKey="count"
                                        nameKey="status"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={80}
                                        label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                                    >
                                        {data.distributions.completionStats.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Course Types */}
                        <div className="bg-white rounded-xl border p-6">
                            <h3 className="text-lg font-semibold mb-4">Course Types</h3>
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={data.distributions.courseTypes} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" fontSize={12} />
                                    <YAxis dataKey="type" type="category" fontSize={11} width={80} />
                                    <Tooltip />
                                    <Bar dataKey="count" fill="#8884d8" name="Courses" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Submission Trends & Grading Stats */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        {/* Submissions Over Time */}
                        <div className="bg-white rounded-xl border p-6">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-purple-500" />
                                Assignment Submissions
                            </h3>
                            <ResponsiveContainer width="100%" height={250}>
                                <LineChart data={data.trends.submissionTrends.map(d => ({...d, date: formatDate(d.date)}))}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" fontSize={12} />
                                    <YAxis fontSize={12} />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="count" stroke="#a855f7" strokeWidth={2} name="Submissions" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Grading Method Comparison */}
                        <div className="bg-white rounded-xl border p-6">
                            <h3 className="text-lg font-semibold mb-4">AI vs Manual Grading</h3>
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={data.distributions.gradingStats}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="gradedBy" fontSize={12} />
                                    <YAxis fontSize={12} />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="avgScore" fill="#22c55e" name="Avg Score" />
                                    <Bar dataKey="count" fill="#3b82f6" name="Count" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Top Courses */}
                    <div className="bg-white rounded-xl border p-6">
                        <h3 className="text-lg font-semibold mb-4">Top Courses by Enrollment</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Course</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Students</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {data.topCourses.map((course, index) => (
                                        <tr key={index} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-sm font-medium">#{index + 1}</td>
                                            <td className="px-4 py-3 text-sm">{course.topic}</td>
                                            <td className="px-4 py-3 text-sm">{course.students || 0}</td>
                                            <td className="px-4 py-3 text-sm">
                                                {course.rating ? `${course.rating} ⭐` : 'N/A'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                <div className="text-center py-20">
                    <BarChart3 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">No analytics data available</p>
                </div>
            )}
        </div>
    )
}

function StatCard({ title, value, icon, color }) {
    const colors = {
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-green-50 text-green-600',
        purple: 'bg-purple-50 text-purple-600',
        orange: 'bg-orange-50 text-orange-600'
    }

    return (
        <div className="bg-white rounded-xl border p-5">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-500">{title}</p>
                    <p className="text-2xl font-bold mt-1">{value}</p>
                </div>
                <div className={`p-3 rounded-lg ${colors[color]}`}>
                    {icon}
                </div>
            </div>
        </div>
    )
}

export default AnalyticsPage
