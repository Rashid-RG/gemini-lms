"use client"
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useAdminAuth } from '@/app/_context/AdminAuthContext'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { 
    MessageSquare, 
    Loader2, 
    RefreshCw, 
    Search,
    CheckCircle,
    XCircle,
    Clock,
    Star,
    Eye,
    ThumbsUp,
    ThumbsDown,
    Calendar,
    User,
    Wifi,
    WifiOff
} from 'lucide-react'
import { toast } from 'sonner'

// Real-time polling interval (15 seconds)
const POLL_INTERVAL = 15000

function ReviewRequestsPage() {
    const { admin, loading: authLoading } = useAdminAuth()
    const [requests, setRequests] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('pending')
    const [selectedRequest, setSelectedRequest] = useState(null)
    const [actionLoading, setActionLoading] = useState(null)
    const [feedback, setFeedback] = useState('')
    const [newScore, setNewScore] = useState('')
    const [isLive, setIsLive] = useState(true)
    const [lastUpdated, setLastUpdated] = useState(null)
    const pollIntervalRef = useRef(null)

    const fetchRequests = useCallback(async (showLoading = false) => {
        try {
            if (showLoading) setLoading(true)
            const response = await axios.get('/api/admin/review-requests', {
                params: {
                    status: statusFilter !== 'all' ? statusFilter : undefined
                }
            })
            const newRequests = response.data.requests || []
            
            // Notify if new pending requests
            if (requests.length > 0 && statusFilter === 'pending') {
                const newCount = newRequests.length - requests.length
                if (newCount > 0) {
                    toast.info(`${newCount} new review request${newCount > 1 ? 's' : ''}!`)
                }
            }
            
            setRequests(newRequests)
            setLastUpdated(new Date())
        } catch (error) {
            console.error('Error fetching review requests:', error)
            if (showLoading) toast.error('Failed to load review requests')
        } finally {
            if (showLoading) setLoading(false)
        }
    }, [statusFilter, requests.length])

    // Initial fetch
    useEffect(() => {
        if (!authLoading && admin) {
            fetchRequests(true)
        }
    }, [authLoading, admin, statusFilter])

    // Real-time polling
    useEffect(() => {
        if (!authLoading && admin && isLive) {
            pollIntervalRef.current = setInterval(() => {
                fetchRequests(false)
            }, POLL_INTERVAL)
        }
        
        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current)
            }
        }
    }, [authLoading, admin, isLive, fetchRequests])

    const handleApprove = async (requestId) => {
        if (!newScore || isNaN(parseInt(newScore)) || parseInt(newScore) < 0 || parseInt(newScore) > 100) {
            toast.error('Please enter a valid score between 0 and 100')
            return
        }
        try {
            setActionLoading(requestId)
            await axios.post('/api/admin/review-requests', {
                submissionId: requestId,
                newScore: parseInt(newScore),
                instructorNotes: feedback || null
            })
            toast.success('Review submitted successfully! Score updated.')
            setSelectedRequest(null)
            setFeedback('')
            setNewScore('')
            fetchRequests()
        } catch (error) {
            console.error('Error submitting review:', error)
            toast.error('Failed to submit review')
        } finally {
            setActionLoading(null)
        }
    }

    const handleReject = async (requestId) => {
        if (!feedback.trim()) {
            toast.error('Please provide a reason for dismissing the review request')
            return
        }
        try {
            setActionLoading(requestId)
            await axios.delete('/api/admin/review-requests', {
                data: {
                    submissionId: requestId,
                    dismissReason: feedback
                }
            })
            toast.success('Review request dismissed - AI grade confirmed')
            setSelectedRequest(null)
            setFeedback('')
            setNewScore('')
            fetchRequests()
        } catch (error) {
            console.error('Error dismissing request:', error)
            toast.error('Failed to dismiss request')
        } finally {
            setActionLoading(null)
        }
    }

    const getStatusBadge = (status) => {
        switch (status?.toLowerCase()) {
            case 'approved':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full text-xs">
                        <CheckCircle className="h-3 w-3" />
                        Approved
                    </span>
                )
            case 'pending':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full text-xs">
                        <Clock className="h-3 w-3" />
                        Pending
                    </span>
                )
            case 'rejected':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full text-xs">
                        <XCircle className="h-3 w-3" />
                        Rejected
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

    const filteredRequests = requests.filter(r => {
        const email = r.studentEmail || r.student?.email || '';
        const studentName = r.student?.name || '';
        const courseName = r.course?.topic || r.course?.courseLayout?.course_title || '';
        const reason = r.reviewReason || '';
        
        const search = searchTerm.toLowerCase();
        return email.toLowerCase().includes(search) ||
               studentName.toLowerCase().includes(search) ||
               courseName.toLowerCase().includes(search) ||
               reason.toLowerCase().includes(search);
    });

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
                        <MessageSquare className="h-6 w-6 text-primary" />
                        Review Requests
                    </h1>
                    <div className="flex items-center gap-4">
                        <p className="text-gray-600 dark:text-gray-400">
                            Manage user review requests and appeals
                        </p>
                        <button
                            onClick={() => setIsLive(!isLive)}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                                isLive 
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                            }`}
                            title={isLive ? 'Click to pause auto-refresh' : 'Click to enable auto-refresh'}
                        >
                            {isLive ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                            {isLive ? 'Live' : 'Paused'}
                        </button>
                    </div>
                    {lastUpdated && (
                        <p className="text-xs text-gray-400 mt-1">
                            Last updated: {lastUpdated.toLocaleTimeString()}
                        </p>
                    )}
                </div>
                <Button onClick={() => fetchRequests(true)} variant="outline" disabled={loading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by user, course, or reason..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary"
                >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                </select>
            </div>

            {/* Requests List */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : filteredRequests.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No review requests found</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredRequests.map((request) => (
                            <div key={request.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            <User className="h-4 w-4 text-gray-400" />
                                            <span className="font-medium text-gray-900 dark:text-white">
                                                {request.student?.name || request.studentEmail}
                                            </span>
                                            {getStatusBadge(request.reviewRequested ? 'pending' : request.status)}
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                            Course: <span className="font-medium">{request.course?.topic || request.course?.courseLayout?.course_title || 'N/A'}</span>
                                        </p>
                                        {request.assignment?.title && (
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                                Assignment: <span className="font-medium">{request.assignment.title}</span>
                                            </p>
                                        )}
                                        <p className="text-sm text-gray-500 line-clamp-2">
                                            {request.reviewReason || 'No reason provided'}
                                        </p>
                                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {formatDate(request.submittedAt || request.createdAt)}
                                            </span>
                                            {request.score !== null && request.score !== undefined && (
                                                <span className="flex items-center gap-1">
                                                    <Star className="h-3 w-3 text-yellow-500" />
                                                    Score: {request.score}%
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {(request.reviewRequested || request.status === 'PendingReview') && (
                                            <>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-green-600 border-green-600 hover:bg-green-50"
                                                    onClick={() => {
                                                        setSelectedRequest(request)
                                                        setFeedback('')
                                                    }}
                                                    disabled={actionLoading === request.id}
                                                >
                                                    <ThumbsUp className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-red-600 border-red-600 hover:bg-red-50"
                                                    onClick={() => {
                                                        setSelectedRequest(request)
                                                        setFeedback('')
                                                    }}
                                                    disabled={actionLoading === request.id}
                                                >
                                                    <ThumbsDown className="h-4 w-4" />
                                                </Button>
                                            </>
                                        )}
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => setSelectedRequest(request)}
                                        >
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Request Detail / Action Modal */}
            {selectedRequest && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
                        <div className="flex items-start justify-between mb-4">
                            <h3 className="text-lg font-semibold">Review Assignment Submission</h3>
                            <button
                                onClick={() => { setSelectedRequest(null); setFeedback(''); setNewScore(''); }}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                            >
                                <XCircle className="h-5 w-5 text-gray-400" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Student Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm text-gray-500">Student</label>
                                    <p className="font-medium">{selectedRequest.student?.name || selectedRequest.studentEmail}</p>
                                </div>
                                <div>
                                    <label className="text-sm text-gray-500">Course</label>
                                    <p className="font-medium">{selectedRequest.course?.topic || selectedRequest.course?.courseLayout?.course_title || 'N/A'}</p>
                                </div>
                            </div>

                            {/* Assignment Info */}
                            {selectedRequest.assignment?.title && (
                                <div>
                                    <label className="text-sm text-gray-500">Assignment</label>
                                    <p className="font-medium">{selectedRequest.assignment.title}</p>
                                </div>
                            )}

                            {/* Submission Content */}
                            <div>
                                <label className="text-sm text-gray-500">Student Submission</label>
                                <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm max-h-48 overflow-y-auto">
                                    <pre className="whitespace-pre-wrap font-mono text-xs">
                                        {selectedRequest.submission || 'No content'}
                                    </pre>
                                </div>
                            </div>

                            {/* Review Reason */}
                            <div>
                                <label className="text-sm text-gray-500">Review Request Reason</label>
                                <p className="mt-1 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-sm">
                                    {selectedRequest.reviewReason || 'No reason provided'}
                                </p>
                            </div>

                            {/* Current Score & Status */}
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="text-sm text-gray-500">Current Score</label>
                                    <p className="text-xl font-bold text-blue-600">
                                        {selectedRequest.score !== null && selectedRequest.score !== undefined 
                                            ? `${selectedRequest.score}%` 
                                            : 'Not graded'}
                                    </p>
                                </div>
                                {selectedRequest.originalAiScore !== null && selectedRequest.originalAiScore !== undefined && (
                                    <div>
                                        <label className="text-sm text-gray-500">Original AI Score</label>
                                        <p className="text-lg font-medium text-gray-500">{selectedRequest.originalAiScore}%</p>
                                    </div>
                                )}
                                <div>
                                    <label className="text-sm text-gray-500">Submitted</label>
                                    <p className="text-sm">{formatDate(selectedRequest.submittedAt)}</p>
                                </div>
                            </div>

                            {/* Admin Review Section */}
                            {(selectedRequest.reviewRequested || selectedRequest.status === 'PendingReview') && (
                                <>
                                    <hr className="border-gray-200 dark:border-gray-600" />
                                    <h4 className="font-medium text-gray-900 dark:text-white">Admin Review</h4>
                                    
                                    {/* Alert for AI-failed submissions */}
                                    {selectedRequest.status === 'PendingReview' && (selectedRequest.score === null || selectedRequest.score === undefined) && (
                                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                            <p className="text-red-800 font-medium">⚠️ AI Grading Failed</p>
                                            <p className="text-red-700 text-sm mt-1">
                                                This submission has no AI score. You must enter a score to grade this assignment.
                                            </p>
                                        </div>
                                    )}
                                    
                                    {/* New Score Input */}
                                    <div>
                                        <label className="text-sm text-gray-500 mb-2 block">
                                            {selectedRequest.status === 'PendingReview' && (selectedRequest.score === null || selectedRequest.score === undefined)
                                                ? 'Score (0-100) - Required since AI grading failed'
                                                : 'New Score (0-100)'
                                            } <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={newScore}
                                            onChange={(e) => setNewScore(e.target.value)}
                                            placeholder="Enter score..."
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-primary"
                                        />
                                    </div>

                                    {/* Feedback Input */}
                                    <div>
                                        <label className="text-sm text-gray-500 mb-2 block">
                                            Feedback to Student
                                        </label>
                                        <textarea
                                            value={feedback}
                                            onChange={(e) => setFeedback(e.target.value)}
                                            placeholder="Provide feedback to the student..."
                                            rows={3}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-primary resize-none"
                                        />
                                    </div>
                                </>
                            )}

                            {/* Previous Admin Feedback */}
                            {selectedRequest.instructorNotes && (
                                <div>
                                    <label className="text-sm text-gray-500">Previous Admin Notes</label>
                                    <p className="mt-1 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm">
                                        {selectedRequest.instructorNotes}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <Button variant="outline" onClick={() => { setSelectedRequest(null); setFeedback(''); setNewScore(''); }}>
                                Cancel
                            </Button>
                            {(selectedRequest.reviewRequested || selectedRequest.status === 'PendingReview') && (
                                <>
                                    {/* Only show Dismiss button if there's already an AI score */}
                                    {selectedRequest.score !== null && selectedRequest.score !== undefined && (
                                        <Button
                                            variant="outline"
                                            className="text-orange-600 border-orange-300 hover:bg-orange-50"
                                            onClick={() => handleReject(selectedRequest.id)}
                                            disabled={actionLoading === selectedRequest.id}
                                        >
                                            {actionLoading === selectedRequest.id ? (
                                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            ) : (
                                                <XCircle className="h-4 w-4 mr-2" />
                                            )}
                                            Dismiss (Keep AI Score)
                                        </Button>
                                    )}
                                    <Button
                                        onClick={() => handleApprove(selectedRequest.id)}
                                        disabled={actionLoading === selectedRequest.id || !newScore}
                                        className="bg-green-600 hover:bg-green-700"
                                    >
                                        {actionLoading === selectedRequest.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        ) : (
                                            <CheckCircle className="h-4 w-4 mr-2" />
                                        )}
                                        {selectedRequest.score !== null && selectedRequest.score !== undefined ? 'Update Score' : 'Grade Submission'}
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ReviewRequestsPage
