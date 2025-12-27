"use client"
import React, { useState, useEffect } from 'react'
import { useAdminAuth } from '@/app/_context/AdminAuthContext'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { 
    ClipboardList, 
    Loader2, 
    RefreshCw, 
    Search,
    Eye,
    CheckCircle,
    Clock,
    XCircle,
    Star,
    FileText,
    Calendar,
    Filter,
    Download
} from 'lucide-react'
import { toast } from 'sonner'

function AllSubmissionsPage() {
    const { admin, loading: authLoading } = useAdminAuth()
    const [submissions, setSubmissions] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [selectedSubmission, setSelectedSubmission] = useState(null)
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)

    useEffect(() => {
        if (!authLoading && admin) {
            fetchSubmissions()
        }
    }, [authLoading, admin, page, statusFilter])

    const fetchSubmissions = async () => {
        try {
            setLoading(true)
            const response = await axios.get('/api/admin/all-submissions', {
                params: {
                    page,
                    status: statusFilter !== 'all' ? statusFilter : undefined,
                    search: searchTerm || undefined
                }
            })
            setSubmissions(response.data.submissions || [])
            setTotalPages(response.data.totalPages || 1)
        } catch (error) {
            console.error('Error fetching submissions:', error)
            toast.error('Failed to load submissions')
        } finally {
            setLoading(false)
        }
    }

    const handleSearch = (e) => {
        e.preventDefault()
        setPage(1)
        fetchSubmissions()
    }

    const getStatusBadge = (status) => {
        switch (status?.toLowerCase()) {
            case 'graded':
            case 'approved':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full text-xs">
                        <CheckCircle className="h-3 w-3" />
                        {status}
                    </span>
                )
            case 'pending':
            case 'submitted':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full text-xs">
                        <Clock className="h-3 w-3" />
                        {status}
                    </span>
                )
            case 'rejected':
            case 'failed':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full text-xs">
                        <XCircle className="h-3 w-3" />
                        {status}
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
                        <ClipboardList className="h-6 w-6 text-primary" />
                        All Submissions
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        View and manage all quiz and assignment submissions
                    </p>
                </div>
                <Button onClick={fetchSubmissions} variant="outline" disabled={loading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <form onSubmit={handleSearch} className="flex-1">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by user email or course..."
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
                        <option value="pending">Pending</option>
                        <option value="submitted">Submitted</option>
                        <option value="graded">Graded</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                    </select>
                </div>
            </div>

            {/* Submissions Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : submissions.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <ClipboardList className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No submissions found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">User</th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">Course/Type</th>
                                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-600 dark:text-gray-300">Score</th>
                                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-600 dark:text-gray-300">Status</th>
                                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-600 dark:text-gray-300">Date</th>
                                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600 dark:text-gray-300">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {submissions.map((s) => (
                                    <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-gray-900 dark:text-white">{s.student?.name || 'Unknown'}</p>
                                            <p className="text-sm text-gray-500">{s.studentEmail}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-gray-900 dark:text-white">{s.course?.topic || s.course?.courseLayout?.course_title || 'N/A'}</p>
                                            <p className="text-sm text-gray-500 capitalize">{s.assignment?.title || s.submissionType || 'Assignment'}</p>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {s.score !== null && s.score !== undefined ? (
                                                <span className={`inline-flex items-center gap-1 font-medium ${
                                                    s.score >= 80 ? 'text-green-600' : 
                                                    s.score >= 60 ? 'text-yellow-600' : 'text-red-600'
                                                }`}>
                                                    <Star className="h-4 w-4" />
                                                    {s.score}%
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {getStatusBadge(s.status)}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="flex items-center justify-center gap-1 text-sm text-gray-500">
                                                <Calendar className="h-4 w-4" />
                                                {formatDate(s.createdAt || s.submittedAt)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => setSelectedSubmission(s)}
                                            >
                                                <Eye className="h-4 w-4 mr-1" />
                                                View
                                            </Button>
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

            {/* Submission Detail Modal */}
            {selectedSubmission && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-xl">
                        <div className="flex items-start justify-between mb-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <FileText className="h-5 w-5 text-primary" />
                                Submission Details
                            </h3>
                            <button
                                onClick={() => setSelectedSubmission(null)}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                            >
                                <XCircle className="h-5 w-5 text-gray-400" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm text-gray-500">User</label>
                                    <p className="font-medium">{selectedSubmission.userName || 'Unknown'}</p>
                                    <p className="text-sm text-gray-500">{selectedSubmission.userEmail}</p>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-500">Course</label>
                                    <p className="font-medium">{selectedSubmission.courseTitle || selectedSubmission.courseName || 'N/A'}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="text-sm text-gray-500">Type</label>
                                    <p className="font-medium capitalize">{selectedSubmission.type || 'Quiz'}</p>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-500">Score</label>
                                    <p className="font-medium">
                                        {selectedSubmission.score !== null && selectedSubmission.score !== undefined 
                                            ? `${selectedSubmission.score}%` 
                                            : 'Not graded'}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-500">Status</label>
                                    <div className="mt-1">{getStatusBadge(selectedSubmission.status)}</div>
                                </div>
                            </div>

                            <div>
                                <label className="text-sm text-gray-500">Submitted At</label>
                                <p className="font-medium">{formatDate(selectedSubmission.createdAt || selectedSubmission.submittedAt)}</p>
                            </div>

                            {selectedSubmission.answers && (
                                <div>
                                    <label className="text-sm text-gray-500 mb-2 block">Answers</label>
                                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 max-h-60 overflow-y-auto">
                                        <pre className="text-sm whitespace-pre-wrap">
                                            {typeof selectedSubmission.answers === 'string' 
                                                ? selectedSubmission.answers 
                                                : JSON.stringify(selectedSubmission.answers, null, 2)}
                                        </pre>
                                    </div>
                                </div>
                            )}

                            {selectedSubmission.feedback && (
                                <div>
                                    <label className="text-sm text-gray-500">Feedback</label>
                                    <p className="mt-1 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm">
                                        {selectedSubmission.feedback}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end mt-6">
                            <Button variant="outline" onClick={() => setSelectedSubmission(null)}>
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AllSubmissionsPage
