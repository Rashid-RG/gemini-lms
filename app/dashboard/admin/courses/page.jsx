"use client"
import React, { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { 
    BookOpen,
    AlertCircle,
    Loader2,
    RefreshCw,
    Search,
    Trash2,
    Eye,
    EyeOff,
    Users,
    Star,
    ChevronLeft,
    ChevronRight,
    MoreVertical,
    ExternalLink,
    Filter,
    Video,
    FileText
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

const STATUS_COLORS = {
    'Ready': 'bg-green-100 text-green-700',
    'Generating': 'bg-yellow-100 text-yellow-700',
    'Failed': 'bg-red-100 text-red-700',
    'Error': 'bg-red-100 text-red-700'
}

const DIFFICULTY_COLORS = {
    'Easy': 'text-green-600',
    'Medium': 'text-yellow-600',
    'Hard': 'text-red-600'
}

function CoursesManagementPage() {
    const { user, isLoaded } = useUser()
    const [courses, setCourses] = useState([])
    const [stats, setStats] = useState({ total: 0, ready: 0, generating: 0, failed: 0 })
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [actionLoading, setActionLoading] = useState({})
    const [deleteConfirm, setDeleteConfirm] = useState(null)

    const userEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase()
    const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
    const isAdmin = userEmail && adminEmails.includes(userEmail)

    useEffect(() => {
        if (isLoaded && isAdmin) {
            fetchCourses()
        }
    }, [isLoaded, isAdmin, page, statusFilter])

    const fetchCourses = async () => {
        try {
            setLoading(true)
            const params = new URLSearchParams()
            params.append('page', page.toString())
            params.append('limit', '15')
            if (statusFilter) params.append('status', statusFilter)
            if (searchQuery) params.append('search', searchQuery)

            const response = await axios.get(`/api/admin/courses?${params.toString()}`)
            setCourses(response.data.courses || [])
            setStats(response.data.stats || { total: 0, ready: 0, generating: 0, failed: 0 })
            setTotalPages(response.data.totalPages || 1)
        } catch (error) {
            console.error('Error fetching courses:', error)
            toast.error('Failed to load courses')
        } finally {
            setLoading(false)
        }
    }

    const handleSearch = (e) => {
        e.preventDefault()
        setPage(1)
        fetchCourses()
    }

    const handleDeleteCourse = async (courseId, topic) => {
        if (deleteConfirm !== courseId) {
            setDeleteConfirm(courseId)
            setTimeout(() => setDeleteConfirm(null), 5000) // Reset after 5s
            return
        }

        try {
            setActionLoading(prev => ({ ...prev, [courseId]: 'delete' }))
            await axios.delete('/api/admin/courses', {
                data: { courseId, refundCredits: true }
            })
            toast.success('Course deleted successfully')
            fetchCourses()
        } catch (error) {
            console.error('Error deleting course:', error)
            toast.error('Failed to delete course')
        } finally {
            setActionLoading(prev => ({ ...prev, [courseId]: null }))
            setDeleteConfirm(null)
        }
    }

    const handleToggleVisibility = async (courseId, currentPublic) => {
        try {
            setActionLoading(prev => ({ ...prev, [courseId]: 'visibility' }))
            await axios.put('/api/admin/courses', {
                courseId,
                updates: { isPublic: !currentPublic },
                adminEmail: userEmail
            })
            toast.success(`Course ${currentPublic ? 'hidden' : 'made public'}`)
            // Update local state
            setCourses(prev => prev.map(c => 
                c.courseId === courseId ? { ...c, isPublic: !currentPublic } : c
            ))
        } catch (error) {
            console.error('Error toggling visibility:', error)
            toast.error('Failed to update visibility')
        } finally {
            setActionLoading(prev => ({ ...prev, [courseId]: null }))
        }
    }

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A'
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        })
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
        <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 dark:bg-slate-900/80 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm backdrop-blur-xl">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl">
                        <BookOpen className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white bg-gradient-to-r from-slate-900 to-indigo-950 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">Course Catalog Moderator</h1>
                        <p className="text-sm text-slate-500 font-medium mt-0.5">Community course content and accessibility controls</p>
                    </div>
                </div>
                <Button 
                    onClick={fetchCourses} 
                    disabled={loading}
                    variant="outline"
                    className="border-slate-200 hover:bg-slate-50 font-bold rounded-xl h-11 px-5 shadow-sm transition-all flex items-center gap-2"
                >
                    <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                    Refresh Catalog
                </Button>
            </div>

            {/* Stats Filters */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard 
                    label="Total Community Courses" 
                    value={stats.total} 
                    color="from-blue-500/10 to-indigo-500/10 border-indigo-200/40 text-indigo-950 dark:text-indigo-300" 
                    onClick={() => { setStatusFilter(''); setPage(1); }}
                    active={!statusFilter}
                />
                <StatCard 
                    label="Active & Ready" 
                    value={stats.ready} 
                    color="from-emerald-500/10 to-teal-500/10 border-emerald-200/40 text-emerald-950 dark:text-emerald-300" 
                    onClick={() => { setStatusFilter('Ready'); setPage(1); }}
                    active={statusFilter === 'Ready'}
                />
                <StatCard 
                    label="AI Generation Running" 
                    value={stats.generating} 
                    color="from-amber-500/10 to-orange-500/10 border-amber-200/40 text-amber-955 dark:text-amber-300" 
                    onClick={() => { setStatusFilter('Generating'); setPage(1); }}
                    active={statusFilter === 'Generating'}
                />
                <StatCard 
                    label="Failed Operations" 
                    value={stats.failed} 
                    color="from-rose-500/10 to-red-500/10 border-rose-200/40 text-rose-955 dark:text-rose-300" 
                    onClick={() => { setStatusFilter('Failed'); setPage(1); }}
                    active={statusFilter === 'Failed'}
                />
            </div>

            {/* Search */}
            <form onSubmit={handleSearch} className="bg-white/80 dark:bg-slate-900/80 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm backdrop-blur-xl">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by topic or creator email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-white/50 dark:bg-slate-950/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm placeholder-slate-400 transition-all"
                        />
                    </div>
                    <Button 
                        type="submit" 
                        disabled={loading}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-md px-6 h-11"
                    >
                        <Search className="w-4 h-4 mr-2" />
                        Search
                    </Button>
                </div>
            </form>

            {/* Courses Table */}
            <div className="bg-white/85 dark:bg-slate-900/85 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 overflow-hidden backdrop-blur-xl shadow-sm">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                    </div>
                ) : courses.length === 0 ? (
                    <div className="text-center py-20 text-slate-400">
                        <BookOpen className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                        <p className="font-semibold text-sm">No courses recorded</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50/50 dark:bg-slate-950/50 border-b border-slate-200/60 dark:border-slate-800/60">
                                <tr>
                                    <th className="px-5 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Course</th>
                                    <th className="px-5 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                                    <th className="px-5 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="px-5 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Creator</th>
                                    <th className="px-5 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Created</th>
                                    <th className="px-5 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800/50">
                                {courses.map((course) => (
                                    <tr key={course.courseId} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/30 transition-colors duration-150">
                                        <td className="px-5 py-4">
                                            <div className="max-w-[300px]">
                                                <Link 
                                                    href={`/course/${course.courseId}`}
                                                    target="_blank"
                                                    className="font-semibold text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-sm line-clamp-2"
                                                >
                                                    {course.topic}
                                                </Link>
                                                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                                                    <span className={`font-semibold ${DIFFICULTY_COLORS[course.difficultyLevel]}`}>
                                                        {course.difficultyLevel}
                                                    </span>
                                                    <span>•</span>
                                                    {course.hasAssignments && (
                                                        <span className="flex items-center gap-1">
                                                            <FileText className="w-3 h-3 text-indigo-400" /> Assignments
                                                        </span>
                                                    )}
                                                    {course.hasAssignments && course.includeVideos && <span>•</span>}
                                                    {course.includeVideos && (
                                                        <span className="flex items-center gap-1">
                                                            <Video className="w-3 h-3 text-indigo-400" /> Videos
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                            {course.courseType}
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                                                course.status === 'Ready' ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400' :
                                                course.status === 'Generating' ? 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400' :
                                                'bg-rose-500/10 text-rose-700 border-rose-500/20 dark:text-rose-400'
                                            }`}>
                                                {course.status}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-xs font-medium text-slate-600 dark:text-slate-400 max-w-[150px] truncate">
                                            {course.createdBy}
                                        </td>
                                        <td className="px-5 py-4 text-xs text-slate-500">
                                            {formatDate(course.createdAt)}
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                {/* View Button */}
                                                <Link 
                                                    href={`/course/${course.courseId}`}
                                                    target="_blank"
                                                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg transition-colors border border-transparent hover:border-slate-200/40"
                                                    title="View course"
                                                >
                                                    <ExternalLink className="w-4 h-4 text-slate-500" />
                                                </Link>
 
                                                {/* Toggle Visibility */}
                                                <button
                                                    onClick={() => handleToggleVisibility(course.courseId, course.isPublic)}
                                                    disabled={actionLoading[course.courseId]}
                                                    className={`p-2 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg transition-colors border border-transparent hover:border-slate-200/40 ${
                                                        course.isPublic ? 'text-emerald-600' : 'text-slate-400'
                                                    }`}
                                                    title={course.isPublic ? 'Make private' : 'Make public'}
                                                >
                                                    {actionLoading[course.courseId] === 'visibility' ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : course.isPublic ? (
                                                        <Eye className="w-4 h-4" />
                                                    ) : (
                                                        <EyeOff className="w-4 h-4" />
                                                    )}
                                                </button>
 
                                                {/* Delete Button */}
                                                <button
                                                    onClick={() => handleDeleteCourse(course.courseId, course.topic)}
                                                    disabled={actionLoading[course.courseId]}
                                                    className={`p-2 rounded-lg transition-colors border border-transparent ${
                                                        deleteConfirm === course.courseId 
                                                            ? 'bg-rose-100 border-rose-200 text-rose-600' 
                                                            : 'hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-400 hover:text-rose-600 hover:border-rose-200/40'
                                                    }`}
                                                    title={deleteConfirm === course.courseId ? 'Click again to confirm' : 'Delete course'}
                                                >
                                                    {actionLoading[course.courseId] === 'delete' ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="w-4 h-4" />
                                                    )}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
 
                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-5 py-4 border-t border-slate-200/60 dark:border-slate-800/60 bg-slate-50/30 dark:bg-slate-950/30">
                        <p className="text-xs font-semibold text-slate-500">
                            Page {page} of {totalPages}
                        </p>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1 || loading}
                                className="h-8 border-slate-200"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages || loading}
                                className="h-8 border-slate-200"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

function StatCard({ label, value, color, onClick, active }) {
    return (
        <button
            onClick={onClick}
            className={`p-5 rounded-2xl border-2 transition-all duration-300 bg-gradient-to-br text-left w-full cursor-pointer hover:shadow-md ${color} ${
                active ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-950 border-transparent' : 'border-slate-200/60 dark:border-slate-800/60'
            }`}
        >
            <p className="text-xs font-bold uppercase tracking-wider opacity-75">{label}</p>
            <p className="text-3xl font-black mt-2 tracking-tight">{value}</p>
        </button>
    )
}

export default CoursesManagementPage
