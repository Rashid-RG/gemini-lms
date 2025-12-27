"use client"
import React, { useState, useEffect } from 'react'
import { useAdminAuth } from '@/app/_context/AdminAuthContext'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { 
    BookOpen, 
    Loader2, 
    RefreshCw, 
    Search,
    CheckCircle,
    Clock,
    XCircle,
    Calendar,
    User,
    Filter,
    Eye,
    Trash2,
    AlertTriangle
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

function AdminCoursesPage() {
    const { admin, loading: authLoading } = useAdminAuth()
    const [courses, setCourses] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [stats, setStats] = useState(null)
    const [deleteModal, setDeleteModal] = useState({ open: false, course: null })
    const [deleting, setDeleting] = useState(false)

    useEffect(() => {
        if (!authLoading && admin) {
            fetchCourses()
        }
    }, [authLoading, admin, page, statusFilter])

    const fetchCourses = async () => {
        try {
            setLoading(true)
            const response = await axios.get('/api/admin/courses', {
                params: {
                    page,
                    status: statusFilter !== 'all' ? statusFilter : undefined,
                    search: searchTerm || undefined
                }
            })
            setCourses(response.data.courses || [])
            setTotalPages(response.data.totalPages || 1)
            setStats(response.data.stats || null)
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

    const handleDelete = async () => {
        if (!deleteModal.course) return

        try {
            setDeleting(true)
            const response = await axios.delete('/api/admin/courses', {
                data: { courseId: deleteModal.course.courseId }
            })
            
            // Show appropriate success message based on credit refund
            if (response.data.creditRefunded) {
                toast.success(`Course deleted! 1 credit refunded to ${response.data.refundedTo}`)
            } else {
                toast.success('Course deleted successfully')
            }
            
            setDeleteModal({ open: false, course: null })
            fetchCourses()
        } catch (error) {
            console.error('Error deleting course:', error)
            toast.error('Failed to delete course')
        } finally {
            setDeleting(false)
        }
    }

    const getStatusBadge = (status) => {
        switch (status?.toLowerCase()) {
            case 'ready':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full text-xs">
                        <CheckCircle className="h-3 w-3" />
                        Ready
                    </span>
                )
            case 'generating':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full text-xs">
                        <Clock className="h-3 w-3" />
                        Generating
                    </span>
                )
            case 'failed':
            case 'error':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full text-xs">
                        <XCircle className="h-3 w-3" />
                        Failed
                    </span>
                )
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded-full text-xs">
                        {status || 'Unknown'}
                    </span>
                )
        }
    }

    const formatDate = (date) => {
        if (!date) return 'N/A'
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const filteredCourses = courses.filter(c => 
        c.topic?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.createdBy?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (authLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <BookOpen className="h-6 w-6 text-primary" />
                        All Courses
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Manage all courses in the system
                    </p>
                </div>
                <Button onClick={fetchCourses} variant="outline" disabled={loading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                        <p className="text-sm text-blue-600 dark:text-blue-400">Total</p>
                        <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.total}</p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                        <p className="text-sm text-green-600 dark:text-green-400">Ready</p>
                        <p className="text-2xl font-bold text-green-700 dark:text-green-300">{stats.ready}</p>
                    </div>
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
                        <p className="text-sm text-yellow-600 dark:text-yellow-400">Generating</p>
                        <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{stats.generating}</p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
                        <p className="text-sm text-red-600 dark:text-red-400">Failed</p>
                        <p className="text-2xl font-bold text-red-700 dark:text-red-300">{stats.failed}</p>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <form onSubmit={handleSearch} className="flex-1">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by topic or creator email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                    </div>
                </form>
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-gray-400" />
                    <select
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary"
                    >
                        <option value="all">All Status</option>
                        <option value="Ready">Ready</option>
                        <option value="Generating">Generating</option>
                        <option value="Failed">Failed</option>
                    </select>
                </div>
            </div>

            {/* Courses Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : filteredCourses.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No courses found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">Course</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">Creator</th>
                                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-600 dark:text-gray-300">Type</th>
                                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-600 dark:text-gray-300">Status</th>
                                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-600 dark:text-gray-300">Created</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600 dark:text-gray-300">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {filteredCourses.map((course) => (
                                    <tr key={course.id || course.courseId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-gray-900 dark:text-white">{course.topic}</p>
                                            <p className="text-xs text-gray-400">{course.courseId}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                                                <User className="h-4 w-4" />
                                                {course.createdBy}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                                                {course.courseType || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {getStatusBadge(course.status)}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="flex items-center justify-center gap-1 text-sm text-gray-500">
                                                <Calendar className="h-4 w-4" />
                                                {formatDate(course.createdAt)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link href={`/course/${course.courseId}`} target="_blank">
                                                    <Button size="sm" variant="ghost">
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    onClick={() => setDeleteModal({ open: true, course })}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
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
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                        >
                            Previous
                        </Button>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            Page {page} of {totalPages}
                        </span>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                        >
                            Next
                        </Button>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {deleteModal.open && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full shadow-xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                                <AlertTriangle className="h-6 w-6 text-red-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delete Course</h3>
                        </div>
                        
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            Are you sure you want to delete <strong>"{deleteModal.course?.topic}"</strong>? 
                            This action cannot be undone and will remove all associated data including notes, 
                            flashcards, and quizzes.
                        </p>

                        {/* Credit refund notice for Generating/Failed courses */}
                        {(deleteModal.course?.status === 'Generating' || 
                          deleteModal.course?.status === 'Failed' || 
                          deleteModal.course?.status === 'Error') && (
                            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                <p className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4" />
                                    <span>
                                        <strong>Credit Refund:</strong> 1 credit will be refunded to the user 
                                        ({deleteModal.course?.createdBy}) since this course was not completed.
                                    </span>
                                </p>
                            </div>
                        )}

                        <div className="flex justify-end gap-3">
                            <Button 
                                variant="outline" 
                                onClick={() => setDeleteModal({ open: false, course: null })}
                                disabled={deleting}
                            >
                                Cancel
                            </Button>
                            <Button 
                                variant="destructive"
                                onClick={handleDelete}
                                disabled={deleting}
                            >
                                {deleting ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <Trash2 className="h-4 w-4 mr-2" />
                                )}
                                Delete Course
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AdminCoursesPage
