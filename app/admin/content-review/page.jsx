"use client"
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useAdminAuth } from '@/app/_context/AdminAuthContext'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { 
    Shield, 
    Loader2, 
    RefreshCw, 
    Search,
    CheckCircle,
    XCircle,
    Clock,
    Eye,
    Edit3,
    AlertTriangle,
    Filter,
    FileText,
    BookOpen,
    HelpCircle,
    Wifi,
    WifiOff,
    ChevronLeft,
    ChevronRight,
    Flag
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import DOMPurify from 'dompurify'

const POLL_INTERVAL = 20000

function ContentReviewPage() {
    const { admin, loading: authLoading } = useAdminAuth()
    const [reviews, setReviews] = useState([])
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, edited: 0, total: 0 })
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 })
    const [statusFilter, setStatusFilter] = useState('pending')
    const [contentTypeFilter, setContentTypeFilter] = useState('')
    const [priorityFilter, setPriorityFilter] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedReview, setSelectedReview] = useState(null)
    const [reviewDetail, setReviewDetail] = useState(null)
    const [detailLoading, setDetailLoading] = useState(false)
    const [actionLoading, setActionLoading] = useState(null)
    const [reviewNotes, setReviewNotes] = useState('')
    const [isLive, setIsLive] = useState(true)
    const [lastUpdated, setLastUpdated] = useState(null)
    const pollRef = useRef(null)

    const fetchReviews = useCallback(async (showLoading = false) => {
        try {
            if (showLoading) setLoading(true)
            const response = await axios.get('/api/admin/content-review', {
                params: {
                    status: statusFilter !== 'all' ? statusFilter : undefined,
                    contentType: contentTypeFilter || undefined,
                    priority: priorityFilter || undefined,
                    page: pagination.page,
                }
            })
            setReviews(response.data.reviews || [])
            setStats(response.data.stats || stats)
            setPagination(response.data.pagination || pagination)
            setLastUpdated(new Date())
        } catch (error) {
            console.error('Error fetching reviews:', error)
            if (showLoading) toast.error('Failed to load content reviews')
        } finally {
            if (showLoading) setLoading(false)
        }
    }, [statusFilter, contentTypeFilter, priorityFilter, pagination.page])

    useEffect(() => {
        if (!authLoading && admin) fetchReviews(true)
    }, [authLoading, admin, statusFilter, contentTypeFilter, priorityFilter, pagination.page])

    useEffect(() => {
        if (!authLoading && admin && isLive) {
            pollRef.current = setInterval(() => fetchReviews(false), POLL_INTERVAL)
        }
        return () => { if (pollRef.current) clearInterval(pollRef.current) }
    }, [authLoading, admin, isLive, fetchReviews])

    const openDetail = async (review) => {
        setSelectedReview(review)
        setReviewNotes('')
        setDetailLoading(true)
        try {
            const response = await axios.get(`/api/admin/content-review/${review.id}`)
            setReviewDetail(response.data)
        } catch (error) {
            toast.error('Failed to load review details')
        } finally {
            setDetailLoading(false)
        }
    }

    const handleAction = async (action) => {
        if (!selectedReview) return
        try {
            setActionLoading(action)
            await axios.post('/api/admin/content-review', {
                reviewId: selectedReview.id,
                action,
                reviewNotes,
            })
            toast.success(`Content ${action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'updated'} successfully!`)
            setSelectedReview(null)
            setReviewDetail(null)
            fetchReviews(true)
        } catch (error) {
            toast.error(`Failed to ${action} content`)
        } finally {
            setActionLoading(null)
        }
    }

    const getContentTypeIcon = (type) => {
        switch (type) {
            case 'course_outline': return <BookOpen className="h-4 w-4" />
            case 'notes': return <FileText className="h-4 w-4" />
            case 'flashcards': return <HelpCircle className="h-4 w-4" />
            case 'quiz': case 'mcq': return <CheckCircle className="h-4 w-4" />
            default: return <FileText className="h-4 w-4" />
        }
    }

    const getPriorityBadge = (priority) => {
        const styles = {
            urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
            high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
            normal: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            low: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
        }
        return (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[priority] || styles.normal}`}>
                {priority}
            </span>
        )
    }

    const getStatusBadge = (status) => {
        const config = {
            pending: { icon: Clock, style: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
            approved: { icon: CheckCircle, style: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
            rejected: { icon: XCircle, style: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
            edited: { icon: Edit3, style: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
        }
        const c = config[status] || config.pending
        const Icon = c.icon
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.style}`}>
                <Icon className="h-3 w-3" /> {status}
            </span>
        )
    }

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Shield className="h-7 w-7 text-primary" />
                        Content Review Queue
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Review and approve AI-generated content before students see it
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsLive(!isLive)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                            isLive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                                   : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                    >
                        {isLive ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
                        {isLive ? 'Live' : 'Paused'}
                    </button>
                    <Button variant="outline" size="sm" onClick={() => fetchReviews(true)}>
                        <RefreshCw className="h-4 w-4 mr-1" /> Refresh
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                    { label: 'Pending', value: stats.pending, color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/10' },
                    { label: 'Approved', value: stats.approved, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/10' },
                    { label: 'Edited', value: stats.edited, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/10' },
                    { label: 'Rejected', value: stats.rejected, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/10' },
                    { label: 'Total', value: stats.total, color: 'text-gray-600', bg: 'bg-gray-50 dark:bg-gray-800' },
                ].map((stat) => (
                    <div key={stat.label} className={`${stat.bg} rounded-xl p-4 border border-gray-200 dark:border-gray-700`}>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                        <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-500">Filters:</span>
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setPagination(p => ({...p, page: 1})) }}
                    className="px-3 py-1.5 text-sm border rounded-lg dark:bg-gray-800 dark:border-gray-600"
                >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="edited">Edited</option>
                    <option value="rejected">Rejected</option>
                </select>
                <select
                    value={contentTypeFilter}
                    onChange={(e) => { setContentTypeFilter(e.target.value); setPagination(p => ({...p, page: 1})) }}
                    className="px-3 py-1.5 text-sm border rounded-lg dark:bg-gray-800 dark:border-gray-600"
                >
                    <option value="">All Types</option>
                    <option value="course_outline">Course Outline</option>
                    <option value="notes">Notes</option>
                    <option value="flashcards">Flashcards</option>
                    <option value="quiz">Quiz</option>
                    <option value="mcq">MCQ</option>
                </select>
                <select
                    value={priorityFilter}
                    onChange={(e) => { setPriorityFilter(e.target.value); setPagination(p => ({...p, page: 1})) }}
                    className="px-3 py-1.5 text-sm border rounded-lg dark:bg-gray-800 dark:border-gray-600"
                >
                    <option value="">All Priority</option>
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="normal">Normal</option>
                    <option value="low">Low</option>
                </select>
                {lastUpdated && (
                    <span className="text-xs text-gray-400 ml-auto">
                        Updated: {lastUpdated.toLocaleTimeString()}
                    </span>
                )}
            </div>

            {/* Review Items */}
            {reviews.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border">
                    <CheckCircle className="h-12 w-12 mx-auto text-green-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">All caught up!</h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">No content pending review.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {reviews.map((review) => (
                        <div 
                            key={review.id}
                            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-primary/50 transition-colors cursor-pointer"
                            onClick={() => openDetail(review)}
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3 min-w-0 flex-1">
                                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg flex-shrink-0">
                                        {getContentTypeIcon(review.contentType)}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-medium text-gray-900 dark:text-white truncate">
                                            {review.courseTopic || 'Unknown Course'}
                                        </h3>
                                        <div className="flex flex-wrap items-center gap-2 mt-1">
                                            <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                                                {review.contentType?.replace('_', ' ')}
                                            </span>
                                            {review.contentId && (
                                                <span className="text-xs text-gray-400">
                                                    Chapter {review.contentId}
                                                </span>
                                            )}
                                            {getStatusBadge(review.status)}
                                            {getPriorityBadge(review.priority)}
                                        </div>
                                        {review.flagReason && (
                                            <p className="text-xs text-orange-600 dark:text-orange-400 mt-1 flex items-center gap-1">
                                                <Flag className="h-3 w-3" />
                                                {review.flagReason.slice(0, 100)}
                                            </p>
                                        )}
                                        <p className="text-xs text-gray-400 mt-1">
                                            Created by {review.courseCreatedBy || 'unknown'} · {new Date(review.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm">
                                    <Eye className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-4">
                    <Button 
                        variant="outline" size="sm"
                        disabled={pagination.page <= 1}
                        onClick={() => setPagination(p => ({...p, page: p.page - 1}))}
                    >
                        <ChevronLeft className="h-4 w-4" /> Previous
                    </Button>
                    <span className="text-sm text-gray-500">
                        Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <Button 
                        variant="outline" size="sm"
                        disabled={pagination.page >= pagination.totalPages}
                        onClick={() => setPagination(p => ({...p, page: p.page + 1}))}
                    >
                        Next <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            )}

            {/* Detail Modal */}
            {selectedReview && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedReview(null)}>
                    <div 
                        className="bg-white dark:bg-gray-800 rounded-2xl border shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b p-6 flex items-center justify-between z-10">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                    Review: {selectedReview.courseTopic}
                                </h2>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-sm text-gray-500">{selectedReview.contentType?.replace('_', ' ')}</span>
                                    {getPriorityBadge(selectedReview.priority)}
                                    {getStatusBadge(selectedReview.status)}
                                </div>
                            </div>
                            <button onClick={() => setSelectedReview(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                                <XCircle className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {detailLoading ? (
                                <div className="flex items-center justify-center py-10">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            ) : reviewDetail ? (
                                <>
                                    {/* Course Info */}
                                    {reviewDetail.courseInfo && (
                                        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                                            <h3 className="font-medium text-sm text-gray-500 mb-2">Course Info</h3>
                                            <p><strong>Topic:</strong> {reviewDetail.courseInfo.topic}</p>
                                            <p><strong>Type:</strong> {reviewDetail.courseInfo.courseType}</p>
                                            <p><strong>Difficulty:</strong> {reviewDetail.courseInfo.difficultyLevel}</p>
                                            <p><strong>Created by:</strong> {reviewDetail.courseInfo.createdBy}</p>
                                        </div>
                                    )}

                                    {/* Flag Reason */}
                                    {selectedReview.flagReason && (
                                        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                                            <h3 className="font-medium text-orange-700 dark:text-orange-400 flex items-center gap-2 mb-1">
                                                <AlertTriangle className="h-4 w-4" /> Flag Reason
                                            </h3>
                                            <p className="text-sm text-orange-600 dark:text-orange-300">
                                                {selectedReview.flagReason}
                                            </p>
                                            {selectedReview.flaggedBy && (
                                                <p className="text-xs text-orange-500 mt-1">
                                                    Flagged by: {selectedReview.flaggedBy}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* Content Preview */}
                                    <div>
                                        <h3 className="font-medium text-gray-900 dark:text-white mb-2">AI-Generated Content</h3>
                                        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto">
                                            {(() => {
                                                const content = reviewDetail.review.originalContent || reviewDetail.currentContent
                                                if (!content) {
                                                    return <p className="text-sm text-gray-400 italic">Content will be loaded when you open the editor.</p>
                                                }
                                                // Notes — render HTML
                                                if (selectedReview.contentType === 'notes' && typeof content === 'string') {
                                                    return (
                                                        <div 
                                                            className="prose dark:prose-invert max-w-none text-sm"
                                                            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
                                                        />
                                                    )
                                                }
                                                // Quiz/MCQ — render questions visually
                                                if (['quiz', 'mcq'].includes(selectedReview.contentType) && typeof content === 'object') {
                                                    const questions = content?.questions || (Array.isArray(content) ? content : [])
                                                    return (
                                                        <div className="space-y-4">
                                                            {content?.quizTitle && (
                                                                <h4 className="font-semibold text-gray-800 dark:text-gray-200">{content.quizTitle}</h4>
                                                            )}
                                                            {questions.map((q, i) => (
                                                                <div key={i} className="border dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800">
                                                                    <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                                                                        <span className="text-primary">Q{i + 1}.</span> {q.question}
                                                                    </p>
                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                                                        {(q.options || []).map((opt, j) => (
                                                                            <div key={j} className={`text-xs px-2 py-1.5 rounded ${
                                                                                opt === q.answer 
                                                                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium border border-green-200 dark:border-green-800' 
                                                                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                                                            }`}>
                                                                                {String.fromCharCode(65 + j)}. {opt} {opt === q.answer && '✓'}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )
                                                }
                                                // Flashcards
                                                if (selectedReview.contentType === 'flashcards' && (Array.isArray(content) || content?.length)) {
                                                    const cards = Array.isArray(content) ? content : []
                                                    return (
                                                        <div className="space-y-2">
                                                            {cards.map((c, i) => (
                                                                <div key={i} className="border dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800">
                                                                    <p className="text-xs font-medium text-gray-500 mb-1">Card {i + 1}</p>
                                                                    <p className="text-sm text-gray-900 dark:text-white"><strong>Q:</strong> {c.front}</p>
                                                                    <p className="text-sm text-gray-600 dark:text-gray-400"><strong>A:</strong> {c.back}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )
                                                }
                                                // Fallback — JSON
                                                return (
                                                    <pre className="text-sm whitespace-pre-wrap font-mono">
                                                        {typeof content === 'object' ? JSON.stringify(content, null, 2) : String(content)}
                                                    </pre>
                                                )
                                            })()}
                                        </div>
                                    </div>

                                    {/* Admin Notes */}
                                    {selectedReview.status === 'pending' && (
                                        <div>
                                            <label className="block font-medium text-gray-900 dark:text-white mb-2">
                                                Review Notes (optional)
                                            </label>
                                            <textarea
                                                value={reviewNotes}
                                                onChange={(e) => setReviewNotes(e.target.value)}
                                                placeholder="Add notes about your review decision..."
                                                className="w-full p-3 border rounded-lg text-sm dark:bg-gray-900 dark:border-gray-600 min-h-[80px]"
                                            />
                                        </div>
                                    )}

                                    {/* Already Reviewed Info */}
                                    {selectedReview.status !== 'pending' && selectedReview.reviewedBy && (
                                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                                            <p className="text-sm text-blue-700 dark:text-blue-300">
                                                <strong>Reviewed by:</strong> {selectedReview.reviewedBy} on {new Date(selectedReview.reviewedAt).toLocaleString()}
                                            </p>
                                            {selectedReview.reviewNotes && (
                                                <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                                                    <strong>Notes:</strong> {selectedReview.reviewNotes}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <p className="text-gray-500">Failed to load details</p>
                            )}
                        </div>

                        {/* Actions */}
                        {selectedReview.status === 'pending' && (
                            <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t p-6 flex items-center justify-end gap-3">
                                <Button
                                    variant="outline"
                                    onClick={() => handleAction('reject')}
                                    disabled={!!actionLoading}
                                    className="border-red-300 text-red-600 hover:bg-red-50"
                                >
                                    {actionLoading === 'reject' ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <XCircle className="h-4 w-4 mr-1" />}
                                    Reject
                                </Button>
                                <Link href={`/admin/content-review/${selectedReview.id}/edit`}>
                                    <Button variant="outline" disabled={!!actionLoading}>
                                        <Edit3 className="h-4 w-4 mr-1" /> Edit & Approve
                                    </Button>
                                </Link>
                                <Button
                                    onClick={() => handleAction('approve')}
                                    disabled={!!actionLoading}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                    {actionLoading === 'approve' ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                                    Approve as-is
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

export default ContentReviewPage
