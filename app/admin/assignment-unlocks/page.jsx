"use client"
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useAdminAuth } from '@/app/_context/AdminAuthContext'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { 
    Unlock, 
    Loader2, 
    RefreshCw, 
    Search,
    CheckCircle,
    XCircle,
    Clock,
    Calendar,
    User,
    BookOpen,
    FileText,
    Wifi,
    WifiOff
} from 'lucide-react'
import { toast } from 'sonner'

// Real-time polling interval (15 seconds)
const POLL_INTERVAL = 15000

function AssignmentUnlocksPage() {
    const { admin, loading: authLoading } = useAdminAuth()
    const [requests, setRequests] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('pending')
    const [actionLoading, setActionLoading] = useState(null)
    const [isLive, setIsLive] = useState(true)
    const [lastUpdated, setLastUpdated] = useState(null)
    const pollIntervalRef = useRef(null)

    const fetchRequests = useCallback(async (showLoading = false) => {
        try {
            if (showLoading) setLoading(true)
            const response = await axios.get('/api/admin/assignment-unlock-requests', {
                params: {
                    status: statusFilter !== 'all' ? statusFilter : undefined
                }
            })
            const newRequests = response.data.requests || []
            
            // Notify if new pending requests
            if (requests.length > 0 && statusFilter === 'pending') {
                const newCount = newRequests.length - requests.length
                if (newCount > 0) {
                    toast.info(`${newCount} new unlock request${newCount > 1 ? 's' : ''}!`)
                }
            }
            
            setRequests(newRequests)
            setLastUpdated(new Date())
        } catch (error) {
            console.error('Error fetching unlock requests:', error)
            if (showLoading) toast.error('Failed to load unlock requests')
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

    const handleAction = async (requestId, action) => {
        try {
            setActionLoading(requestId)
            await axios.post('/api/admin/assignment-unlock-requests', {
                requestId,
                action,
                adminEmail: admin?.email
            })
            toast.success(`Request ${action === 'approve' ? 'approved' : 'rejected'} successfully!`)
            fetchRequests()
        } catch (error) {
            console.error('Error processing request:', error)
            toast.error(`Failed to ${action} request`)
        } finally {
            setActionLoading(null)
        }
    }

    const getStatusBadge = (status) => {
        switch (status?.toLowerCase()) {
            case 'approved':
            case 'unlocked':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full text-xs">
                        <CheckCircle className="h-3 w-3" />
                        {status}
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
            case 'denied':
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

    const filteredRequests = requests.filter(r => {
        const email = r.studentEmail || r.student?.email || '';
        const studentName = r.student?.name || '';
        const courseName = r.course?.topic || r.course?.courseLayout?.course_title || '';
        const assignmentTitle = r.assignment?.title || '';
        const reason = r.reviewReason || '';
        
        const search = searchTerm.toLowerCase();
        return email.toLowerCase().includes(search) ||
               studentName.toLowerCase().includes(search) ||
               courseName.toLowerCase().includes(search) ||
               assignmentTitle.toLowerCase().includes(search) ||
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
                        <Unlock className="h-6 w-6 text-primary" />
                        Assignment Unlock Requests
                    </h1>
                    <div className="flex items-center gap-4">
                        <p className="text-gray-600 dark:text-gray-400">
                            Manage user requests to unlock assignments
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
                        placeholder="Search by user, course, or assignment..."
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

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
                    <p className="text-sm text-yellow-600 dark:text-yellow-400">Pending</p>
                    <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                        {requests.filter(r => r.status === 'UnlockRequested' || r.status?.toLowerCase() === 'pending').length}
                    </p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                    <p className="text-sm text-green-600 dark:text-green-400">Approved</p>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                        {requests.filter(r => r.status === 'Unlocked' || r.status?.toLowerCase() === 'approved').length}
                    </p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
                    <p className="text-sm text-red-600 dark:text-red-400">Rejected</p>
                    <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                        {requests.filter(r => r.status === 'Rejected' || r.status?.toLowerCase() === 'denied').length}
                    </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
                    <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">
                        {requests.length}
                    </p>
                </div>
            </div>

            {/* Requests List */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : filteredRequests.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <Unlock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No unlock requests found</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredRequests.map((request) => (
                            <div key={request.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-2">
                                            <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                            <span className="font-medium text-gray-900 dark:text-white">
                                                {request.student?.name || request.studentEmail}
                                            </span>
                                            {getStatusBadge(request.status === 'UnlockRequested' ? 'pending' : request.status)}
                                        </div>

                                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                                            <BookOpen className="h-4 w-4 flex-shrink-0" />
                                            <span>{request.course?.topic || request.course?.courseLayout?.course_title || 'N/A'}</span>
                                        </div>

                                        {request.assignment?.title && (
                                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                                                <FileText className="h-4 w-4 flex-shrink-0" />
                                                <span>{request.assignment.title}</span>
                                            </div>
                                        )}

                                        {request.reviewReason && (
                                            <p className="text-sm text-gray-500 bg-gray-50 dark:bg-gray-700 p-2 rounded mt-2">
                                                <span className="font-medium">Reason:</span> {request.reviewReason}
                                            </p>
                                        )}

                                        <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                                            <Calendar className="h-3 w-3" />
                                            {formatDate(request.submittedAt || request.createdAt)}
                                        </div>
                                    </div>

                                    {(request.status === 'UnlockRequested' || request.status?.toLowerCase() === 'pending') && (
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                onClick={() => handleAction(request.id, 'reject')}
                                                disabled={actionLoading === request.id}
                                            >
                                                {actionLoading === request.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <>
                                                        <XCircle className="h-4 w-4 mr-1" />
                                                        Reject
                                                    </>
                                                )}
                                            </Button>
                                            <Button
                                                size="sm"
                                                className="bg-green-600 hover:bg-green-700"
                                                onClick={() => handleAction(request.id, 'approve')}
                                                disabled={actionLoading === request.id}
                                            >
                                                {actionLoading === request.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <>
                                                        <CheckCircle className="h-4 w-4 mr-1" />
                                                        Approve
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default AssignmentUnlocksPage
