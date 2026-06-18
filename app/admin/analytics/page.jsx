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
import { AdminPageShell, AdminPageHeader, AdminSurface } from '@/components/admin/AdminPageShell'

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
        <AdminPageShell>
            <AdminPageHeader
                title="Analytics Dashboard"
                description="Platform performance and insights"
                icon={BarChart3}
                actions={
                    <div className="flex gap-2 items-center">
                        <select
                            value={days}
                            onChange={(e) => setDays(parseInt(e.target.value))}
                            className="px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg focus:ring-2 focus:ring-primary text-gray-900 dark:text-white text-sm"
                        >
                            <option value={7}>Last 7 days</option>
                            <option value={30}>Last 30 days</option>
                            <option value={90}>Last 90 days</option>
                            <option value={365}>Last year</option>
                        </select>
                        <Button onClick={fetchAnalytics} disabled={loading} variant="outline" className="border-gray-200 dark:border-gray-750">
                            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                    </div>
                }
            />

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
                        <AdminSurface className="p-6">
                            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <Users className="w-5 h-5 text-blue-500" />
                                User Signups
                            </h3>
                            <ResponsiveContainer width="100%" height={250}>
                                <AreaChart data={data.trends.userSignups.map(d => ({...d, date: formatDate(d.date)}))}>
                                    <defs>
                                        <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" className="dark:hidden" />
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" className="hidden dark:block" />
                                    <XAxis dataKey="date" fontSize={11} stroke="#9ca3af" tickLine={false} />
                                    <YAxis fontSize={11} stroke="#9ca3af" tickLine={false} />
                                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }} />
                                    <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2.5} fill="url(#colorUsers)" name="New Users" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </AdminSurface>

                        {/* Course Creations Trend */}
                        <AdminSurface className="p-6">
                            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-emerald-500" />
                                Course Creations
                            </h3>
                            <ResponsiveContainer width="100%" height={250}>
                                <AreaChart data={data.trends.courseCreations.map(d => ({...d, date: formatDate(d.date)}))}>
                                    <defs>
                                        <linearGradient id="colorCourses" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" className="dark:hidden" />
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" className="hidden dark:block" />
                                    <XAxis dataKey="date" fontSize={11} stroke="#9ca3af" tickLine={false} />
                                    <YAxis fontSize={11} stroke="#9ca3af" tickLine={false} />
                                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }} />
                                    <Area type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2.5} fill="url(#colorCourses)" name="Courses" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </AdminSurface>
                    </div>

                    {/* Distribution Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                        {/* Score Distribution */}
                        <AdminSurface className="p-6">
                            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">Score Distribution</h3>
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie
                                        data={data.distributions.scoreDistribution}
                                        dataKey="count"
                                        nameKey="range"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={75}
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                        labelLine={false}
                                    >
                                        {data.distributions.scoreDistribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </AdminSurface>

                        {/* Completion Status */}
                        <AdminSurface className="p-6">
                            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">Course Completion</h3>
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie
                                        data={data.distributions.completionStats}
                                        dataKey="count"
                                        nameKey="status"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={75}
                                        label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                                    >
                                        {data.distributions.completionStats.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }} />
                                    <Legend wrapperStyle={{ fontSize: '11px', color: '#9ca3af' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </AdminSurface>

                        {/* Course Types */}
                        <AdminSurface className="p-6">
                            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">Course Types</h3>
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={data.distributions.courseTypes} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" className="dark:hidden" />
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" className="hidden dark:block" />
                                    <XAxis type="number" fontSize={11} stroke="#9ca3af" tickLine={false} />
                                    <YAxis dataKey="type" type="category" fontSize={10} stroke="#9ca3af" tickLine={false} width={80} />
                                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }} />
                                    <Bar dataKey="count" fill="#8884d8" radius={[0, 6, 6, 0]} name="Courses" />
                                </BarChart>
                            </ResponsiveContainer>
                        </AdminSurface>
                    </div>

                    {/* Submission Trends & Grading Stats */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        {/* Submissions Over Time */}
                        <AdminSurface className="p-6">
                            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-purple-500" />
                                Assignment Submissions
                            </h3>
                            <ResponsiveContainer width="100%" height={250}>
                                <LineChart data={data.trends.submissionTrends.map(d => ({...d, date: formatDate(d.date)}))}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" className="dark:hidden" />
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" className="hidden dark:block" />
                                    <XAxis dataKey="date" fontSize={11} stroke="#9ca3af" tickLine={false} />
                                    <YAxis fontSize={11} stroke="#9ca3af" tickLine={false} />
                                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }} />
                                    <Line type="monotone" dataKey="count" stroke="#a855f7" strokeWidth={2.5} dot={{ r: 3.5, stroke: '#a855f7', strokeWidth: 1.5, fill: '#fff' }} activeDot={{ r: 5 }} name="Submissions" />
                                </LineChart>
                            </ResponsiveContainer>
                        </AdminSurface>

                        {/* Grading Method Comparison */}
                        <AdminSurface className="p-6">
                            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">AI vs Manual Grading</h3>
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={data.distributions.gradingStats}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" className="dark:hidden" />
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" className="hidden dark:block" />
                                    <XAxis dataKey="gradedBy" fontSize={11} stroke="#9ca3af" tickLine={false} />
                                    <YAxis fontSize={11} stroke="#9ca3af" tickLine={false} />
                                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }} />
                                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                                    <Bar dataKey="avgScore" fill="#10b981" radius={[4, 4, 0, 0]} name="Avg Score" />
                                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Count" />
                                </BarChart>
                            </ResponsiveContainer>
                        </AdminSurface>
                    </div>

                    {/* Top Courses */}
                    <AdminSurface className="p-6 overflow-hidden">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">Top Courses by Enrollment</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Rank</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Course</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Students</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Rating</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                                    {data.topCourses.map((course, index) => (
                                        <tr key={index} className="hover:bg-gray-50/70 dark:hover:bg-gray-700/30 transition-colors duration-150">
                                            <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">#{index + 1}</td>
                                            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{course.topic}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{course.students || 0}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                                                {course.rating ? `${course.rating} ⭐` : 'N/A'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </AdminSurface>
                </>
            ) : (
                <div className="text-center py-20">
                    <BarChart3 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">No analytics data available</p>
                </div>
            )}
        </AdminPageShell>
    )
}

