"use client"
import React, { useState, useEffect } from 'react'
import { useAdminAuth } from '@/app/_context/AdminAuthContext'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { 
    Activity,
    AlertCircle,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Clock,
    Filter,
    Loader2,
    RefreshCw,
    Search,
    User,
    FileText,
    CheckCircle,
    XCircle,
    Edit3,
    CreditCard,
    BookOpen,
    X
} from 'lucide-react'
import { toast } from 'sonner'

function ActivityLogPage() {
    const { admin, loading: authLoading } = useAdminAuth()
    const [logs, setLogs] = useState([])
    const [loading, setLoading] = useState(true)
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [totalCount, setTotalCount] = useState(0)
    
    // Filters
    const [filters, setFilters] = useState({
        admin: '',
        action: '',
        startDate: '',
        endDate: ''
    })
    const [availableFilters, setAvailableFilters] = useState({
        actionTypes: [],
        admins: []
    })
    const [showFilters, setShowFilters] = useState(false)

    useEffect(() => {
        if (!authLoading && admin) {
            fetchLogs()
        }
    }, [authLoading, admin, currentPage, filters])

    const fetchLogs = async () => {
        try {
            setLoading(true)
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: '50',
                ...(filters.admin && { admin: filters.admin }),
                ...(filters.action && { action: filters.action }),
                ...(filters.startDate && { startDate: filters.startDate }),
                ...(filters.endDate && { endDate: filters.endDate })
            })
            
            const response = await axios.get(`/api/admin/activity-log?${params}`)
            setLogs(response.data.logs || [])
            setTotalPages(response.data.totalPages || 1)
            setTotalCount(response.data.totalCount || 0)
            setAvailableFilters(response.data.filters || { actionTypes: [], admins: [] })
        } catch (error) {
            console.error('Error fetching activity logs:', error)
            toast.error('Failed to load activity logs')
        } finally {
            setLoading(false)
        }
    }

    const clearFilters = () => {
        setFilters({
            admin: '',
            action: '',
            startDate: '',
            endDate: ''
        })
        setCurrentPage(1)
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

    const getActionIcon = (action) => {
        switch (action) {
            case 'update_grade':
            case 'grade_submission':
                return <Edit3 className="w-4 h-4" />
            case 'dismiss_review':
                return <XCircle className="w-4 h-4" />
            case 'approve_review':
                return <CheckCircle className="w-4 h-4" />
            case 'adjust_credits':
                return <CreditCard className="w-4 h-4" />
            case 'bulk_grade':
            case 'bulk_dismiss':
                return <FileText className="w-4 h-4" />
            default:
                return <Activity className="w-4 h-4" />
        }
    }

    const getActionColor = (action) => {
        if (action.includes('grade') || action.includes('approve')) {
            return 'bg-green-100 text-green-700'
        }
        if (action.includes('dismiss') || action.includes('reject')) {
            return 'bg-orange-100 text-orange-700'
        }
        if (action.includes('credit')) {
            return 'bg-purple-100 text-purple-700'
        }
        return 'bg-blue-100 text-blue-700'
    }

    const formatAction = (action) => {
        return action
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
    }

    const parseDetails = (details) => {
        if (!details) return {}
        try {
            return typeof details === 'string' ? JSON.parse(details) : details
        } catch {
            return {}
        }
    }

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/10 rounded-xl">
                        <Activity className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Admin Activity Log</h1>
                        <p className="text-gray-500">Track all admin actions and changes</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button 
                        variant="outline" 
                        onClick={() => setShowFilters(!showFilters)}
                        className={showFilters ? 'bg-gray-100' : ''}
                    >
                        <Filter className="w-4 h-4 mr-2" />
                        Filters
                    </Button>
                    <Button onClick={fetchLogs} disabled={loading} variant="outline">
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Filters Panel */}
            {showFilters && (
                <div className="mb-6 p-4 bg-gray-50 rounded-xl border">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Admin</label>
                            <select
                                value={filters.admin}
                                onChange={(e) => {
                                    setFilters({ ...filters, admin: e.target.value })
                                    setCurrentPage(1)
                                }}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                            >
                                <option value="">All Admins</option>
                                {availableFilters.admins.map(admin => (
                                    <option key={admin} value={admin}>{admin}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Action Type</label>
                            <select
                                value={filters.action}
                                onChange={(e) => {
                                    setFilters({ ...filters, action: e.target.value })
                                    setCurrentPage(1)
                                }}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                            >
                                <option value="">All Actions</option>
                                {availableFilters.actionTypes.map(action => (
                                    <option key={action} value={action}>{formatAction(action)}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                            <input
                                type="date"
                                value={filters.startDate}
                                onChange={(e) => {
                                    setFilters({ ...filters, startDate: e.target.value })
                                    setCurrentPage(1)
                                }}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                            <input
                                type="date"
                                value={filters.endDate}
                                onChange={(e) => {
                                    setFilters({ ...filters, endDate: e.target.value })
                                    setCurrentPage(1)
                                }}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                            />
                        </div>
                    </div>
                    {(filters.admin || filters.action || filters.startDate || filters.endDate) && (
                        <div className="mt-3">
                            <Button variant="ghost" size="sm" onClick={clearFilters}>
                                <X className="w-4 h-4 mr-1" />
                                Clear Filters
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* Stats */}
            <div className="mb-6 text-sm text-gray-500">
                Total: {totalCount} activities
            </div>

            {/* Activity List */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : logs.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-xl">
                    <Activity className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600">No Activity Found</h3>
                    <p className="text-gray-400">No admin activities match your filters.</p>
                </div>
            ) : (
                <>
                    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Admin</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Target</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {logs.map((log) => {
                                    const details = parseDetails(log.details)
                                    return (
                                        <tr key={log.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {formatDate(log.createdAt)}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                <div className="flex items-center gap-1">
                                                    <User className="w-3 h-3 text-gray-400" />
                                                    <span className="font-medium truncate max-w-[150px]">
                                                        {log.adminEmail}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                                                    {getActionIcon(log.action)}
                                                    {formatAction(log.action)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                <span className="capitalize">{log.targetType}</span>
                                                <span className="text-gray-400 ml-1">#{log.targetId}</span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600 truncate max-w-[150px]">
                                                {log.studentEmail || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-500">
                                                {details.oldScore !== undefined && details.newScore !== undefined ? (
                                                    <span>
                                                        Score: {details.oldScore} → <strong>{details.newScore}</strong>
                                                    </span>
                                                ) : details.reason ? (
                                                    <span className="truncate max-w-[200px] block">{details.reason}</span>
                                                ) : (
                                                    '-'
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="mt-6 flex items-center justify-between">
                            <div className="text-sm text-gray-500">
                                Page {currentPage} of {totalPages}
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

export default ActivityLogPage
