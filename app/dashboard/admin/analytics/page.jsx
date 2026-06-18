"use client"
import React, { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
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

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6']

function AnalyticsPage() {
    const { user, isLoaded } = useUser()
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [days, setDays] = useState(30)

    const userEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase()
    const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
    const isAdmin = userEmail && adminEmails.includes(userEmail)

    useEffect(() => {
        if (isLoaded && isAdmin) {
            fetchAnalytics()
        }
    }, [isLoaded, isAdmin, days])

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

    if (!isLoaded) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!isAdmin) {
        return (
            <div className="p-10 text-center">
                <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
                <h1 className="text-2xl font-bold text-gray-800">Access Denied</h1>
                <p className="text-gray-600 mt-2">You don't have permission to access this page.</p>
            </div>
        )
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="relative overflow-hidden backdrop-blur-md bg-white/70 border border-slate-200/50 shadow-sm rounded-2xl p-6 mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="absolute -right-20 -top-20 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -left-20 -bottom-20 w-48 h-48 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="flex items-center gap-4 relative z-10">
                    <div className="p-3.5 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl text-white shadow-lg shadow-indigo-500/20">
                        <BarChart3 className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Analytics Dashboard</h1>
                        <p className="text-slate-500 text-sm mt-0.5">Platform performance metrics and insights</p>
                    </div>
                </div>
                <div className="flex gap-3 items-center relative z-10">
                    <select
                        value={days}
                        onChange={(e) => setDays(parseInt(e.target.value))}
                        className="px-4 py-2.5 bg-white/80 border border-slate-200/60 rounded-xl text-slate-700 font-medium text-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500/20 transition-all outline-none"
                    >
                        <option value={7}>Last 7 days</option>
                        <option value={30}>Last 30 days</option>
                        <option value={90}>Last 90 days</option>
                        <option value={365}>Last year</option>
                    </select>
                    <button 
                        onClick={fetchAnalytics} 
                        disabled={loading}
                        className="flex items-center justify-center px-4 py-2.5 bg-white/80 border border-slate-200/60 rounded-xl text-slate-700 font-medium text-sm hover:bg-slate-50 active:scale-[0.98] transition-all duration-200 disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
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
                        <div className="backdrop-blur-md bg-white/70 border border-slate-200/50 shadow-sm rounded-2xl p-6">
                            <h3 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <Users className="w-5 h-5 text-indigo-500" />
                                User Signups
                            </h3>
                            <ResponsiveContainer width="100%" height={250}>
                                <AreaChart data={data.trends.userSignups.map(d => ({...d, date: formatDate(d.date)}))}>
                                    <defs>
                                        <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0.01}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="date" fontSize={11} stroke="#94a3b8" />
                                    <YAxis fontSize={11} stroke="#94a3b8" />
                                    <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.9)', borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                                    <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorUsers)" name="New Users" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Course Creations Trend */}
                        <div className="backdrop-blur-md bg-white/70 border border-slate-200/50 shadow-sm rounded-2xl p-6">
                            <h3 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-emerald-500" />
                                Course Creations
                            </h3>
                            <ResponsiveContainer width="100%" height={250}>
                                <AreaChart data={data.trends.courseCreations.map(d => ({...d, date: formatDate(d.date)}))}>
                                    <defs>
                                        <linearGradient id="colorCourses" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.01}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="date" fontSize={11} stroke="#94a3b8" />
                                    <YAxis fontSize={11} stroke="#94a3b8" />
                                    <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.9)', borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                                    <Area type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCourses)" name="Courses" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Distribution Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                        {/* Score Distribution */}
                        <div className="backdrop-blur-md bg-white/70 border border-slate-200/50 shadow-sm rounded-2xl p-6">
                            <h3 className="text-base font-bold text-slate-800 mb-6">Score Distribution</h3>
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie
                                        data={data.distributions.scoreDistribution}
                                        dataKey="count"
                                        nameKey="range"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={80}
                                        paddingAngle={4}
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                        labelLine={false}
                                    >
                                        {data.distributions.scoreDistribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.9)', borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Completion Status */}
                        <div className="backdrop-blur-md bg-white/70 border border-slate-200/50 shadow-sm rounded-2xl p-6">
                            <h3 className="text-base font-bold text-slate-800 mb-6">Course Completion</h3>
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie
                                        data={data.distributions.completionStats}
                                        dataKey="count"
                                        nameKey="status"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={80}
                                        paddingAngle={4}
                                        label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                                    >
                                        {data.distributions.completionStats.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.9)', borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Course Types */}
                        <div className="backdrop-blur-md bg-white/70 border border-slate-200/50 shadow-sm rounded-2xl p-6">
                            <h3 className="text-base font-bold text-slate-800 mb-6">Course Types</h3>
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={data.distributions.courseTypes} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis type="number" fontSize={11} stroke="#94a3b8" />
                                    <YAxis dataKey="type" type="category" fontSize={11} stroke="#94a3b8" width={80} />
                                    <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.9)', borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                                    <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Courses" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Submission Trends & Grading Stats */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        {/* Submissions Over Time */}
                        <div className="backdrop-blur-md bg-white/70 border border-slate-200/50 shadow-sm rounded-2xl p-6">
                            <h3 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-violet-500" />
                                Assignment Submissions
                            </h3>
                            <ResponsiveContainer width="100%" height={250}>
                                <LineChart data={data.trends.submissionTrends.map(d => ({...d, date: formatDate(d.date)}))}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="date" fontSize={11} stroke="#94a3b8" />
                                    <YAxis fontSize={11} stroke="#94a3b8" />
                                    <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.9)', borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                                    <Line type="monotone" dataKey="count" stroke="#a855f7" strokeWidth={3} dot={{ strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} name="Submissions" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Grading Method Comparison */}
                        <div className="backdrop-blur-md bg-white/70 border border-slate-200/50 shadow-sm rounded-2xl p-6">
                            <h3 className="text-base font-bold text-slate-800 mb-6">AI vs Manual Grading</h3>
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={data.distributions.gradingStats}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="gradedBy" fontSize={11} stroke="#94a3b8" />
                                    <YAxis fontSize={11} stroke="#94a3b8" />
                                    <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.9)', borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                                    <Legend iconType="circle" />
                                    <Bar dataKey="avgScore" fill="#10b981" radius={[4, 4, 0, 0]} name="Avg Score" />
                                    <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} name="Count" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Top Courses */}
                    <div className="backdrop-blur-md bg-white/70 border border-slate-200/50 shadow-sm rounded-2xl p-6 overflow-hidden">
                        <h3 className="text-base font-bold text-slate-800 mb-5">Top Courses by Enrollment</h3>
                        <div className="overflow-x-auto -mx-6">
                            <div className="inline-block min-w-full align-middle px-6">
                                <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                                    <table className="min-w-full divide-y divide-slate-100">
                                        <thead className="bg-slate-50/70">
                                            <tr>
                                                <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Rank</th>
                                                <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Course</th>
                                                <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Students</th>
                                                <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Rating</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-slate-100">
                                            {data.topCourses.map((course, index) => (
                                                <tr key={index} className="hover:bg-slate-50/60 transition-colors duration-150">
                                                    <td className="px-5 py-4 whitespace-nowrap text-sm font-semibold text-slate-500">
                                                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${
                                                            index === 0 ? 'bg-amber-100 text-amber-700 font-bold' :
                                                            index === 1 ? 'bg-slate-100 text-slate-700 font-bold' :
                                                            index === 2 ? 'bg-orange-100 text-orange-700 font-bold' : 'bg-slate-50 text-slate-500'
                                                        }`}>
                                                            {index + 1}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-4 text-sm font-bold text-slate-800">{course.topic}</td>
                                                    <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-600 font-semibold">{course.students || 0}</td>
                                                    <td className="px-5 py-4 whitespace-nowrap text-sm">
                                                        {course.rating ? (
                                                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-600 border border-amber-200/50 px-2 py-0.5 rounded text-xs font-bold">
                                                                ⭐ {course.rating.toFixed(1)}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-400 text-xs">N/A</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div className="backdrop-blur-md bg-white/70 border border-slate-200/50 shadow-sm rounded-2xl p-10 text-center py-20">
                    <BarChart3 className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                    <h3 className="font-semibold text-slate-700 text-lg">No analytics data available</h3>
                    <p className="text-slate-500 text-sm mt-1">Check back later once user transactions and activities are processed.</p>
                </div>
            )}
        </div>
    )
}

function StatCard({ title, value, icon, color }) {
    const colors = {
        blue: 'from-blue-500/10 to-indigo-500/10 text-indigo-600 border-indigo-200/50',
        green: 'from-emerald-500/10 to-teal-500/10 text-emerald-600 border-emerald-200/50',
        purple: 'from-violet-500/10 to-fuchsia-500/10 text-violet-600 border-violet-200/50',
        orange: 'from-amber-500/10 to-orange-500/10 text-amber-600 border-amber-200/50'
    }

    return (
        <div className="backdrop-blur-md bg-white/70 border border-slate-200/50 shadow-sm rounded-2xl p-5 hover:shadow-md hover:border-indigo-500/20 transition-all duration-300 hover:translate-y-[-2px] relative overflow-hidden group">
            <div className="absolute -right-10 -top-10 w-24 h-24 bg-gradient-to-br from-indigo-500/5 to-violet-500/5 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-all duration-300" />
            <div className="flex items-center justify-between relative z-10">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{title}</p>
                    <p className="text-2xl font-extrabold mt-1.5 text-slate-800 tracking-tight">{value}</p>
                </div>
                <div className={`p-3.5 rounded-xl bg-gradient-to-br border ${colors[color] || colors.blue} shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                    {icon}
                </div>
            </div>
        </div>
    )
}

export default AnalyticsPage
