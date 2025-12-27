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
    Clock,
    XCircle,
    AlertTriangle,
    Calendar,
    User,
    Filter,
    Send,
    Eye,
    ChevronDown,
    ChevronUp,
    Tag,
    Cpu,
    Wifi,
    WifiOff
} from 'lucide-react'
import { toast } from 'sonner'

// Real-time polling interval (10 seconds)
const POLL_INTERVAL = 10000

function AdminSupportPage() {
    const { admin, loading: authLoading } = useAdminAuth()
    const [tickets, setTickets] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [expandedTicket, setExpandedTicket] = useState(null)
    const [replyText, setReplyText] = useState('')
    const [updatingId, setUpdatingId] = useState(null)
    const [stats, setStats] = useState({ open: 0, inReview: 0, resolved: 0, closed: 0 })
    const [isLive, setIsLive] = useState(true)
    const [lastUpdated, setLastUpdated] = useState(null)
    const pollIntervalRef = useRef(null)

    const fetchTickets = useCallback(async (showLoading = false) => {
        try {
            if (showLoading) setLoading(true)
            const params = statusFilter !== 'all' ? `?status=${encodeURIComponent(statusFilter)}` : ''
            const response = await axios.get(`/api/admin/support${params}`)
            const newTickets = response.data.tickets || []
            const newStats = response.data.stats || { open: 0, inReview: 0, resolved: 0, closed: 0 }
            
            // Check for new tickets (compare counts)
            if (tickets.length > 0 && newTickets.length > tickets.length) {
                const newCount = newTickets.length - tickets.length
                toast.info(`${newCount} new ticket${newCount > 1 ? 's' : ''} received!`)
            }
            
            setTickets(newTickets)
            setStats(newStats)
            setLastUpdated(new Date())
        } catch (error) {
            console.error('Error fetching tickets:', error)
            if (showLoading) toast.error('Failed to load support tickets')
        } finally {
            if (showLoading) setLoading(false)
        }
    }, [statusFilter, tickets.length])

    // Initial fetch
    useEffect(() => {
        if (!authLoading && admin) {
            fetchTickets(true)
        }
    }, [authLoading, admin, statusFilter])

    // Real-time polling
    useEffect(() => {
        if (!authLoading && admin && isLive) {
            pollIntervalRef.current = setInterval(() => {
                fetchTickets(false)
            }, POLL_INTERVAL)
        }
        
        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current)
            }
        }
    }, [authLoading, admin, isLive, fetchTickets])

    const handleUpdateStatus = async (ticketId, newStatus, message = null) => {
        try {
            setUpdatingId(ticketId)
            await axios.patch('/api/admin/support', {
                ticketId,
                status: newStatus,
                adminMessage: message
            })
            toast.success(`Ticket ${newStatus.toLowerCase()}`)
            setReplyText('')
            setExpandedTicket(null)
            fetchTickets(true)
        } catch (error) {
            console.error('Error updating ticket:', error)
            toast.error('Failed to update ticket')
        } finally {
            setUpdatingId(null)
        }
    }

    const handleSendReply = async (ticketId) => {
        if (!replyText.trim()) {
            toast.error('Please enter a reply message')
            return
        }
        const ticket = tickets.find(t => t.id === ticketId)
        await handleUpdateStatus(ticketId, ticket?.status || 'In Review', replyText.trim())
    }

    const getStatusBadge = (status) => {
        switch (status?.toLowerCase()) {
            case 'open':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full text-xs">
                        <Clock className="h-3 w-3" />
                        Open
                    </span>
                )
            case 'in review':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full text-xs">
                        <Eye className="h-3 w-3" />
                        In Review
                    </span>
                )
            case 'resolved':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full text-xs">
                        <CheckCircle className="h-3 w-3" />
                        Resolved
                    </span>
                )
            case 'closed':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded-full text-xs">
                        <XCircle className="h-3 w-3" />
                        Closed
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

    const filteredTickets = tickets.filter(t => 
        t.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.message?.toLowerCase().includes(searchTerm.toLowerCase())
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
                        <MessageSquare className="h-6 w-6 text-primary" />
                        Support Tickets
                    </h1>
                    <div className="flex items-center gap-4">
                        <p className="text-gray-600 dark:text-gray-400">
                            Manage user help requests and issues
                        </p>
                        {/* Live indicator */}
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
                <Button onClick={() => fetchTickets(true)} variant="outline" disabled={loading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-600 dark:text-blue-400">Open</p>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.open}</p>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
                    <p className="text-sm text-yellow-600 dark:text-yellow-400">In Review</p>
                    <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{stats.inReview}</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                    <p className="text-sm text-green-600 dark:text-green-400">Resolved</p>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-300">{stats.resolved}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Closed</p>
                    <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">{stats.closed}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by subject, email, or message..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-gray-400" />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary"
                    >
                        <option value="all">All Status</option>
                        <option value="Open">Open</option>
                        <option value="In Review">In Review</option>
                        <option value="Resolved">Resolved</option>
                        <option value="Closed">Closed</option>
                    </select>
                </div>
            </div>

            {/* Tickets List */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : filteredTickets.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No support tickets found</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredTickets.map((ticket) => (
                            <div key={ticket.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                {/* Ticket Header */}
                                <div 
                                    className="px-6 py-4 cursor-pointer"
                                    onClick={() => setExpandedTicket(expandedTicket === ticket.id ? null : ticket.id)}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <h3 className="font-medium text-gray-900 dark:text-white">
                                                    {ticket.subject}
                                                </h3>
                                                {ticket.aiIssue && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded text-xs">
                                                        <Cpu className="h-3 w-3" />
                                                        AI Issue
                                                    </span>
                                                )}
                                                {getStatusBadge(ticket.status)}
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    <User className="h-3 w-3" />
                                                    {ticket.userEmail}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Tag className="h-3 w-3" />
                                                    {ticket.category || 'General'}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {formatDate(ticket.createdAt)}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {expandedTicket === ticket.id ? (
                                                <ChevronUp className="h-5 w-5 text-gray-400" />
                                            ) : (
                                                <ChevronDown className="h-5 w-5 text-gray-400" />
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Content */}
                                {expandedTicket === ticket.id && (
                                    <div className="px-6 pb-4 space-y-4">
                                        {/* User Message */}
                                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                            <p className="text-sm font-medium text-gray-500 mb-2">User Message:</p>
                                            <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{ticket.message}</p>
                                        </div>

                                        {/* User Reply (if any) */}
                                        {ticket.userReply && (
                                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border-l-4 border-blue-500">
                                                <p className="text-sm font-medium text-blue-600 mb-2">User Reply:</p>
                                                <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{ticket.userReply}</p>
                                            </div>
                                        )}

                                        {/* Admin Message (if any) */}
                                        {ticket.adminMessage && (
                                            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border-l-4 border-green-500">
                                                <p className="text-sm font-medium text-green-600 mb-2">Admin Response:</p>
                                                <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{ticket.adminMessage}</p>
                                            </div>
                                        )}

                                        {/* Reply Form */}
                                        {ticket.status !== 'Closed' && (
                                            <div className="space-y-3">
                                                <textarea
                                                    value={expandedTicket === ticket.id ? replyText : ''}
                                                    onChange={(e) => setReplyText(e.target.value)}
                                                    placeholder="Type your reply..."
                                                    rows={3}
                                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary resize-none"
                                                />
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleSendReply(ticket.id)}
                                                            disabled={updatingId === ticket.id || !replyText.trim()}
                                                        >
                                                            {updatingId === ticket.id ? (
                                                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                            ) : (
                                                                <Send className="h-4 w-4 mr-2" />
                                                            )}
                                                            Send Reply
                                                        </Button>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {ticket.status === 'Open' && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => handleUpdateStatus(ticket.id, 'In Review')}
                                                                disabled={updatingId === ticket.id}
                                                            >
                                                                <Eye className="h-4 w-4 mr-1" />
                                                                Mark In Review
                                                            </Button>
                                                        )}
                                                        {ticket.status !== 'Resolved' && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="text-green-600 border-green-600 hover:bg-green-50"
                                                                onClick={() => handleUpdateStatus(ticket.id, 'Resolved')}
                                                                disabled={updatingId === ticket.id}
                                                            >
                                                                <CheckCircle className="h-4 w-4 mr-1" />
                                                                Resolve
                                                            </Button>
                                                        )}
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="text-gray-600"
                                                            onClick={() => handleUpdateStatus(ticket.id, 'Closed')}
                                                            disabled={updatingId === ticket.id}
                                                        >
                                                            <XCircle className="h-4 w-4 mr-1" />
                                                            Close
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default AdminSupportPage