function StatCard({ title, value, icon, color = 'blue' }) {
    const colors = {
        blue: {
            bg: 'bg-blue-50/70 dark:bg-blue-950/20 border-blue-100/60 dark:border-blue-900/30',
            iconBg: 'bg-blue-100 dark:bg-blue-900/40',
            iconText: 'text-blue-600 dark:text-blue-400',
            glow: 'shadow-blue-500/5 dark:shadow-blue-500/10'
        },
        green: {
            bg: 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-100/60 dark:border-emerald-900/30',
            iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
            iconText: 'text-emerald-600 dark:text-emerald-400',
            glow: 'shadow-emerald-500/5 dark:shadow-emerald-500/10'
        },
        purple: {
            bg: 'bg-purple-50/70 dark:bg-purple-950/20 border-purple-100/60 dark:border-purple-900/30',
            iconBg: 'bg-purple-100 dark:bg-purple-900/40',
            iconText: 'text-purple-600 dark:text-purple-400',
            glow: 'shadow-purple-500/5 dark:shadow-purple-500/10'
        },
        orange: {
            bg: 'bg-orange-50/70 dark:bg-orange-950/20 border-orange-100/60 dark:border-orange-900/30',
            iconBg: 'bg-orange-100 dark:bg-orange-900/40',
            iconText: 'text-orange-600 dark:text-orange-400',
            glow: 'shadow-orange-500/5 dark:shadow-orange-500/10'
        }
    }

    const style = colors[color] || colors.blue

    return (
        <div className={`relative overflow-hidden bg-white/95 dark:bg-gray-800/90 border border-gray-150 dark:border-gray-700/50 rounded-2xl p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${style.glow}`}>
            {/* Corner light blur spot */}
            <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full filter blur-xl opacity-10 bg-current" style={{ color: style.iconText.includes('text-blue') ? '#3b82f6' : style.iconText.includes('text-emerald') ? '#10b981' : style.iconText.includes('text-purple') ? '#8b5cf6' : '#f97316' }} />
            <div className="flex items-center justify-between relative z-10">
                <div className="space-y-1">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{title}</p>
                    <p className="text-2xl font-extrabold text-gray-900 dark:text-white mt-1 tracking-tight">{value}</p>
                </div>
                <div className={`p-3.5 rounded-2xl ${style.iconBg} border border-black/5 dark:border-white/5`}>
                    <div className={style.iconText}>{icon}</div>
                </div>
            </div>
        </div>
    )
}

export default AnalyticsPage
