"use client"
import React, { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import axios from 'axios'
import { 
    ClipboardCheck, 
    AlertCircle, 
    User, 
    BookOpen, 
    Calendar, 
    MessageSquare,
    CheckCircle,
    XCircle,
    Clock,
    FileText,
    Code,
    ChevronDown,
    ChevronUp,
    Loader2,
    RefreshCw,
    CheckSquare,
    Square
} from 'lucide-react'
import { toast } from 'sonner'

function AdminReviewPage() {
    const { user, isLoaded } = useUser()
    const [reviewRequests, setReviewRequests] = useState([])
    const [loading, setLoading] = useState(true)
    const [expandedId, setExpandedId] = useState(null)
    const [reviewingId, setReviewingId] = useState(null)
    const [newScore, setNewScore] = useState('')
    const [instructorNotes, setInstructorNotes] = useState('')
    const [submitting, setSubmitting] = useState(false)
    
    // Bulk action state
    const [selectedIds, setSelectedIds] = useState(new Set())
    const [bulkAction, setBulkAction] = useState('')
    const [bulkScore, setBulkScore] = useState('')
    const [showBulkModal, setShowBulkModal] = useState(false)
    const [bulkProcessing, setBulkProcessing] = useState(false)

    const userEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase()
    const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
    const isAdmin = userEmail && adminEmails.includes(userEmail)

    useEffect(() => {
        if (isLoaded && isAdmin) {
            fetchReviewRequests()
        }
    }, [isLoaded, isAdmin])

    const fetchReviewRequests = async () => {
        try {
            setLoading(true)
            const response = await axios.get('/api/admin/review-requests')
            setReviewRequests(response.data.result || [])
        } catch (error) {
            console.error('Error fetching review requests:', error)
            toast.error('Failed to load review requests')
        } finally {
            setLoading(false)
        }
    }

    const handleSubmitReview = async (submissionId) => {
        if (!newScore || isNaN(parseInt(newScore))) {
            toast.error('Please enter a valid score')
            return
        }

        try {
            setSubmitting(true)
            await axios.post('/api/admin/review-requests', {
                submissionId,
                newScore: parseInt(newScore),
                instructorNotes,
                adminEmail: userEmail
            })
            toast.success('Review submitted successfully!')
            setReviewingId(null)
            setNewScore('')
            setInstructorNotes('')
            fetchReviewRequests()
        } catch (error) {
            console.error('Error submitting review:', error)
            toast.error('Failed to submit review')
        } finally {
            setSubmitting(false)
        }
    }

    const handleDismissReview = async (submissionId) => {
        try {
            setSubmitting(true)
            await axios.delete('/api/admin/review-requests', {
                data: {
                    submissionId,
                    adminEmail: userEmail,
                    dismissReason: 'AI grade confirmed by instructor'
                }
            })
            toast.success('Review request dismissed')
            fetchReviewRequests()
        } catch (error) {
            console.error('Error dismissing review:', error)
            toast.error('Failed to dismiss review')
        } finally {
            setSubmitting(false)
        }
    }

    // Bulk selection handlers
    const toggleSelectAll = () => {
        if (selectedIds.size === reviewRequests.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(reviewRequests.map(r => r.id)))
        }
    }

    const toggleSelect = (id) => {
        const newSelected = new Set(selectedIds)
        if (newSelected.has(id)) {
            newSelected.delete(id)
        } else {
            newSelected.add(id)
        }
        setSelectedIds(newSelected)
    }

    // Bulk action handlers
    const handleBulkAction = async () => {
        if (selectedIds.size === 0) {
            toast.error('No items selected')
            return
        }

        if (bulkAction === 'grade' && (!bulkScore || isNaN(parseInt(bulkScore)))) {
            toast.error('Please enter a valid score')
            return
        }

        setBulkProcessing(true)
        let successCount = 0
        let errorCount = 0

        const selectedSubmissions = reviewRequests.filter(r => selectedIds.has(r.id))

        for (const submission of selectedSubmissions) {
            try {
                if (bulkAction === 'dismiss') {
                    await axios.delete('/api/admin/review-requests', {
                        data: {
                            submissionId: submission.id,
                            adminEmail: userEmail,
                            dismissReason: 'Bulk dismissed - AI grade confirmed'
                        }
                    })
                } else if (bulkAction === 'grade') {
                    await axios.post('/api/admin/review-requests', {
                        submissionId: submission.id,
                        newScore: parseInt(bulkScore),
                        instructorNotes: `Bulk graded by admin`,
                        adminEmail: userEmail
                    })
                } else if (bulkAction === 'keep-ai') {
                    // Keep AI grade - just dismiss without changing score
                    await axios.delete('/api/admin/review-requests', {
                        data: {
                            submissionId: submission.id,
                            adminEmail: userEmail,
                            dismissReason: 'Bulk approved - AI grade kept'
                        }
                    })
                }
                successCount++
            } catch (error) {
                console.error(`Error processing submission ${submission.id}:`, error)
                errorCount++
            }
        }

        setBulkProcessing(false)
        setShowBulkModal(false)
        setBulkAction('')
        setBulkScore('')
        setSelectedIds(new Set())
        
        if (successCount > 0) {
            toast.success(`Successfully processed ${successCount} submissions`)
        }
        if (errorCount > 0) {
            toast.error(`Failed to process ${errorCount} submissions`)
        }
        
        fetchReviewRequests()
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

    const getSubmissionTypeIcon = (type) => {
        switch (type) {
            case 'code': return <Code className="w-4 h-4 text-indigo-500" />
            case 'document': return <FileText className="w-4 h-4 text-indigo-500" />
            default: return <MessageSquare className="w-4 h-4 text-indigo-500" />
        }
    }

    if (!isLoaded) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
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
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="relative overflow-hidden backdrop-blur-md bg-white/70 border border-slate-200/50 shadow-sm rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="absolute -right-20 -top-20 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -left-20 -bottom-20 w-48 h-48 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="flex items-center gap-4 relative z-10">
                    <div className="p-3.5 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl text-white shadow-lg shadow-indigo-500/20">
                        <ClipboardCheck className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Assignment Review Requests</h1>
                        <p className="text-slate-500 text-sm mt-0.5">Review and grade pending student lock-state assignments</p>
                    </div>
                </div>
                <div className="flex gap-3 relative z-10">
                    <button 
                        onClick={fetchReviewRequests} 
                        className="flex items-center justify-center px-4 py-2.5 bg-white/80 border border-slate-200/60 rounded-xl text-slate-700 font-medium text-sm hover:bg-slate-50 active:scale-[0.98] transition-all duration-200"
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="backdrop-blur-md bg-white/70 border border-amber-200/50 shadow-sm rounded-2xl p-5 hover:shadow-md transition-all duration-300 relative overflow-hidden group">
                    <div className="flex items-center gap-3.5">
                        <div className="p-3 bg-amber-50 border border-amber-200/50 rounded-xl text-amber-600">
                            <Clock className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-2xl font-extrabold text-slate-800 tracking-tight">{reviewRequests.length}</p>
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Pending</p>
                        </div>
                    </div>
                </div>
                <div className="backdrop-blur-md bg-white/70 border border-rose-200/50 shadow-sm rounded-2xl p-5 hover:shadow-md transition-all duration-300 relative overflow-hidden group">
                    <div className="flex items-center gap-3.5">
                        <div className="p-3 bg-rose-50 border border-rose-200/50 rounded-xl text-rose-600">
                            <AlertCircle className="w-6 h-6 animate-pulse" />
                        </div>
                        <div>
                            <p className="text-2xl font-extrabold text-slate-800 tracking-tight">
                                {reviewRequests.filter(r => r.status === 'PendingReview').length}
                            </p>
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">AI Failed</p>
                        </div>
                    </div>
                </div>
                <div className="backdrop-blur-md bg-white/70 border border-indigo-200/50 shadow-sm rounded-2xl p-5 hover:shadow-md transition-all duration-300 relative overflow-hidden group">
                    <div className="flex items-center gap-3.5">
                        <div className="p-3 bg-indigo-50 border border-indigo-200/50 rounded-xl text-indigo-600">
                            <User className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-2xl font-extrabold text-slate-800 tracking-tight">
                                {reviewRequests.filter(r => r.reviewRequested === true).length}
                            </p>
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">User Requested</p>
                        </div>
                    </div>
                </div>
                <div className="backdrop-blur-md bg-white/70 border border-emerald-200/50 shadow-sm rounded-2xl p-5 hover:shadow-md transition-all duration-300 relative overflow-hidden group">
                    <div className="flex items-center gap-3.5">
                        <div className="p-3 bg-emerald-50 border border-emerald-200/50 rounded-xl text-emerald-600">
                            <BookOpen className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-2xl font-extrabold text-slate-800 tracking-tight">
                                {new Set(reviewRequests.map(r => r.courseId)).size}
                            </p>
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Courses Affected</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Review Requests List */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                </div>
            ) : reviewRequests.length === 0 ? (
                <div className="backdrop-blur-md bg-white/70 border border-slate-200/50 shadow-sm rounded-2xl p-10 text-center py-20">
                    <CheckCircle className="w-12 h-12 mx-auto text-emerald-500 mb-4" />
                    <h2 className="text-lg font-bold text-slate-800">All caught up!</h2>
                    <p className="text-slate-500 text-xs mt-1">No pending grading reviews are currently awaiting decision.</p>
                </div>
            ) : (
                <>
                    {/* Bulk Actions Toolbar */}
                    <div className="backdrop-blur-md bg-white/50 border border-slate-200/60 shadow-sm rounded-xl p-3 flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={toggleSelectAll}
                                className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-indigo-600 transition-colors"
                            >
                                {selectedIds.size === reviewRequests.length ? (
                                    <CheckSquare className="w-4.5 h-4.5 text-indigo-600" />
                                ) : (
                                    <Square className="w-4.5 h-4.5 text-slate-400" />
                                )}
                                {selectedIds.size === reviewRequests.length ? 'Deselect All' : 'Select All'}
                            </button>
                            {selectedIds.size > 0 && (
                                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                    {selectedIds.size} selected
                                </span>
                            )}
                        </div>
                        
                        {selectedIds.size > 0 && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        setBulkAction('keep-ai')
                                        setShowBulkModal(true)
                                    }}
                                    className="px-3 py-1.5 border border-emerald-200 bg-emerald-50 text-emerald-600 font-bold rounded-lg text-xs hover:bg-emerald-100 transition-all flex items-center gap-1"
                                >
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    Keep AI Grades
                                </button>
                                <button
                                    onClick={() => {
                                        setBulkAction('grade')
                                        setShowBulkModal(true)
                                    }}
                                    className="px-3 py-1.5 border border-indigo-200 bg-indigo-50 text-indigo-600 font-bold rounded-lg text-xs hover:bg-indigo-100 transition-all flex items-center gap-1"
                                >
                                    <ClipboardCheck className="w-3.5 h-3.5" />
                                    Bulk Grade
                                </button>
                                <button
                                    onClick={() => {
                                        setBulkAction('dismiss')
                                        setShowBulkModal(true)
                                    }}
                                    className="px-3 py-1.5 border border-rose-200 bg-rose-50 text-rose-600 font-bold rounded-lg text-xs hover:bg-rose-100 transition-all flex items-center gap-1"
                                >
                                    <XCircle className="w-3.5 h-3.5" />
                                    Dismiss All
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Bulk Action Modal */}
                    {showBulkModal && (
                        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                            <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-slate-200/60 shadow-2xl space-y-4">
                                <h3 className="text-base font-bold text-slate-800">
                                    {bulkAction === 'grade' && 'Bulk Grade Submissions'}
                                    {bulkAction === 'dismiss' && 'Dismiss Selected Review'}
                                    {bulkAction === 'keep-ai' && 'Keep Current AI Grades'}
                                </h3>
                                
                                <p className="text-xs text-slate-500">
                                    This operation will be applied to <strong className="text-slate-700">{selectedIds.size}</strong> selected items.
                                </p>

                                {bulkAction === 'grade' && (
                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                                            Score for all selected (0-100)
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={bulkScore}
                                            onChange={(e) => setBulkScore(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring focus:ring-indigo-500/20 transition-all outline-none text-slate-800 placeholder-slate-400 text-sm"
                                            placeholder="Enter score value..."
                                        />
                                    </div>
                                )}

                                {bulkAction === 'keep-ai' && (
                                    <p className="text-xs text-slate-500 leading-relaxed">
                                        This will batch-confirm all selected AI marks and clean their respective audit triggers without making changes to the scores.
                                    </p>
                                )}

                                {bulkAction === 'dismiss' && (
                                    <p className="text-xs text-rose-600 leading-relaxed font-semibold">
                                        ⚠️ Warning: This will dismiss selected reviews. The current AI scores will be preserved.
                                    </p>
                                )}

                                <div className="flex gap-2.5 justify-end pt-3 border-t border-slate-100">
                                    <button
                                        onClick={() => {
                                            setShowBulkModal(false)
                                            setBulkAction('')
                                            setBulkScore('')
                                        }}
                                        disabled={bulkProcessing}
                                        className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-xs font-bold transition-all active:scale-[0.98]"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleBulkAction}
                                        disabled={bulkProcessing}
                                        className={`px-4 py-2 text-white font-bold rounded-lg text-xs shadow-sm transition-all active:scale-[0.98] ${
                                            bulkAction === 'grade' ? 'bg-indigo-600 hover:bg-indigo-500' :
                                            bulkAction === 'keep-ai' ? 'bg-emerald-600 hover:bg-emerald-500' :
                                            'bg-rose-600 hover:bg-rose-500'
                                        }`}
                                    >
                                        {bulkProcessing ? (
                                            <>
                                                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5 inline text-white" />
                                                Processing...
                                            </>
                                        ) : (
                                            'Confirm'
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        {reviewRequests.map((request) => (
                            <div key={request.id} className="backdrop-blur-md bg-white/70 border border-slate-200/50 shadow-sm rounded-xl overflow-hidden hover:shadow-md transition-all duration-300">
                                {/* Request Header */}
                                <div 
                                    className="p-4 cursor-pointer hover:bg-slate-50/40 transition-colors"
                                    onClick={() => setExpandedId(expandedId === request.id ? null : request.id)}
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex items-center gap-4">
                                            {/* Checkbox */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    toggleSelect(request.id)
                                                }}
                                                className="flex-shrink-0"
                                            >
                                                {selectedIds.has(request.id) ? (
                                                    <CheckSquare className="w-5 h-5 text-indigo-600" />
                                                ) : (
                                                    <Square className="w-5 h-5 text-slate-300 hover:text-slate-400" />
                                                )}
                                            </button>
                                            
                                            <div 
                                                className={`p-2 rounded-xl border ${
                                                    request.status === 'PendingReview' 
                                                        ? 'bg-amber-50 border-amber-200/50 text-amber-600' 
                                                        : 'bg-indigo-50 border-indigo-200/50 text-indigo-600'
                                                }`}
                                            >
                                                <AlertCircle className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="font-bold text-slate-800 text-sm">
                                                        {request.assignment?.title || 'Assignment'}
                                                    </h3>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                                                        request.status === 'PendingReview' 
                                                            ? 'bg-amber-50 border-amber-200/50 text-amber-700' 
                                                            : 'bg-indigo-50 border-indigo-200/50 text-indigo-700'
                                                    }`}>
                                                        {request.status === 'PendingReview' ? 'AI Failed' : 'User Requested'}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-400 font-semibold mt-0.5">
                                                    {request.course?.topic || 'Unknown Course'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 self-end sm:self-center">
                                            <div className="text-right">
                                                <p className="text-xs font-bold text-slate-700">
                                                    {request.student?.name || request.studentEmail}
                                                </p>
                                                <p className="text-xs text-slate-400 mt-0.5 font-medium">
                                                    AI Score: <span className="font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200/40">{request.score}/100</span>
                                                </p>
                                            </div>
                                            {expandedId === request.id ? (
                                                <ChevronUp className="w-5 h-5 text-slate-400" />
                                            ) : (
                                                <ChevronDown className="w-5 h-5 text-slate-400" />
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Content */}
                                {expandedId === request.id && (
                                    <div className="border-t border-slate-100 bg-slate-50/50 p-5 space-y-4">
                                        {/* Request Details */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="bg-white/80 p-4 rounded-xl border border-slate-200/40 shadow-sm space-y-2">
                                                <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 uppercase tracking-wider text-slate-400">
                                                    <Calendar className="w-4 h-4 text-indigo-500" /> Request Details
                                                </h4>
                                                <div className="space-y-1.5 text-xs font-semibold text-slate-600">
                                                    <p><span className="text-slate-400 font-medium">Submitted:</span> {formatDate(request.submittedAt)}</p>
                                                    <p><span className="text-slate-400 font-medium">Review Requested:</span> {formatDate(request.reviewRequestedAt)}</p>
                                                    <p className="flex items-center gap-1.5 capitalize">
                                                        <span className="text-slate-400 font-medium">Type:</span> 
                                                        {getSubmissionTypeIcon(request.submissionType)}
                                                        {request.submissionType}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="bg-white/80 p-4 rounded-xl border border-slate-200/40 shadow-sm space-y-2">
                                                <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 uppercase tracking-wider text-slate-400">
                                                    <MessageSquare className="w-4 h-4 text-indigo-500" /> 
                                                    {request.status === 'PendingReview' ? 'Review Reason' : "Student's Reason"}
                                                </h4>
                                                <p className="text-xs text-slate-600 italic leading-relaxed">
                                                    "{request.status === 'PendingReview' 
                                                        ? 'AI grading was temporarily unavailable. Manual review required.' 
                                                        : (request.reviewReason || 'No reason provided')}"
                                                </p>
                                            </div>
                                        </div>

                                        {/* Submission Content */}
                                        <div className="bg-white/85 p-4 rounded-xl border border-slate-200/40 shadow-sm space-y-2">
                                            <h4 className="font-bold text-slate-800 text-xs">Student Submission</h4>
                                            <div className={`p-3.5 rounded-xl max-h-60 overflow-y-auto border ${
                                                request.submissionType === 'code' 
                                                    ? 'bg-slate-950 text-emerald-400 font-mono text-xs border-slate-900 shadow-inner' 
                                                    : 'bg-white text-slate-700 border-slate-200 text-xs'
                                            }`}>
                                                <pre className="whitespace-pre-wrap">{request.submission}</pre>
                                            </div>
                                        </div>

                                        {/* AI Feedback */}
                                        <div className="bg-white/85 p-4 rounded-xl border border-slate-200/40 shadow-sm space-y-2.5">
                                            <h4 className="font-bold text-slate-800 text-xs">AI Evaluation Feedback</h4>
                                            <p className="text-xs text-slate-600 leading-relaxed font-medium">{request.feedback || 'No evaluation feedback available'}</p>
                                            {request.strengths && request.strengths.length > 0 && (
                                                <div className="mt-2 pt-2 border-t border-slate-100">
                                                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide mb-1">Strengths:</p>
                                                    <ul className="text-xs text-slate-600 list-disc list-inside space-y-0.5 font-medium">
                                                        {request.strengths.map((s, i) => <li key={i}>{s}</li>)}
                                                    </ul>
                                                </div>
                                            )}
                                            {request.improvements && request.improvements.length > 0 && (
                                                <div className="mt-2 pt-2 border-t border-slate-100">
                                                    <p className="text-[10px] font-bold text-orange-600 uppercase tracking-wide mb-1">Areas for Improvement:</p>
                                                    <ul className="text-xs text-slate-600 list-disc list-inside space-y-0.5 font-medium">
                                                        {request.improvements.map((s, i) => <li key={i}>{s}</li>)}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>

                                        {/* Review Form */}
                                        {reviewingId === request.id ? (
                                            <div className="bg-indigo-50/40 border border-indigo-200/50 p-5 rounded-xl space-y-4">
                                                <h4 className="font-bold text-indigo-950 text-sm">Adjust Grade & Submit Review</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <div className="space-y-1.5">
                                                        <label className="block text-xs font-bold text-slate-600">
                                                            New Score (0-100)
                                                        </label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="100"
                                                            value={newScore}
                                                            onChange={(e) => setNewScore(e.target.value)}
                                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:border-indigo-500 focus:ring focus:ring-indigo-500/20 transition-all outline-none text-slate-800 text-sm font-bold"
                                                            placeholder={`Current: ${request.score}`}
                                                        />
                                                    </div>
                                                    <div className="md:col-span-2 space-y-1.5">
                                                        <label className="block text-xs font-bold text-slate-600">
                                                            Instructor Notes / Feedback (Optional)
                                                        </label>
                                                        <input
                                                            value={instructorNotes}
                                                            onChange={(e) => setInstructorNotes(e.target.value)}
                                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:border-indigo-500 focus:ring focus:ring-indigo-500/20 transition-all outline-none text-slate-800 text-sm"
                                                            placeholder="Explain details of this grade adjustment..."
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={() => handleSubmitReview(request.id)}
                                                        disabled={submitting}
                                                        className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-lg text-xs shadow-md shadow-indigo-600/10 active:scale-[0.98] transition-all flex items-center gap-1.5"
                                                    >
                                                        {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                                        Confirm & Update
                                                    </button>
                                                    <button 
                                                        onClick={() => {
                                                            setReviewingId(null)
                                                            setNewScore('')
                                                            setInstructorNotes('')
                                                        }}
                                                        className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-xs font-bold transition-all active:scale-[0.98]"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex gap-2 pt-2">
                                                <button 
                                                    onClick={() => {
                                                        setReviewingId(request.id)
                                                        setNewScore(request.score?.toString() || '')
                                                    }}
                                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-600/10 active:scale-[0.98] transition-all flex items-center gap-1"
                                                >
                                                    <ClipboardCheck className="w-3.5 h-3.5" />
                                                    Adjust Grade
                                                </button>
                                                <button 
                                                    onClick={() => handleDismissReview(request.id)}
                                                    disabled={submitting}
                                                    className="px-4 py-2 border border-rose-200/50 bg-rose-50 text-rose-600 font-bold rounded-xl text-xs hover:bg-rose-100 transition-all flex items-center gap-1"
                                                >
                                                    <XCircle className="w-3.5 h-3.5" />
                                                    Keep AI Grade
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}

export default AdminReviewPage
