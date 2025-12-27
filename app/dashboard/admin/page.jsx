"use client"
import React, { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import axios from 'axios'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { 
    Users, 
    BookOpen, 
    DollarSign,
    AlertTriangle,
    Activity,
    Clock,
    CheckCircle,
    XCircle,
    RefreshCw,
    TrendingUp,
    Loader2,
    ChevronRight,
    FileText,
    MessageSquare,
    CreditCard,
    BarChart3,
    Megaphone,
    Mail
} from 'lucide-react'
import { toast } from 'sonner'

function AdminDashboardPage() {
    const { user, isLoaded } = useUser()
    const [stats, setStats] = useState(null)
    const [recentCourses, setRecentCourses] = useState([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)

    const userEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase()
    const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
    const isAdmin = userEmail && adminEmails.includes(userEmail)

    useEffect(() => {
        if (isLoaded && isAdmin) {
            fetchDashboardData()
        }
    }, [isLoaded, isAdmin])

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

    if (!isLoaded || loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!isAdmin) {
        return (
            <div className="p-8">
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
                    <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-red-700 dark:text-red-400 mb-2">Access Denied</h2>
                    <p className="text-red-600 dark:text-red-300">You don't have permission to access the admin dashboard.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
                    <p className="text-gray-600 dark:text-gray-400">System overview and management</p>
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
                {/* Total Users */}
                <StatCard
                    title="Total Users"
                    value={stats?.users?.total || 0}
                    icon={<Users className="h-6 w-6" />}
                    color="blue"
                    subtext={`${stats?.users?.members || 0} members`}
                />

                {/* Total Courses */}
                <StatCard
                    title="Total Courses"
                    value={stats?.courses?.total || 0}
                    icon={<BookOpen className="h-6 w-6" />}
                    color="green"
                    subtext={`${stats?.courses?.ready || 0} ready`}
                />

                {/* Generating Courses */}
                <StatCard
                    title="Generating"
                    value={stats?.courses?.generating || 0}
                    icon={<Clock className="h-6 w-6" />}
                    color="yellow"
                    subtext={stats?.courses?.generating > 0 ? 'Active generation' : 'No active jobs'}
                />

                {/* Failed Courses */}
                <StatCard
                    title="Failed/Error"
                    value={(stats?.courses?.failed || 0) + (stats?.courses?.error || 0)}
                    icon={<XCircle className="h-6 w-6" />}
                    color="red"
                    subtext="Need attention"
                />
            </div>

            {/* Second Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {/* Total Credits */}
                <StatCard
                    title="Total Credits Available"
                    value={stats?.credits?.totalAvailable || 0}
                    icon={<CreditCard className="h-6 w-6" />}
                    color="purple"
                    subtext={`${stats?.credits?.totalUsed || 0} used lifetime`}
                />

                {/* Study Content */}
                <StatCard
                    title="Study Content"
                    value={stats?.studyContent?.ready || 0}
                    icon={<FileText className="h-6 w-6" />}
                    color="indigo"
                    subtext={`${stats?.studyContent?.generating || 0} generating`}
                />

                {/* Support Tickets */}
                <StatCard
                    title="Open Tickets"
                    value={stats?.support?.open || 0}
                    icon={<MessageSquare className="h-6 w-6" />}
                    color="orange"
                    subtext={`${stats?.support?.total || 0} total`}
                />

                {/* Success Rate */}
                <StatCard
                    title="Success Rate"
                    value={`${stats?.successRate || 0}%`}
                    icon={<TrendingUp className="h-6 w-6" />}
                    color="emerald"
                    subtext="Course completion"
                />
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <QuickActionCard
                    title="Announcements"
                    description="Create platform announcements"
                    href="/dashboard/admin/announcements"
                    icon={<Megaphone className="h-5 w-5" />}
                />
                <QuickActionCard
                    title="Analytics"
                    description="View platform statistics"
                    href="/dashboard/admin/analytics"
                    icon={<BarChart3 className="h-5 w-5" />}
                />
                <QuickActionCard
                    title="Email Students"
                    description="Send bulk emails to users"
                    href="/dashboard/admin/email-students"
                    icon={<Mail className="h-5 w-5" />}
                />
                <QuickActionCard
                    title="Manage Courses"
                    description="View and manage all courses"
                    href="/dashboard/admin/courses"
                    icon={<BookOpen className="h-5 w-5" />}
                />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                <QuickActionCard
                    title="Review Requests"
                    description="Review assignment grade appeals"
                    href="/dashboard/admin/review-requests"
                    icon={<AlertTriangle className="h-5 w-5" />}
                    count={stats?.reviewRequests || 0}
                />
                <QuickActionCard
                    title="All Submissions"
                    description="View and grade all submissions"
                    href="/dashboard/admin/all-submissions"
                    icon={<FileText className="h-5 w-5" />}
                />
                <QuickActionCard
                    title="Credits Management"
                    description="Manage user credits & memberships"
                    href="/dashboard/admin/credits"
                    icon={<CreditCard className="h-5 w-5" />}
                />
                <QuickActionCard
                    title="Support Tickets"
                    description="Manage user support requests"
                    href="/dashboard/support"
                    icon={<MessageSquare className="h-5 w-5" />}
                    count={stats?.support?.open || 0}
                />
                <QuickActionCard
                    title="Activity Log"
                    description="Track admin actions & changes"
                    href="/dashboard/admin/activity-log"
                    icon={<Activity className="h-5 w-5" />}
                />
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Courses */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Activity className="h-5 w-5 text-primary" />
                        Recent Courses
                    </h3>
                    <div className="space-y-3">
                        {recentCourses.length === 0 ? (
                            <p className="text-gray-500 text-center py-4">No recent courses</p>
                        ) : (
                            recentCourses.slice(0, 5).map((course, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">{course.topic}</p>
                                        <p className="text-sm text-gray-500 truncate">{course.createdBy}</p>
                                    </div>
                                    <StatusBadge status={course.status} />
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* System Health */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-primary" />
                        System Health
                    </h3>
                    <div className="space-y-4">
                        <HealthIndicator 
                            label="Course Generation" 
                            status={stats?.courses?.generating > 10 ? 'warning' : 'healthy'}
                            detail={`${stats?.courses?.generating || 0} in progress`}
                        />
                        <HealthIndicator 
                            label="Error Rate" 
                            status={((stats?.courses?.error || 0) + (stats?.courses?.failed || 0)) > 5 ? 'warning' : 'healthy'}
                            detail={`${(stats?.courses?.error || 0) + (stats?.courses?.failed || 0)} failed courses`}
                        />
                        <HealthIndicator 
                            label="Study Content" 
                            status={stats?.studyContent?.error > 5 ? 'warning' : 'healthy'}
                            detail={`${stats?.studyContent?.error || 0} errors`}
                        />
                        <HealthIndicator 
                            label="Support Queue" 
                            status={stats?.support?.open > 10 ? 'warning' : 'healthy'}
                            detail={`${stats?.support?.open || 0} open tickets`}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

// Stat Card Component
function StatCard({ title, value, icon, color, subtext }) {
    const colors = {
        blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
        green: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
        yellow: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400',
        red: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
        purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
        indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400',
        orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
        emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
                    <p className="text-2xl font-bold mt-1">{value}</p>
                    {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
                </div>
                <div className={`p-3 rounded-lg ${colors[color]}`}>
                    {icon}
                </div>
            </div>
        </div>
    )
}

// Quick Action Card
function QuickActionCard({ title, description, href, icon, count }) {
    return (
        <Link href={href}>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            {icon}
                        </div>
                        <div>
                            <p className="font-medium">{title}</p>
                            <p className="text-sm text-gray-500">{description}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {count > 0 && (
                            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                                {count}
                            </span>
                        )}
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                </div>
            </div>
        </Link>
    )
}

// Status Badge
function StatusBadge({ status }) {
    const statusConfig = {
        'Ready': { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
        'Generating': { color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock },
        'Failed': { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
        'Error': { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
    }

    const config = statusConfig[status] || statusConfig['Ready']
    const Icon = config.icon

    return (
        <span className={`px-2 py-1 text-xs rounded-full flex items-center gap-1 ${config.color}`}>
            <Icon className="h-3 w-3" />
            {status}
        </span>
    )
}

// Health Indicator
function HealthIndicator({ label, status, detail }) {
    const statusColors = {
        healthy: 'bg-green-500',
        warning: 'bg-yellow-500',
        critical: 'bg-red-500'
    }

    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className={`h-3 w-3 rounded-full ${statusColors[status]}`} />
                <span className="font-medium">{label}</span>
            </div>
            <span className="text-sm text-gray-500">{detail}</span>
        </div>
    )
}

export default AdminDashboardPage
