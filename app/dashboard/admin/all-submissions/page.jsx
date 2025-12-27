"use client"
import React, { useState, useEffect, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { 
    ClipboardList, 
    AlertCircle, 
    User, 
    BookOpen, 
    Calendar, 
    CheckCircle,
    Clock,
    FileText,
    Code,
    ChevronDown,
    ChevronUp,
    Loader2,
    RefreshCw,
    Edit3,
    Save,
    X,
    MessageSquare,
    Search,
    ChevronLeft,
    ChevronRight,
    Download
} from 'lucide-react'
import { toast } from 'sonner'
import { arrayToCSV, downloadCSV, EXPORT_COLUMNS, getExportFilename } from '@/lib/csvExport'

function AllSubmissionsPage() {
    const { user, isLoaded } = useUser()
    const [submissions, setSubmissions] = useState([])
    const [allSubmissions, setAllSubmissions] = useState([]) // For export
    const [loading, setLoading] = useState(true)
    const [exporting, setExporting] = useState(false)
    const [expandedId, setExpandedId] = useState(null)
    const [editingId, setEditingId] = useState(null)
    const [newScore, setNewScore] = useState('')
    const [instructorNotes, setInstructorNotes] = useState('')
    const [saving, setSaving] = useState(false)
    const [filter, setFilter] = useState('all') // all, graded, pending, manual
    
    // Search and pagination state
    const [searchQuery, setSearchQuery] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    const [itemsPerPage] = useState(20)

    const userEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase()
    const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
    const isAdmin = userEmail && adminEmails.includes(userEmail)

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery)
            setCurrentPage(1) // Reset to first page on search
        }, 300)
        return () => clearTimeout(timer)
    }, [searchQuery])

    useEffect(() => {
        if (isLoaded && isAdmin) {
            fetchSubmissions()
        }
    }, [isLoaded, isAdmin, currentPage, debouncedSearch, filter])

    const fetchSubmissions = async () => {
        try {
            setLoading(true)
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: itemsPerPage.toString(),
                search: debouncedSearch,
                status: filter === 'all' ? 'all' : 
                        filter === 'graded' ? 'Graded' :
                        filter === 'pending' ? 'Submitted' :
                        filter === 'manual' ? 'ManuallyGraded' :
                        filter === 'needsReview' ? 'PendingReview' : 'all'
            })
            const response = await axios.get(`/api/admin/all-submissions?${params}`)
            setSubmissions(response.data.result || [])
            setTotalPages(response.data.totalPages || 1)
            setTotalCount(response.data.totalCount || 0)
        } catch (error) {
            console.error('Error fetching submissions:', error)
            toast.error('Failed to load submissions')
        } finally {
            setLoading(false)
        }
    }

    const handleStartEdit = (submission) => {
        setEditingId(submission.id)
        setNewScore(submission.score?.toString() || '')
        setInstructorNotes(submission.instructorNotes || '')
    }

    const handleCancelEdit = () => {
        setEditingId(null)
        setNewScore('')
        setInstructorNotes('')
    }

    const handleSaveGrade = async (submissionId) => {
        if (!newScore || isNaN(parseInt(newScore))) {
            toast.error('Please enter a valid score')
            return
        }

        const score = parseInt(newScore)
        if (score < 0 || score > 100) {
            toast.error('Score must be between 0 and 100')
            return
        }

        try {
            setSaving(true)
            await axios.patch('/api/admin/all-submissions', {
                submissionId,
                newScore: score,
                instructorNotes,
                adminEmail: userEmail
            })
            toast.success('Grade updated successfully!')
            handleCancelEdit()
            fetchSubmissions()
        } catch (error) {
            console.error('Error updating grade:', error)
            toast.error(error.response?.data?.error || 'Failed to update grade')
        } finally {
            setSaving(false)
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

    const getStatusBadge = (status) => {
        switch (status) {
            case 'ManuallyGraded':
                return <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">Manually Graded</span>
            case 'Graded':
                return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">AI Graded</span>
            case 'Submitted':
                return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">Pending</span>
            case 'PendingReview':
                return <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">⚠️ Needs Review</span>
            default:
                return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">{status}</span>
        }
    }

    const getSubmissionTypeIcon = (type) => {
        switch (type) {
            case 'code': return <Code className="w-4 h-4" />
            case 'document': return <FileText className="w-4 h-4" />
            default: return <MessageSquare className="w-4 h-4" />
        }
    }

    // Handle filter change
    const handleFilterChange = (newFilter) => {
        setFilter(newFilter)
        setCurrentPage(1)
    }

    // Export to CSV
    const handleExport = async () => {
        try {
            setExporting(true)
            toast.info('Preparing export...')
            
            // Fetch all submissions for export (no pagination)
            const params = new URLSearchParams({
                page: '1',
                limit: '10000', // Get all
                search: debouncedSearch,
                status: filter === 'all' ? 'all' : 
                        filter === 'graded' ? 'Graded' :
                        filter === 'pending' ? 'Submitted' :
                        filter === 'manual' ? 'ManuallyGraded' :
                        filter === 'needsReview' ? 'PendingReview' : 'all'
            })
            const response = await axios.get(`/api/admin/all-submissions?${params}`)
            const exportData = response.data.result || []
            
            if (exportData.length === 0) {
                toast.error('No data to export')
                return
            }
            
            const csvContent = arrayToCSV(exportData, EXPORT_COLUMNS.submissions)
            downloadCSV(csvContent, getExportFilename('submissions'))
            toast.success(`Exported ${exportData.length} submissions`)
        } catch (error) {
            console.error('Export error:', error)
            toast.error('Failed to export data')
        } finally {
            setExporting(false)
        }
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
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/10 rounded-xl">
                        <ClipboardList className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">All Submissions</h1>
                        <p className="text-gray-500">View and grade all student submissions</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button onClick={handleExport} disabled={exporting || loading} variant="outline">
                        {exporting ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Download className="w-4 h-4 mr-2" />
                        )}
                        Export CSV
                    </Button>
                    <Button onClick={fetchSubmissions} disabled={loading} variant="outline">
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by student, course, or assignment..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="mb-6 flex gap-2 flex-wrap items-center">
                {[
                    { key: 'all', label: 'All' },
                    { key: 'needsReview', label: '⚠️ Needs Review' },
                    { key: 'pending', label: 'Pending' },
                    { key: 'graded', label: 'AI Graded' },
                    { key: 'manual', label: 'Manually Graded' }
                ].map(f => (
                    <Button 
                        key={f.key}
                        variant={filter === f.key ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleFilterChange(f.key)}
                    >
                        {f.label}
                    </Button>
                ))}
                <span className="ml-4 text-gray-500 text-sm">
                    Showing {submissions.length} of {totalCount} submissions
                </span>
            </div>

            {/* Loading State */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : submissions.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-xl">
                    <ClipboardList className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600">No Submissions Found</h3>
                    <p className="text-gray-400">
                        {searchQuery ? 'Try a different search term.' : 'There are no submissions matching this filter.'}
                    </p>
                </div>
            ) : (
                <>
                    <div className="space-y-4">
                        {submissions.map((submission) => (
                        <div 
                            key={submission.id}
                            className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
                        >
                            {/* Submission Header */}
                            <div 
                                className="p-4 cursor-pointer hover:bg-gray-50"
                                onClick={() => setExpandedId(expandedId === submission.id ? null : submission.id)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2 text-gray-600">
                                            <User className="w-4 h-4" />
                                            <span className="font-medium">{submission.studentEmail}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-gray-500 text-sm">
                                            <BookOpen className="w-4 h-4" />
                                            <span>{submission.course?.topic || 'Unknown Course'}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {getStatusBadge(submission.status)}
                                        {submission.score !== null && (
                                            <span className={`font-bold ${submission.score >= 70 ? 'text-green-600' : submission.score >= 45 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                {submission.score}/100
                                            </span>
                                        )}
                                        {expandedId === submission.id ? 
                                            <ChevronUp className="w-5 h-5 text-gray-400" /> : 
                                            <ChevronDown className="w-5 h-5 text-gray-400" />
                                        }
                                    </div>
                                </div>
                                <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                                    <div className="flex items-center gap-1">
                                        {getSubmissionTypeIcon(submission.submissionType)}
                                        <span className="capitalize">{submission.submissionType || 'text'}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Calendar className="w-4 h-4" />
                                        <span>Submitted: {formatDate(submission.submittedAt)}</span>
                                    </div>
                                    {submission.reviewRequested && (
                                        <span className="text-orange-600 font-medium flex items-center gap-1">
                                            <Clock className="w-4 h-4" />
                                            Review Requested
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Expanded Content */}
                            {expandedId === submission.id && (
                                <div className="border-t border-gray-200 p-4 bg-gray-50">
                                    {/* Assignment Details */}
                                    <div className="mb-4">
                                        <h4 className="font-semibold text-gray-700 mb-2">Assignment</h4>
                                        <p className="text-gray-600">{submission.assignment?.title || 'Unknown Assignment'}</p>
                                        {submission.assignment?.description && (
                                            <p className="text-gray-500 text-sm mt-1">{submission.assignment.description}</p>
                                        )}
                                    </div>

                                    {/* Submission Content */}
                                    <div className="mb-4">
                                        <h4 className="font-semibold text-gray-700 mb-2">Submission</h4>
                                        <div className={`p-3 rounded-lg ${submission.submissionType === 'code' ? 'bg-gray-900 text-green-400 font-mono text-sm' : 'bg-white border border-gray-200'}`}>
                                            <pre className="whitespace-pre-wrap text-sm max-h-60 overflow-y-auto">
                                                {submission.submission}
                                            </pre>
                                        </div>
                                    </div>

                                    {/* AI Feedback */}
                                    {submission.feedback && (
                                        <div className="mb-4">
                                            <h4 className="font-semibold text-gray-700 mb-2">AI Feedback</h4>
                                            <p className="text-gray-600 text-sm bg-white p-3 rounded-lg border border-gray-200">
                                                {submission.feedback}
                                            </p>
                                        </div>
                                    )}

                                    {/* Grade Edit Section */}
                                    {editingId === submission.id ? (
                                        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                            <h4 className="font-semibold text-blue-800 mb-3">Update Grade</h4>
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Score (0-100)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        value={newScore}
                                                        onChange={(e) => setNewScore(e.target.value)}
                                                        className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                        placeholder="Score"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Instructor Notes (optional)
                                                    </label>
                                                    <textarea
                                                        value={instructorNotes}
                                                        onChange={(e) => setInstructorNotes(e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                        rows={3}
                                                        placeholder="Add notes for the student..."
                                                    />
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button 
                                                        onClick={() => handleSaveGrade(submission.id)}
                                                        disabled={saving}
                                                        className="bg-blue-600 hover:bg-blue-700"
                                                    >
                                                        {saving ? (
                                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                        ) : (
                                                            <Save className="w-4 h-4 mr-2" />
                                                        )}
                                                        Save Grade
                                                    </Button>
                                                    <Button 
                                                        onClick={handleCancelEdit}
                                                        variant="outline"
                                                        disabled={saving}
                                                    >
                                                        <X className="w-4 h-4 mr-2" />
                                                        Cancel
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="mt-4 flex items-center justify-between">
                                            <div>
                                                {submission.status === 'ManuallyGraded' && (
                                                    <div className="text-sm text-purple-600">
                                                        <span>Graded by: {submission.reviewedBy || submission.gradedBy}</span>
                                                        {submission.originalAiScore !== null && submission.originalAiScore !== undefined && (
                                                            <span className="ml-3 text-gray-500">
                                                                (Original AI: {submission.originalAiScore}/100)
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                                {submission.instructorNotes && (
                                                    <div className="mt-2 p-2 bg-purple-50 rounded text-sm text-purple-800">
                                                        <strong>Notes:</strong> {submission.instructorNotes}
                                                    </div>
                                                )}
                                            </div>
                                            <Button 
                                                onClick={() => handleStartEdit(submission)}
                                                variant="outline"
                                                size="sm"
                                            >
                                                <Edit3 className="w-4 h-4 mr-2" />
                                                {submission.score !== null ? 'Update Grade' : 'Add Grade'}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="mt-6 flex items-center justify-between">
                            <div className="text-sm text-gray-500">
                                Page {currentPage} of {totalPages} ({totalCount} total)
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1 || loading}
                                >
                                    <ChevronLeft className="w-4 h-4 mr-1" />
                                    Previous
                                </Button>
                                
                                {/* Page numbers */}
                                <div className="flex gap-1">
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        let pageNum;
                                        if (totalPages <= 5) {
                                            pageNum = i + 1;
                                        } else if (currentPage <= 3) {
                                            pageNum = i + 1;
                                        } else if (currentPage >= totalPages - 2) {
                                            pageNum = totalPages - 4 + i;
                                        } else {
                                            pageNum = currentPage - 2 + i;
                                        }
                                        return (
                                            <Button
                                                key={pageNum}
                                                variant={currentPage === pageNum ? 'default' : 'outline'}
                                                size="sm"
                                                onClick={() => setCurrentPage(pageNum)}
                                                disabled={loading}
                                                className="w-8 h-8 p-0"
                                            >
                                                {pageNum}
                                            </Button>
                                        );
                                    })}
                                </div>
                                
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages || loading}
                                >
                                    Next
                                    <ChevronRight className="w-4 h-4 ml-1" />
                                </Button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

export default AllSubmissionsPage
