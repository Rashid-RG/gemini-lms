"use client"
import React, { useState, useEffect } from 'react'
import { useAdminAuth } from '@/app/_context/AdminAuthContext'
import axios from 'axios'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AdminPageShell, AdminPageHeader, AdminSurface } from '@/components/admin/AdminPageShell'
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
    Sparkles,
    Calendar
} from 'lucide-react'
import { toast } from 'sonner'

const COLOR_MAPS = {
    'green-600': {
        bg: 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-100/60 dark:border-emerald-900/30',
        iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
        iconText: 'text-emerald-600 dark:text-emerald-400',
        glow: 'shadow-emerald-500/5 dark:shadow-emerald-500/10'
    },
    'blue-600': {
        bg: 'bg-blue-50/70 dark:bg-blue-950/20 border-blue-100/60 dark:border-blue-900/30',
        iconBg: 'bg-blue-100 dark:bg-blue-900/40',
        iconText: 'text-blue-600 dark:text-blue-400',
        glow: 'shadow-blue-500/5 dark:shadow-blue-500/10'
    },
    'purple-600': {
        bg: 'bg-purple-50/70 dark:bg-purple-950/20 border-purple-100/60 dark:border-purple-900/30',
        iconBg: 'bg-purple-100 dark:bg-purple-900/40',
        iconText: 'text-purple-600 dark:text-purple-400',
        glow: 'shadow-purple-500/5 dark:shadow-purple-500/10'
    },
    'emerald-600': {
        bg: 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-100/60 dark:border-emerald-900/30',
        iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
        iconText: 'text-emerald-600 dark:text-emerald-400',
        glow: 'shadow-emerald-500/5 dark:shadow-emerald-500/10'
    },
    'cyan-600': {
        bg: 'bg-cyan-50/70 dark:bg-cyan-950/20 border-cyan-100/60 dark:border-cyan-900/30',
        iconBg: 'bg-cyan-100 dark:bg-cyan-900/40',
        iconText: 'text-cyan-600 dark:text-cyan-400',
        glow: 'shadow-cyan-500/5 dark:shadow-cyan-500/10'
    },
    'yellow-600': {
        bg: 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-100/60 dark:border-amber-900/30',
        iconBg: 'bg-amber-100 dark:bg-amber-900/40',
        iconText: 'text-amber-600 dark:text-amber-400',
        glow: 'shadow-amber-500/5 dark:shadow-amber-500/10'
    },
    'orange-600': {
        bg: 'bg-orange-50/70 dark:bg-orange-950/20 border-orange-100/60 dark:border-orange-900/30',
        iconBg: 'bg-orange-100 dark:bg-orange-900/40',
        iconText: 'text-orange-600 dark:text-orange-400',
        glow: 'shadow-orange-500/5 dark:shadow-orange-500/10'
    },
    primary: {
        bg: 'bg-indigo-50/70 dark:bg-indigo-950/20 border-indigo-100/60 dark:border-indigo-900/30',
        iconBg: 'bg-indigo-100 dark:bg-indigo-900/40',
        iconText: 'text-indigo-600 dark:text-indigo-400',
        glow: 'shadow-indigo-500/5 dark:shadow-indigo-500/10'
    }
}

