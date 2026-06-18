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
        <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 dark:bg-slate-900/80 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm backdrop-blur-xl">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl">
                        <ClipboardList className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white bg-gradient-to-r from-slate-900 to-indigo-950 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">Student Submissions</h1>
                        <p className="text-sm text-slate-500 font-medium mt-0.5">Grade drafts, view answers, and edit AI evaluations</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button 
                        onClick={handleExport} 
                        disabled={exporting || loading} 
                        variant="outline"
                        className="border-slate-200 hover:bg-slate-50 font-bold rounded-xl h-11 px-5 shadow-sm transition-all flex items-center gap-2"
                    >
                        {exporting ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Download className="w-4 h-4 mr-2" />
                        )}
                        Export CSV
                    </Button>
                    <Button 
                        onClick={fetchSubmissions} 
                        disabled={loading} 
                        variant="outline"
                        className="border-slate-200 hover:bg-slate-50 font-bold rounded-xl h-11 px-5 shadow-sm transition-all flex items-center gap-2"
                    >
                        <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                        Refresh List
                    </Button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="bg-white/80 dark:bg-slate-900/80 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm backdrop-blur-xl">
                <div className="relative max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by student, course, or assignment..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-white/50 dark:bg-slate-950/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm placeholder-slate-400 transition-all"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white/80 dark:bg-slate-900/80 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm backdrop-blur-xl flex gap-2 flex-wrap items-center justify-between">
                <div className="flex gap-2 flex-wrap">
                    {[
                        { key: 'all', label: 'All Submissions' },
                        { key: 'needsReview', label: '⚠️ Needs Review' },
                        { key: 'pending', label: 'Pending AI Grading' },
                        { key: 'graded', label: 'AI Graded' },
                        { key: 'manual', label: 'Manually Graded' }
                    ].map(f => (
                        <Button 
                            key={f.key}
                            variant={filter === f.key ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleFilterChange(f.key)}
                            className={`rounded-xl font-bold h-9 text-xs transition-all ${
                                filter === f.key 
                                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm' 
                                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                            }`}
                        >
                            {f.label}
                        </Button>
                    ))}
                </div>
                <span className="text-slate-500 font-medium text-xs bg-slate-50 dark:bg-slate-950/40 px-3 py-1.5 rounded-xl border border-slate-200/40 dark:border-slate-800/40 mt-2 sm:mt-0">
                    Showing {submissions.length} of {totalCount} items
                </span>
            </div>

            {/* Loading State */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                </div>
            ) : submissions.length === 0 ? (
                <div className="text-center py-20 bg-white/80 dark:bg-slate-900/80 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm backdrop-blur-xl">
                    <ClipboardList className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                    <h3 className="text-lg font-bold text-slate-700">No Submissions Found</h3>
                    <p className="text-slate-400 text-sm mt-1 max-w-xs mx-auto">
                        {searchQuery ? 'Try matching alternative keywords or clear the search criteria.' : 'There are no submissions under this tab category.'}
                    </p>
                </div>
            ) : (
                <>
                    <div className="space-y-4">
                        {submissions.map((submission) => (
                        <div 
                            key={submission.id}
                            className="bg-white/85 dark:bg-slate-900/85 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm overflow-hidden backdrop-blur-xl transition-all duration-200 hover:shadow-md"
                        >
                            {/* Submission Header */}
                            <div 
                                className="p-5 cursor-pointer hover:bg-slate-50/30 dark:hover:bg-slate-950/20 transition-colors"
                                onClick={() => setExpandedId(expandedId === submission.id ? null : submission.id)}
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold text-sm">
                                            <div className="h-6 w-6 rounded-full bg-slate-100 dark:bg-slate-950 flex items-center justify-center font-bold text-xs">
                                                {submission.studentEmail?.charAt(0).toUpperCase()}
                                            </div>
                                            <span>{submission.studentEmail}</span>
                                        </div>
                                        <span className="hidden sm:inline text-slate-300">•</span>
                                        <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
                                            <BookOpen className="w-4 h-4 text-indigo-500" />
                                            <span className="truncate max-w-[200px]">{submission.course?.topic || 'Unknown Course'}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between sm:justify-end gap-3 self-stretch sm:self-auto">
                                        {getStatusBadge(submission.status)}
                                        {submission.score !== null && (
                                            <span className={`font-black text-sm px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/40 dark:border-slate-800/40 ${submission.score >= 70 ? 'text-emerald-600 dark:text-emerald-400' : submission.score >= 45 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                                {submission.score}/100
                                            </span>
                                        )}
                                        {expandedId === submission.id ? 
                                            <ChevronUp className="w-5 h-5 text-slate-400" /> : 
                                            <ChevronDown className="w-5 h-5 text-slate-400" />
                                        }
                                    </div>
                                </div>
                                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500">
                                    <div className="flex items-center gap-1">
                                        {getSubmissionTypeIcon(submission.submissionType)}
                                        <span className="capitalize">{submission.submissionType || 'text'}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Calendar className="w-4 h-4" />
                                        <span>Submitted: {formatDate(submission.submittedAt)}</span>
                                    </div>
                                    {submission.reviewRequested && (
                                        <span className="text-rose-600 bg-rose-50 dark:bg-rose-950/20 px-2 py-0.5 rounded border border-rose-200/30 font-bold flex items-center gap-1 animate-pulse">
                                            <Clock className="w-3.5 h-3.5" />
                                            Needs Review
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Expanded Content */}
                            {expandedId === submission.id && (
                                <div className="border-t border-slate-200/60 dark:border-slate-800/60 p-5 bg-slate-50/40 dark:bg-slate-950/10 space-y-4">
                                    {/* Assignment Details */}
                                    <div className="bg-white/80 dark:bg-slate-900/80 p-4 rounded-xl border border-slate-200/40 dark:border-slate-800/40 shadow-sm">
                                        <h4 className="font-bold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider mb-1">Assignment</h4>
                                        <p className="text-slate-800 dark:text-slate-100 font-semibold text-sm">{submission.assignment?.title || 'Unknown Assignment'}</p>
                                        {submission.assignment?.description && (
                                            <p className="text-slate-500 text-xs mt-1.5">{submission.assignment.description}</p>
                                        )}
                                    </div>

                                    {/* Submission Content */}
                                    <div className="bg-white/80 dark:bg-slate-900/80 p-4 rounded-xl border border-slate-200/40 dark:border-slate-800/40 shadow-sm">
                                        <h4 className="font-bold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider mb-2">Student Draft Submission</h4>
                                        <div className={`p-4 rounded-xl ${submission.submissionType === 'code' ? 'bg-slate-950 text-emerald-400 font-mono border border-slate-800/60' : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 border border-slate-200/50 dark:border-slate-800/50'}`}>
                                            <pre className="whitespace-pre-wrap text-xs max-h-60 overflow-y-auto pr-1">
                                                {submission.submission}
                                            </pre>
                                        </div>
                                    </div>

                                    {/* AI Feedback */}
                                    {submission.feedback && (
                                        <div className="bg-white/80 dark:bg-slate-900/80 p-4 rounded-xl border border-slate-200/40 dark:border-slate-800/40 shadow-sm">
                                            <h4 className="font-bold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider mb-2">AI Feedback Explanation</h4>
                                            <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                                                {submission.feedback}
                                            </p>
                                        </div>
                                    )}

                                    {/* Grade Edit Section */}
                                    {editingId === submission.id ? (
                                        <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-5 border border-indigo-200/40 rounded-xl space-y-4">
                                            <h4 className="font-bold text-indigo-800 dark:text-indigo-400 text-sm">Update Submission Grade</h4>
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                                        Grade Score (0-100)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        value={newScore}
                                                        onChange={(e) => setNewScore(e.target.value)}
                                                        className="w-32 px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-bold"
                                                        placeholder="Score"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                                        Feedback Notes / Comments
                                                    </label>
                                                    <textarea
                                                        value={instructorNotes}
                                                        onChange={(e) => setInstructorNotes(e.target.value)}
                                                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm h-20 resize-none"
                                                        placeholder="Add grading justifications or feedback for the student..."
                                                    />
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button 
                                                        onClick={() => handleSaveGrade(submission.id)}
                                                        disabled={saving}
                                                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-md h-10 px-5 flex items-center gap-1.5"
                                                    >
                                                        {saving ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <Save className="w-4 h-4" />
                                                        )}
                                                        Save Grade
                                                    </Button>
                                                    <Button 
                                                        onClick={handleCancelEdit}
                                                        variant="outline"
                                                        disabled={saving}
                                                        className="border-slate-200 font-semibold rounded-xl h-10 px-5"
                                                    >
                                                        Cancel
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-white/80 dark:bg-slate-900/80 p-4 rounded-xl border border-slate-200/40 dark:border-slate-800/40 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div>
                                                {submission.status === 'ManuallyGraded' && (
                                                    <div className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                                                        <span>Manual evaluation: {submission.reviewedBy || submission.gradedBy}</span>
                                                        {submission.originalAiScore !== null && submission.originalAiScore !== undefined && (
                                                            <span className="ml-3 text-slate-400 font-normal">
                                                                (Auto AI Score: {submission.originalAiScore}/100)
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                                {submission.instructorNotes && (
                                                    <div className="mt-2 p-3 bg-purple-500/10 rounded-xl border border-purple-500/20 text-xs text-purple-800 dark:text-purple-400 leading-relaxed max-w-2xl">
                                                        <strong>Feedback:</strong> {submission.instructorNotes}
                                                    </div>
                                                )}
                                            </div>
                                            <Button 
                                                onClick={() => handleStartEdit(submission)}
                                                variant="outline"
                                                size="sm"
                                                className="border-slate-200 font-bold rounded-xl h-9 px-4 self-start sm:self-auto text-xs"
                                            >
                                                <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                                                {submission.score !== null ? 'Modify Assessment' : 'Add Evaluation'}
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
                        <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="text-xs font-semibold text-slate-500">
                                Page {currentPage} of {totalPages} ({totalCount} items)
                            </div>
                            <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1 || loading}
                                    className="h-9 border-slate-200 font-bold rounded-xl"
                                >
                                    <ChevronLeft className="w-4 h-4 mr-1" />
                                    Previous
                                </Button>
                                
                                {/* Page numbers */}
                                <div className="hidden sm:flex gap-1">
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
                                                className={`w-9 h-9 p-0 rounded-xl font-bold text-xs ${currentPage === pageNum ? 'bg-indigo-600 text-white' : 'border-slate-200'}`}
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
                                    className="h-9 border-slate-200 font-bold rounded-xl"
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
