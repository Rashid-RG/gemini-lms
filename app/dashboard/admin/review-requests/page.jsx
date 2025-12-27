"use client"
import React, { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import axios from 'axios'
import { Button } from '@/components/ui/button'
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
    Square,
    Trash2
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
            case 'code': return <Code className="w-4 h-4" />
            case 'document': return <FileText className="w-4 h-4" />
            default: return <MessageSquare className="w-4 h-4" />
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
        <div className="p-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/10 rounded-xl">
                        <ClipboardCheck className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Assignment Review Requests</h1>
                        <p className="text-gray-500">Review and grade student submissions</p>
                    </div>
                </div>
                <Button onClick={fetchReviewRequests} variant="outline" className="gap-2">
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

                            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <Clock className="w-8 h-8 text-yellow-600" />
                        <div>
                            <p className="text-2xl font-bold text-yellow-700">{reviewRequests.length}</p>
                            <p className="text-sm text-yellow-600">Total Pending</p>
                        </div>
                    </div>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-8 h-8 text-orange-600" />
                        <div>
                            <p className="text-2xl font-bold text-orange-700">
                                {reviewRequests.filter(r => r.status === 'PendingReview').length}
                            </p>
                            <p className="text-sm text-orange-600">AI Failed</p>
                        </div>
                    </div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <User className="w-8 h-8 text-blue-600" />
                        <div>
                            <p className="text-2xl font-bold text-blue-700">
                                {reviewRequests.filter(r => r.reviewRequested === true).length}
                            </p>
                            <p className="text-sm text-blue-600">User Requested</p>
                        </div>
                    </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <BookOpen className="w-8 h-8 text-green-600" />
                        <div>
                            <p className="text-2xl font-bold text-green-700">
                                {new Set(reviewRequests.map(r => r.courseId)).size}
                            </p>
                            <p className="text-sm text-green-600">Courses Affected</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Review Requests List */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : reviewRequests.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-xl">
                    <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
                    <h2 className="text-xl font-semibold text-gray-700">All Caught Up!</h2>
                    <p className="text-gray-500 mt-2">No pending review requests at the moment.</p>
                </div>
            ) : (
                <>
                    {/* Bulk Actions Toolbar */}
                    <div className="mb-4 p-3 bg-gray-100 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={toggleSelectAll}
                                className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-primary"
                            >
                                {selectedIds.size === reviewRequests.length ? (
                                    <CheckSquare className="w-5 h-5 text-primary" />
                                ) : (
                                    <Square className="w-5 h-5" />
                                )}
                                {selectedIds.size === reviewRequests.length ? 'Deselect All' : 'Select All'}
                            </button>
                            {selectedIds.size > 0 && (
                                <span className="text-sm text-gray-500">
                                    {selectedIds.size} selected
                                </span>
                            )}
                        </div>
                        
                        {selectedIds.size > 0 && (
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setBulkAction('keep-ai')
                                        setShowBulkModal(true)
                                    }}
                                    className="text-green-600 border-green-300 hover:bg-green-50"
                                >
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    Keep AI Grades
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setBulkAction('grade')
                                        setShowBulkModal(true)
                                    }}
                                    className="text-blue-600 border-blue-300 hover:bg-blue-50"
                                >
                                    <ClipboardCheck className="w-4 h-4 mr-1" />
                                    Bulk Grade
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setBulkAction('dismiss')
                                        setShowBulkModal(true)
                                    }}
                                    className="text-orange-600 border-orange-300 hover:bg-orange-50"
                                >
                                    <XCircle className="w-4 h-4 mr-1" />
                                    Dismiss All
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Bulk Action Modal */}
                    {showBulkModal && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
                                <h3 className="text-lg font-bold mb-4">
                                    {bulkAction === 'grade' && 'Bulk Grade Submissions'}
                                    {bulkAction === 'dismiss' && 'Dismiss Selected'}
                                    {bulkAction === 'keep-ai' && 'Keep AI Grades'}
                                </h3>
                                
                                <p className="text-gray-600 mb-4">
                                    This will affect <strong>{selectedIds.size}</strong> submissions.
                                </p>

                                {bulkAction === 'grade' && (
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Score for all selected (0-100)
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={bulkScore}
                                            onChange={(e) => setBulkScore(e.target.value)}
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                                            placeholder="Enter score..."
                                        />
                                    </div>
                                )}

                                {bulkAction === 'keep-ai' && (
                                    <p className="text-sm text-gray-500 mb-4">
                                        This will approve the AI grades for all selected submissions and clear their review requests.
                                    </p>
                                )}

                                {bulkAction === 'dismiss' && (
                                    <p className="text-sm text-orange-600 mb-4">
                                        ⚠️ This will dismiss review requests and keep the current grades.
                                    </p>
                                )}

                                <div className="flex gap-2 justify-end">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setShowBulkModal(false)
                                            setBulkAction('')
                                            setBulkScore('')
                                        }}
                                        disabled={bulkProcessing}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleBulkAction}
                                        disabled={bulkProcessing}
                                        className={
                                            bulkAction === 'grade' ? 'bg-blue-600 hover:bg-blue-700' :
                                            bulkAction === 'keep-ai' ? 'bg-green-600 hover:bg-green-700' :
                                            'bg-orange-600 hover:bg-orange-700'
                                        }
                                    >
                                        {bulkProcessing ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                Processing...
                                            </>
                                        ) : (
                                            'Confirm'
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                <div className="space-y-4">
                    {reviewRequests.map((request) => (
                        <div key={request.id} className="bg-white border rounded-xl shadow-sm overflow-hidden">
                            {/* Request Header */}
                            <div 
                                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-center justify-between">
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
                                                <CheckSquare className="w-5 h-5 text-primary" />
                                            ) : (
                                                <Square className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                                            )}
                                        </button>
                                        
                                        <div 
                                            className={`p-2 rounded-lg ${request.status === 'PendingReview' ? 'bg-orange-100' : 'bg-blue-100'}`}
                                            onClick={() => setExpandedId(expandedId === request.id ? null : request.id)}
                                        >
                                            <AlertCircle className={`w-5 h-5 ${request.status === 'PendingReview' ? 'text-orange-600' : 'text-blue-600'}`} />
                                        </div>
                                        <div onClick={() => setExpandedId(expandedId === request.id ? null : request.id)}>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold text-gray-800">
                                                    {request.assignment?.title || 'Assignment'}
                                                </h3>
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                                    request.status === 'PendingReview' 
                                                        ? 'bg-orange-100 text-orange-700' 
                                                        : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                    {request.status === 'PendingReview' ? 'AI Failed' : 'User Request'}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-500">
                                                {request.course?.topic || 'Unknown Course'}
                                            </p>
                                        </div>
                                    </div>
                                    <div 
                                        className="flex items-center gap-4"
                                        onClick={() => setExpandedId(expandedId === request.id ? null : request.id)}
                                    >
                                        <div className="text-right">
                                            <p className="text-sm font-medium text-gray-700">
                                                {request.student?.name || request.studentEmail}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                AI Score: <span className="font-bold text-primary">{request.score}/100</span>
                                            </p>
                                        </div>
                                        {expandedId === request.id ? (
                                            <ChevronUp className="w-5 h-5 text-gray-400" />
                                        ) : (
                                            <ChevronDown className="w-5 h-5 text-gray-400" />
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Expanded Content */}
                            {expandedId === request.id && (
                                <div className="border-t bg-gray-50 p-4">
                                    {/* Request Details */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <div className="bg-white p-4 rounded-lg border">
                                            <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                                                <Calendar className="w-4 h-4" /> Request Details
                                            </h4>
                                            <div className="space-y-1 text-sm">
                                                <p><span className="text-gray-500">Submitted:</span> {formatDate(request.submittedAt)}</p>
                                                <p><span className="text-gray-500">Review Requested:</span> {formatDate(request.reviewRequestedAt)}</p>
                                                <p className="flex items-center gap-1">
                                                    <span className="text-gray-500">Type:</span> 
                                                    {getSubmissionTypeIcon(request.submissionType)}
                                                    {request.submissionType}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="bg-white p-4 rounded-lg border">
                                            <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                                                <MessageSquare className="w-4 h-4" /> 
                                                {request.status === 'PendingReview' ? 'Review Reason' : "Student's Reason"}
                                            </h4>
                                            <p className="text-sm text-gray-600 italic">
                                                "{request.status === 'PendingReview' 
                                                    ? 'AI grading was temporarily unavailable. Manual review required.' 
                                                    : (request.reviewReason || 'No reason provided')}"
                                            </p>
                                        </div>
                                    </div>

                                    {/* Submission Content */}
                                    <div className="bg-white p-4 rounded-lg border mb-4">
                                        <h4 className="font-medium text-gray-700 mb-2">Student Submission</h4>
                                        <div className={`p-3 rounded-lg max-h-60 overflow-y-auto ${
                                            request.submissionType === 'code' 
                                                ? 'bg-gray-900 text-green-400 font-mono text-sm' 
                                                : 'bg-gray-100 text-gray-700'
                                        }`}>
                                            <pre className="whitespace-pre-wrap">{request.submission}</pre>
                                        </div>
                                    </div>

                                    {/* AI Feedback */}
                                    <div className="bg-white p-4 rounded-lg border mb-4">
                                        <h4 className="font-medium text-gray-700 mb-2">AI Feedback</h4>
                                        <p className="text-sm text-gray-600">{request.feedback || 'No feedback available'}</p>
                                        {request.strengths && request.strengths.length > 0 && (
                                            <div className="mt-2">
                                                <p className="text-xs font-medium text-green-600 mb-1">Strengths:</p>
                                                <ul className="text-xs text-gray-600 list-disc list-inside">
                                                    {request.strengths.map((s, i) => <li key={i}>{s}</li>)}
                                                </ul>
                                            </div>
                                        )}
                                        {request.improvements && request.improvements.length > 0 && (
                                            <div className="mt-2">
                                                <p className="text-xs font-medium text-orange-600 mb-1">Areas for Improvement:</p>
                                                <ul className="text-xs text-gray-600 list-disc list-inside">
                                                    {request.improvements.map((s, i) => <li key={i}>{s}</li>)}
                                                </ul>
                                            </div>
                                        )}
                                    </div>

                                    {/* Review Form */}
                                    {reviewingId === request.id ? (
                                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                            <h4 className="font-medium text-blue-800 mb-3">Submit Your Review</h4>
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        New Score (0-100)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        value={newScore}
                                                        onChange={(e) => setNewScore(e.target.value)}
                                                        className="w-full p-2 border rounded-lg"
                                                        placeholder={`Current AI Score: ${request.score}`}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Instructor Notes (Optional)
                                                    </label>
                                                    <textarea
                                                        value={instructorNotes}
                                                        onChange={(e) => setInstructorNotes(e.target.value)}
                                                        className="w-full p-2 border rounded-lg"
                                                        rows={3}
                                                        placeholder="Explain your grade adjustment..."
                                                    />
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button 
                                                        onClick={() => handleSubmitReview(request.id)}
                                                        disabled={submitting}
                                                        className="gap-2"
                                                    >
                                                        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                                        Submit Review
                                                    </Button>
                                                    <Button 
                                                        variant="outline" 
                                                        onClick={() => {
                                                            setReviewingId(null)
                                                            setNewScore('')
                                                            setInstructorNotes('')
                                                        }}
                                                    >
                                                        Cancel
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex gap-2">
                                            <Button 
                                                onClick={() => {
                                                    setReviewingId(request.id)
                                                    setNewScore(request.score?.toString() || '')
                                                }}
                                                className="gap-2"
                                            >
                                                <ClipboardCheck className="w-4 h-4" />
                                                Update Grade
                                            </Button>
                                            <Button 
                                                variant="outline"
                                                onClick={() => handleDismissReview(request.id)}
                                                disabled={submitting}
                                                className="gap-2 text-orange-600 border-orange-300 hover:bg-orange-50"
                                            >
                                                <XCircle className="w-4 h-4" />
                                                Dismiss (Keep AI Grade)
                                            </Button>
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
