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
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/10 rounded-xl">
                        <BookOpen className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Course Management</h1>
                        <p className="text-gray-500">Manage all courses on the platform</p>
                    </div>
                </div>
                <Button onClick={fetchCourses} disabled={loading} variant="outline">
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <StatCard 
                    label="Total Courses" 
                    value={stats.total} 
                    color="bg-blue-50 text-blue-700" 
                    onClick={() => { setStatusFilter(''); setPage(1); }}
                    active={!statusFilter}
                />
                <StatCard 
                    label="Ready" 
                    value={stats.ready} 
                    color="bg-green-50 text-green-700" 
                    onClick={() => { setStatusFilter('Ready'); setPage(1); }}
                    active={statusFilter === 'Ready'}
                />
                <StatCard 
                    label="Generating" 
                    value={stats.generating} 
                    color="bg-yellow-50 text-yellow-700" 
                    onClick={() => { setStatusFilter('Generating'); setPage(1); }}
                    active={statusFilter === 'Generating'}
                />
                <StatCard 
                    label="Failed" 
                    value={stats.failed} 
                    color="bg-red-50 text-red-700" 
                    onClick={() => { setStatusFilter('Failed'); setPage(1); }}
                    active={statusFilter === 'Failed'}
                />
            </div>

            {/* Search */}
            <form onSubmit={handleSearch} className="mb-6">
                <div className="flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by topic or creator email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                        />
                    </div>
                    <Button type="submit" disabled={loading}>
                        <Search className="w-4 h-4 mr-2" />
                        Search
                    </Button>
                </div>
            </form>

            {/* Courses Table */}
            <div className="bg-white rounded-xl border overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                ) : courses.length === 0 ? (
                    <div className="text-center py-20 text-gray-500">
                        <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <p>No courses found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Course</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Creator</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {courses.map((course) => (
                                    <tr key={course.courseId} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <div className="max-w-[300px]">
                                                <Link 
                                                    href={`/course/${course.courseId}`}
                                                    target="_blank"
                                                    className="font-medium text-gray-800 hover:text-primary line-clamp-2"
                                                >
                                                    {course.topic}
                                                </Link>
                                                <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                                    <span className={DIFFICULTY_COLORS[course.difficultyLevel]}>
                                                        {course.difficultyLevel}
                                                    </span>
                                                    {course.hasAssignments && (
                                                        <span className="flex items-center gap-1">
                                                            <FileText className="w-3 h-3" /> Assignments
                                                        </span>
                                                    )}
                                                    {course.includeVideos && (
                                                        <span className="flex items-center gap-1">
                                                            <Video className="w-3 h-3" /> Videos
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">
                                            {course.courseType}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[course.status] || 'bg-gray-100'}`}>
                                                {course.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600 max-w-[150px] truncate">
                                            {course.createdBy}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500">
                                            {formatDate(course.createdAt)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-center gap-2">
                                                {/* View Button */}
                                                <Link 
                                                    href={`/course/${course.courseId}`}
                                                    target="_blank"
                                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                                    title="View course"
                                                >
                                                    <ExternalLink className="w-4 h-4 text-gray-500" />
                                                </Link>

                                                {/* Toggle Visibility */}
                                                <button
                                                    onClick={() => handleToggleVisibility(course.courseId, course.isPublic)}
                                                    disabled={actionLoading[course.courseId]}
                                                    className={`p-2 hover:bg-gray-100 rounded-lg transition-colors ${
                                                        course.isPublic ? 'text-green-600' : 'text-gray-400'
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
                                                    className={`p-2 rounded-lg transition-colors ${
                                                        deleteConfirm === course.courseId 
                                                            ? 'bg-red-100 text-red-600' 
                                                            : 'hover:bg-red-50 text-gray-400 hover:text-red-600'
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
                    <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
                        <p className="text-sm text-gray-500">
                            Page {page} of {totalPages}
                        </p>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1 || loading}
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages || loading}
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
            className={`p-4 rounded-xl border transition-all ${
                active ? 'ring-2 ring-primary border-primary' : 'hover:shadow-md'
            } ${color} cursor-pointer text-left w-full`}
        >
            <p className="text-sm opacity-80">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
        </button>
    )
}

export default CoursesManagementPage
