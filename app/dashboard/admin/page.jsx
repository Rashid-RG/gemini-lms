"use client"
import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useAdminDashboard } from '@/hooks/useAdminDashboard'
import { 
    Users, 
    BookOpen, 
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
    Mail,
    Database
} from 'lucide-react'

function AdminDashboardPage() {
    const {
        isLoaded,
        stats,
        recentCourses,
        loading,
        refreshing,
        isAdmin,
        fetchDashboardData
    } = useAdminDashboard()

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
        <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 p-6 rounded-2xl border border-slate-200/60 shadow-sm backdrop-blur-xl">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-800 bg-gradient-to-r from-slate-900 to-indigo-950 bg-clip-text text-transparent">Admin Command Center</h1>
                    <p className="text-sm text-slate-500 font-medium mt-1">Platform metrics, server operations, and database monitoring</p>
                </div>
                <Button 
                    onClick={fetchDashboardData} 
                    disabled={refreshing}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-md shadow-indigo-100 hover:shadow-lg transition-all duration-300 flex items-center gap-2 self-start sm:self-auto h-11 px-5"
                >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh Stats
                </Button>
            </div>

            {/* Core Stats Overview Header */}
            <div className="flex items-center gap-2 border-l-4 border-indigo-500 pl-3">
                <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest">Platform Activity Metrics</h2>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Total Users */}
                <StatCard
                    title="Total Registered Users"
                    value={stats?.users?.total || 0}
                    icon={<Users className="h-5 w-5" />}
                    color="blue"
                    subtext={`${stats?.users?.members || 0} premium members`}
                />

                {/* Total Courses */}
                <StatCard
                    title="Total Courses Generated"
                    value={stats?.courses?.total || 0}
                    icon={<BookOpen className="h-5 w-5" />}
                    color="green"
                    subtext={`${stats?.courses?.ready || 0} active & ready`}
                />

                {/* Generating Courses */}
                <StatCard
                    title="Active AI Generations"
                    value={stats?.courses?.generating || 0}
                    icon={<Clock className="h-5 w-5" />}
                    color="yellow"
                    subtext={stats?.courses?.generating > 0 ? 'Generations running' : 'System idle (no active jobs)'}
                />

                {/* Failed Courses */}
                <StatCard
                    title="Generation Failures"
                    value={(stats?.courses?.failed || 0) + (stats?.courses?.error || 0)}
                    icon={<XCircle className="h-5 w-5" />}
                    color="red"
                    subtext="Error states needing review"
                />
            </div>

            {/* Second Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Total Credits */}
                <StatCard
                    title="Allocated User Credits"
                    value={stats?.credits?.totalAvailable || 0}
                    icon={<CreditCard className="h-5 w-5" />}
                    color="purple"
                    subtext={`${stats?.credits?.totalUsed || 0} spent credits lifetime`}
                />

                {/* Study Content */}
                <StatCard
                    title="Total Chapter Sub-Notes"
                    value={stats?.studyContent?.ready || 0}
                    icon={<FileText className="h-5 w-5" />}
                    color="indigo"
                    subtext={`${stats?.studyContent?.generating || 0} sub-contents active`}
                />

                {/* Support Tickets */}
                <StatCard
                    title="Open Support Tickets"
                    value={stats?.support?.open || 0}
                    icon={<MessageSquare className="h-5 w-5" />}
                    color="orange"
                    subtext={`${stats?.support?.total || 0} tickets logged overall`}
                />

                {/* Success Rate */}
                <StatCard
                    title="AI Outline Success Rate"
                    value={`${stats?.successRate || 0}%`}
                    icon={<TrendingUp className="h-5 w-5" />}
                    color="emerald"
                    subtext="Outline parse completion"
                />
            </div>

            {/* Quick Actions Header */}
            <div className="flex items-center gap-2 border-l-4 border-indigo-500 pl-3">
                <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest">Administrative Control Panels</h2>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <QuickActionCard
                    title="Announcements"
                    description="Broadcast banner updates"
                    href="/dashboard/admin/announcements"
                    icon={<Megaphone className="h-5 w-5" />}
                />
                <QuickActionCard
                    title="Analytics"
                    description="View database logs"
                    href="/dashboard/admin/analytics"
                    icon={<BarChart3 className="h-5 w-5" />}
                />
                <QuickActionCard
                    title="Email Students"
                    description="Dispatch bulk student emails"
                    href="/dashboard/admin/email-students"
                    icon={<Mail className="h-5 w-5" />}
                />
                <QuickActionCard
                    title="Manage Courses"
                    description="Moderate course listings"
                    href="/dashboard/admin/courses"
                    icon={<BookOpen className="h-5 w-5" />}
                />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                <QuickActionCard
                    title="Review Requests"
                    description="Grade dispute queue"
                    href="/dashboard/admin/review-requests"
                    icon={<AlertTriangle className="h-5 w-5" />}
                    count={stats?.reviewRequests || 0}
                />
                <QuickActionCard
                    title="All Submissions"
                    description="Grade assignment drafts"
                    href="/dashboard/admin/all-submissions"
                    icon={<FileText className="h-5 w-5" />}
                />
                <QuickActionCard
                    title="Credits Manager"
                    description="Refund or adjust credits"
                    href="/dashboard/admin/credits"
                    icon={<CreditCard className="h-5 w-5" />}
                />
                <QuickActionCard
                    title="Support Inbox"
                    description="Resolve customer tickets"
                    href="/dashboard/support"
                    icon={<MessageSquare className="h-5 w-5" />}
                    count={stats?.support?.open || 0}
                />
                <QuickActionCard
                    title="Activity Log"
                    description="Audit administrative logs"
                    href="/dashboard/admin/activity-log"
                    icon={<Activity className="h-5 w-5" />}
                />
                <QuickActionCard
                    title="System Diagnostics"
                    description="Live database & AI health"
                    href="/dashboard/admin/health"
                    icon={<RefreshCw className="h-5 w-5" />}
                />
                <QuickActionCard
                    title="Data Backups"
                    description="Backup & download database tables"
                    href="/dashboard/admin/backup"
                    icon={<Database className="h-5 w-5" />}
                />
            </div>

            {/* Recent Activity & System Health */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
                {/* Recent Courses */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 flex flex-col justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Activity className="h-5 w-5 text-indigo-600" />
                            Recent Generations
                        </h3>
                        <div className="space-y-3.5">
                            {recentCourses.length === 0 ? (
                                <p className="text-slate-400 text-center py-6 text-sm">No recent courses recorded.</p>
                            ) : (
                                recentCourses.slice(0, 5).map((course, index) => (
                                    <div key={index} className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-xl hover:shadow-sm transition-all duration-200">
                                        <div className="flex-1 min-w-0 pr-4">
                                            <p className="font-semibold text-slate-800 text-sm truncate">{course.topic}</p>
                                            <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">{course.createdBy}</p>
                                        </div>
                                        <StatusBadge status={course.status} />
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* System Health */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-indigo-600" />
                        Platform Operations Health
                    </h3>
                    <div className="space-y-5 py-2">
                        <HealthIndicator 
                            label="Outline Generation Queue" 
                            status={stats?.courses?.generating > 10 ? 'warning' : 'healthy'}
                            detail={`${stats?.courses?.generating || 0} active outlines`}
                        />
                        <HealthIndicator 
                            label="Course Outline Errors" 
                            status={((stats?.courses?.error || 0) + (stats?.courses?.failed || 0)) > 5 ? 'warning' : 'healthy'}
                            detail={`${(stats?.courses?.error || 0) + (stats?.courses?.failed || 0)} error courses`}
                        />
                        <HealthIndicator 
                            label="Sub-Notes Worker Thread" 
                            status={stats?.studyContent?.error > 5 ? 'warning' : 'healthy'}
                            detail={`${stats?.studyContent?.error || 0} worker issues`}
                        />
                        <HealthIndicator 
                            label="Support Tickets Backlog" 
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
        blue: 'bg-blue-50/70 text-blue-600 border border-blue-100/50 dark:text-blue-400',
        green: 'bg-emerald-50/70 text-emerald-600 border border-emerald-100/50 dark:text-emerald-400',
        yellow: 'bg-amber-50/70 text-amber-600 border border-amber-100/50 dark:text-amber-400',
        red: 'bg-rose-50/70 text-rose-600 border border-rose-100/50 dark:text-rose-400',
        purple: 'bg-purple-50/70 text-purple-600 border border-purple-100/50 dark:text-purple-400',
        indigo: 'bg-indigo-50/70 text-indigo-600 border border-indigo-100/50 dark:text-indigo-400',
        orange: 'bg-orange-50/70 text-orange-600 border border-orange-100/50 dark:text-orange-400',
        emerald: 'bg-emerald-50/70 text-emerald-600 border border-emerald-100/50 dark:text-emerald-400',
    }

    return (
        <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm hover:shadow-md hover:scale-[1.02] hover:border-slate-300 transition-all duration-300 flex items-center justify-between group">
            <div className="flex-1 min-w-0 pr-4">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{title}</p>
                <p className="text-3xl font-black mt-1 text-slate-800 tracking-tight">{value}</p>
                {subtext && <p className="text-[11px] text-slate-500 font-medium truncate mt-1">{subtext}</p>}
            </div>
            <div className={`h-11 w-11 rounded-xl flex items-center justify-center shadow-sm shrink-0 transition-transform duration-300 group-hover:scale-110 ${colors[color]}`}>
                {icon}
            </div>
        </div>
    )
}

// Quick Action Card
function QuickActionCard({ title, description, href, icon, count }) {
    return (
        <Link href={href} className="block w-full">
            <div className="bg-white/80 border border-slate-200/50 hover:border-indigo-300 hover:bg-indigo-50/5 hover:-translate-y-0.5 hover:shadow-md rounded-2xl p-5 transition-all duration-300 cursor-pointer group flex items-center justify-between">
                <div className="flex items-center gap-3.5 min-w-0 pr-4">
                    <div className="h-10 w-10 bg-indigo-50 text-indigo-600 border border-indigo-100/30 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-250">
                        {icon}
                    </div>
                    <div className="min-w-0">
                        <p className="font-bold text-slate-800 text-sm truncate leading-snug">{title}</p>
                        <p className="text-xs text-slate-500 truncate leading-snug mt-0.5">{description}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {count > 0 && (
                        <span className="bg-rose-500 text-white font-bold text-[10px] px-2 py-0.5 rounded-full ring-2 ring-rose-100 animate-pulse">
                            {count}
                        </span>
                    )}
                    <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition-transform duration-200" />
                </div>
            </div>
        </Link>
    )
}

// Status Badge
function StatusBadge({ status }) {
    const statusConfig = {
        'Ready': { color: 'bg-emerald-50 text-emerald-700 border border-emerald-100', icon: CheckCircle },
        'Generating': { color: 'bg-amber-50 text-amber-700 border border-amber-100 animate-pulse', icon: Clock },
        'Failed': { color: 'bg-rose-50 text-rose-700 border border-rose-100', icon: XCircle },
        'Error': { color: 'bg-rose-50 text-rose-700 border border-rose-100', icon: XCircle },
    }

    const config = statusConfig[status] || statusConfig['Ready']
    const Icon = config.icon

    return (
        <span className={`px-2.5 py-1 text-[11px] font-bold rounded-full flex items-center gap-1.5 shrink-0 ${config.color}`}>
            <Icon className="h-3.5 w-3.5" />
            {status}
        </span>
    )
}

// Health Indicator
function HealthIndicator({ label, status, detail }) {
    const statusColors = {
        healthy: 'bg-emerald-500 shadow-emerald-500/50',
        warning: 'bg-amber-500 shadow-amber-500/50',
        critical: 'bg-rose-500 shadow-rose-500/50'
    }

    return (
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
            <div className="flex items-center gap-3">
                <div className="relative flex h-3.5 w-3.5">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${status === 'healthy' ? 'bg-emerald-400' : status === 'warning' ? 'bg-amber-400' : 'bg-rose-400'}`}></span>
                    <span className={`relative inline-flex rounded-full h-3.5 w-3.5 shadow-sm ${statusColors[status]}`}></span>
                </div>
                <span className="font-bold text-slate-700 text-sm">{label}</span>
            </div>
            <span className="text-xs text-slate-500 font-medium">{detail}</span>
        </div>
    )
}

export default AdminDashboardPage