function StatCard({ title, value, icon: Icon, trend, color = 'primary', href }) {
    const mappedColor = COLOR_MAPS[color] || COLOR_MAPS.primary
    const content = (
        <div className={`relative overflow-hidden bg-white/95 dark:bg-gray-800/90 border border-gray-150 dark:border-gray-700/50 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-gray-250 dark:hover:border-gray-650 group shadow-sm ${mappedColor.glow}`}>
            {/* Ambient corner light gradient */}
            <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full filter blur-xl opacity-10 group-hover:opacity-20 transition-opacity ${mappedColor.iconText.split(' ')[0]} bg-current`} />
            
            <div className="flex items-start justify-between relative z-10">
                <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{title}</p>
                    <p className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">{value}</p>
                    {trend && (
                        <div className="flex items-center text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/20 px-2 py-0.5 rounded-full w-fit">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            {trend}
                        </div>
                    )}
                </div>
                <div className={`p-3.5 ${mappedColor.iconBg} rounded-2xl transition-all duration-300 group-hover:scale-110 shadow-sm border border-black/5 dark:border-white/5`}>
                    <Icon className={`h-5 w-5 ${mappedColor.iconText}`} />
                </div>
            </div>
        </div>
    )

    if (href) {
        return <Link href={href} className="block">{content}</Link>
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
        <AdminPageShell>
            <AdminPageHeader
                title="Dashboard"
                description={`Welcome back, ${admin?.name}`}
                actions={
                    <div className="flex gap-3">
                    {admin?.role === 'tutor' && (
                        <>
                            <style>{`
                                @keyframes pulse-glow {
                                    0%, 100% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.5); }
                                    50% { box-shadow: 0 0 30px rgba(147, 51, 234, 0.7); }
                                }
                                @keyframes shimmer {
                                    0% { background-position: -1000px 0; }
                                    100% { background-position: 1000px 0; }
                                }
                                @keyframes float {
                                    0%, 100% { transform: translateY(0px); }
                                    50% { transform: translateY(-2px); }
                                }
                                .coming-soon-btn-dashboard {
                                    background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%);
                                    animation: pulse-glow 2s ease-in-out infinite, float 3s ease-in-out infinite;
                                    position: relative;
                                    overflow: hidden;
                                }
                                .coming-soon-btn-dashboard::before {
                                    content: '';
                                    position: absolute;
                                    top: 0;
                                    left: -1000px;
                                    width: 1000px;
                                    height: 100%;
                                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
                                    animation: shimmer 3s infinite;
                                }
                            `}</style>
                            <Link href="/admin/create-course">
                                <button
                                    className="coming-soon-btn-dashboard flex items-center gap-2 px-4 py-2 text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-2xl relative"
                                >
                                    <BookOpen className="h-4 w-4 relative z-10" />
                                    <span className="relative z-10">Create Course</span>
                                </button>
                            </Link>
                        </>
                    )}
                    <Button 
                        onClick={fetchDashboardData} 
                        disabled={refreshing}
                        variant="outline"
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    </div>
                }
            />

            {/* Premium Welcome Hero Area */}
            <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-indigo-500/10 dark:shadow-none mb-8 group">
                {/* Visual accents */}
                <div className="absolute right-0 top-0 -mt-6 -mr-6 w-40 h-40 bg-white/10 rounded-full filter blur-xl transition-transform duration-500 group-hover:scale-110" />
                <div className="absolute left-1/3 bottom-0 -mb-12 w-64 h-64 bg-indigo-500/20 rounded-full filter blur-2xl animate-pulse" />
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 bg-white/15 px-3 py-1 rounded-full text-xs font-semibold w-fit backdrop-blur-md">
                            <Sparkles className="h-3 w-3 animate-pulse text-amber-300 fill-amber-300" />
                            <span>System Status: Fully Operational</span>
                        </div>
                        <h2 className="text-3xl font-extrabold tracking-tight">Welcome to your Admin Hub, {admin?.name}</h2>
                        <p className="text-blue-100 text-sm max-w-xl font-medium">
                            Monitor student enrollments, course generation workflows, manage subscriptions, and grade submissions in real-time.
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-3 bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/10 self-start md:self-auto">
                        <Calendar className="h-5 w-5 text-indigo-200" />
                        <div>
                            <p className="text-[10px] text-indigo-200 uppercase font-bold tracking-wider">Current Date</p>
                            <p className="text-sm font-semibold">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}</p>
                        </div>
                    </div>
                </div>
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
            <AdminSurface className="overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700/50 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
                    <div>
                        <h2 className="font-bold text-gray-900 dark:text-white text-lg flex items-center gap-2">
                            <BookOpen className="h-5 w-5 text-primary" />
                            Recent Course Generations
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">List of the latest course generation requests on the platform</p>
                    </div>
                    <Link href="/admin/courses" className="text-xs font-bold text-primary dark:text-blue-400 hover:text-primary/80 flex items-center gap-1 bg-primary/10 dark:bg-primary/20 px-3 py-1.5 rounded-xl transition-all">
                        View all <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
                    {recentCourses.length === 0 ? (
                        <div className="p-12 text-center text-gray-400 dark:text-gray-500">
                            <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
                            No courses generated yet
                        </div>
                    ) : (
                        recentCourses.slice(0, 5).map((course, index) => (
                            <div key={index} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/70 dark:hover:bg-gray-700/30 transition-all duration-200">
                                <div className="space-y-1">
                                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{course.topic}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        by <span className="font-medium text-gray-700 dark:text-gray-300">{course.creatorName ? (course.createdBy ? `${course.creatorName} (${course.createdBy})` : course.creatorName) : (course.createdBy || 'Unknown')}</span> • <span className="capitalize">{course.courseType}</span>
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`px-2.5 py-1 text-[11px] font-bold rounded-full ${
                                        course.status === 'Ready' 
                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/30'
                                            : course.status === 'Generating'
                                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/30'
                                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-200/50 dark:border-rose-900/30'
                                    }`}>
                                        {course.status}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </AdminSurface>
        </AdminPageShell>
    )
}
