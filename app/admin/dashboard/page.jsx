"use client"
import React, { useState, useEffect } from 'react'
import { useAdminAuth } from '@/app/_context/AdminAuthContext'
import axios from 'axios'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { 
    Users, 
    BookOpen, 
    DollarSign,
    Activity,
    Clock,
    CheckCircle,
    RefreshCw,
    TrendingUp,
    Loader2,
    ChevronRight,
    FileText,
    MessageSquare,
    CreditCard,
    BarChart3,
    AlertTriangle,
    Sparkles
} from 'lucide-react'
import { toast } from 'sonner'

function StatCard({ title, value, icon: Icon, trend, color = 'primary', href }) {
    const content = (
        <div className={`bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 ${href ? 'hover:shadow-lg transition-shadow cursor-pointer' : ''}`}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
                    {trend && (
                        <div className="flex items-center mt-2 text-sm text-green-600">
                            <TrendingUp className="h-4 w-4 mr-1" />
                            {trend}
                        </div>
                    )}
                </div>
                <div className={`p-3 bg-${color}/10 rounded-lg`}>
                    <Icon className={`h-6 w-6 text-${color}`} />
                </div>
            </div>
        </div>
    )

    if (href) {
        return <Link href={href}>{content}</Link>
    }
    return content
}

export default function AdminDashboardPage() {
    const { admin, loading: authLoading } = useAdminAuth()
    const [stats, setStats] = useState(null)
    const [recentCourses, setRecentCourses] = useState([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)

    useEffect(() => {
        if (!authLoading && admin) {
            fetchDashboardData()
        }
    }, [authLoading, admin])

    const fetchDashboardData = async () => {
        try {
            setRefreshing(true)
            const response = await axios.get('/api/admin/dashboard')
            setStats(response.data.stats)
            setRecentCourses(response.data.recentCourses || [])
        } catch (error) {
            console.error('Error fetching admin data:', error)
            toast.error('Failed to load admin dashboard')
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
                    <p className="text-gray-600 dark:text-gray-400">Welcome back, {admin?.name}</p>
                </div>
                <Button 
                    onClick={fetchDashboardData} 
                    disabled={refreshing}
                    variant="outline"
                >
                    <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard
                    title="Total Revenue"
                    value={`Rs. ${stats?.totalRevenue || '0.00'}`}
                    icon={DollarSign}
                    color="green-600"
                    href="/admin/payments"
                />
                <StatCard
                    title="Total Users"
                    value={stats?.totalUsers || 0}
                    icon={Users}
                    href="/admin/users"
                />
                <StatCard
                    title="Total Courses"
                    value={stats?.totalCourses || 0}
                    icon={BookOpen}
                    color="blue-600"
                />
                <StatCard
                    title="Active Today"
                    value={stats?.activeToday || 0}
                    icon={Activity}
                    color="purple-600"
                />
            </div>

            {/* Payment & Credits Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <StatCard
                    title="Monthly Revenue"
                    value={`Rs. ${stats?.monthlyRevenue || '0.00'}`}
                    icon={TrendingUp}
                    color="emerald-600"
                    href="/admin/payments"
                />
                <StatCard
                    title="Total Payments"
                    value={stats?.totalPayments || 0}
                    icon={CreditCard}
                    color="cyan-600"
                    href="/admin/payments"
                />
                <StatCard
                    title="Premium Members"
                    value={stats?.totalMembers || 0}
                    icon={Sparkles}
                    color="yellow-600"
                />
                <StatCard
                    title="Credits Used"
                    value={stats?.totalCreditsUsed || 0}
                    icon={Activity}
                    color="orange-600"
                    href="/admin/credits"
                />
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <StatCard
                    title="Pending Reviews"
                    value={stats?.pendingReviews || 0}
                    icon={MessageSquare}
                    color="orange-600"
                    href="/admin/review-requests"
                />
                <StatCard
                    title="Submissions Today"
                    value={stats?.submissionsToday || 0}
                    icon={FileText}
                    color="cyan-600"
                    href="/admin/all-submissions"
                />
                <StatCard
                    title="Generating Courses"
                    value={stats?.generatingCourses || 0}
                    icon={Clock}
                    color="yellow-600"
                />
            </div>

            {/* Recent Courses */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <h2 className="font-semibold text-gray-900 dark:text-white">Recent Courses</h2>
                    <Link href="/admin/courses" className="text-sm text-primary hover:underline flex items-center">
                        View all <ChevronRight className="h-4 w-4 ml-1" />
                    </Link>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {recentCourses.length === 0 ? (
                        <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                            No courses found
                        </div>
                    ) : (
                        recentCourses.slice(0, 5).map((course, index) => (
                            <div key={index} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-white">{course.topic}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        by {course.createdBy} • {course.courseType}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`px-2 py-1 text-xs rounded-full ${
                                        course.status === 'Ready' 
                                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                            : course.status === 'Generating'
                                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                    }`}>
                                        {course.status}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
