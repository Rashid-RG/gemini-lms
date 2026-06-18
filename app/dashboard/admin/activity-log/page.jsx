"use client"
import React, { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
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
    const { user, isLoaded } = useUser()
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

    const userEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase()
    const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
    const isAdmin = userEmail && adminEmails.includes(userEmail)

    useEffect(() => {
        if (isLoaded && isAdmin) {
            fetchLogs()
        }
    }, [isLoaded, isAdmin, currentPage, filters])

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
            return 'bg-emerald-50 text-emerald-700 border border-emerald-200/50 dark:bg-emerald-950/40 dark:text-emerald-300'
        }
        if (action.includes('dismiss') || action.includes('reject')) {
            return 'bg-rose-50 text-rose-700 border border-rose-200/50 dark:bg-rose-950/40 dark:text-rose-300'
        }
        if (action.includes('credit')) {
            return 'bg-violet-50 text-violet-700 border border-violet-200/50 dark:bg-violet-950/40 dark:text-violet-300'
        }
        return 'bg-indigo-50 text-indigo-700 border border-indigo-200/50 dark:bg-indigo-950/40 dark:text-indigo-300'
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
            <div className="relative overflow-hidden backdrop-blur-md bg-white/70 border border-slate-200/50 shadow-sm rounded-2xl p-6 mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="absolute -right-20 -top-20 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -left-20 -bottom-20 w-48 h-48 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="flex items-center gap-4 relative z-10">
                    <div className="p-3.5 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl text-white shadow-lg shadow-indigo-500/20">
                        <Activity className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Admin Activity Log</h1>
                        <p className="text-slate-500 text-sm mt-0.5">Audit track of all administrative updates and changes</p>
                    </div>
                </div>
                <div className="flex gap-3 relative z-10">
                    <button 
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center justify-center px-4 py-2.5 border rounded-xl font-medium text-sm transition-all duration-200 active:scale-[0.98] ${
                            showFilters 
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-600 shadow-sm' 
                                : 'bg-white/80 border-slate-200/60 text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                        <Filter className="w-4 h-4 mr-2" />
                        Filters
                    </button>
                    <button 
                        onClick={fetchLogs} 
                        disabled={loading}
                        className="flex items-center justify-center px-4 py-2.5 bg-white/80 border border-slate-200/60 rounded-xl text-slate-700 font-medium text-sm hover:bg-slate-50 active:scale-[0.98] transition-all duration-200 disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Filters Panel */}
            {showFilters && (
                <div className="mb-6 p-5 bg-white/60 backdrop-blur-md rounded-2xl border border-slate-200/50 shadow-sm animate-in fade-in slide-in-from-top-4 duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Admin</label>
                            <select
                                value={filters.admin}
                                onChange={(e) => {
                                    setFilters({ ...filters, admin: e.target.value })
                                    setCurrentPage(1)
                                }}
                                className="w-full px-4 py-2.5 bg-white/85 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring focus:ring-indigo-500/20 transition-all outline-none text-slate-700 text-sm"
                            >
                                <option value="">All Admins</option>
                                {availableFilters.admins.map(admin => (
                                    <option key={admin} value={admin}>{admin}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Action Type</label>
                            <select
                                value={filters.action}
                                onChange={(e) => {
                                    setFilters({ ...filters, action: e.target.value })
                                    setCurrentPage(1)
                                }}
                                className="w-full px-4 py-2.5 bg-white/85 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring focus:ring-indigo-500/20 transition-all outline-none text-slate-700 text-sm"
                            >
                                <option value="">All Actions</option>
                                {availableFilters.actionTypes.map(action => (
                                    <option key={action} value={action}>{formatAction(action)}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Start Date</label>
                            <input
                                type="date"
                                value={filters.startDate}
                                onChange={(e) => {
                                    setFilters({ ...filters, startDate: e.target.value })
                                    setCurrentPage(1)
                                }}
                                className="w-full px-4 py-2.5 bg-white/85 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring focus:ring-indigo-500/20 transition-all outline-none text-slate-700 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">End Date</label>
                            <input
                                type="date"
                                value={filters.endDate}
                                onChange={(e) => {
                                    setFilters({ ...filters, endDate: e.target.value })
                                    setCurrentPage(1)
                                }}
                                className="w-full px-4 py-2.5 bg-white/85 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring focus:ring-indigo-500/20 transition-all outline-none text-slate-700 text-sm"
                            />
                        </div>
                    </div>
                    {(filters.admin || filters.action || filters.startDate || filters.endDate) && (
                        <div className="mt-4 flex justify-end">
                            <button 
                                onClick={clearFilters}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-600 border border-rose-200/50 rounded-lg text-xs font-semibold hover:bg-rose-100 transition-colors"
                            >
                                <X className="w-3.5 h-3.5" />
                                Clear Filters
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Stats */}
            <div className="mb-4 inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-200/60 text-slate-500 rounded-full text-xs font-semibold">
                Total: <span className="text-slate-800 font-bold">{totalCount}</span> actions logged
            </div>

            {/* Activity List */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                </div>
            ) : logs.length === 0 ? (
                <div className="backdrop-blur-md bg-white/70 border border-slate-200/50 shadow-sm rounded-2xl p-10 text-center py-20">
                    <Activity className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                    <h3 className="text-base font-bold text-slate-700">No activities found</h3>
                    <p className="text-slate-500 text-sm mt-1">No log logs matches the selected filters.</p>
                </div>
            ) : (
                <>
                    <div className="backdrop-blur-md bg-white/70 border border-slate-200/50 shadow-sm rounded-2xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead className="bg-slate-50/70 border-b border-slate-100">
                                    <tr>
                                        <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Time</th>
                                        <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Admin</th>
                                        <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
                                        <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Target</th>
                                        <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Student</th>
                                        <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Details</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white/50">
                                    {logs.map((log) => {
                                        const details = parseDetails(log.details)
                                        return (
                                            <tr key={log.id} className="hover:bg-slate-50/60 transition-colors duration-150">
                                                <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-600">
                                                    <div className="flex items-center gap-1.5">
                                                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                        <span className="font-medium">{formatDate(log.createdAt)}</span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 whitespace-nowrap text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-7 h-7 bg-indigo-50 border border-indigo-200 text-indigo-600 font-bold text-xs rounded-full flex items-center justify-center">
                                                            {log.adminEmail?.charAt(0).toUpperCase()}
                                                        </div>
                                                        <span className="font-semibold text-slate-700 truncate max-w-[150px]" title={log.adminEmail}>
                                                            {log.adminEmail}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${getActionColor(log.action)}`}>
                                                        {getActionIcon(log.action)}
                                                        {formatAction(log.action)}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-600">
                                                    <span className="capitalize font-semibold text-slate-700">{log.targetType}</span>
                                                    <span className="text-slate-400 ml-1">#{log.targetId}</span>
                                                </td>
                                                <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-600 font-semibold max-w-[150px] truncate" title={log.studentEmail}>
                                                    {log.studentEmail || '-'}
                                                </td>
                                                <td className="px-5 py-4 text-sm text-slate-600 font-medium">
                                                    {details.oldScore !== undefined && details.newScore !== undefined ? (
                                                        <span className="inline-flex items-center gap-1.5">
                                                            <span className="text-slate-400 line-through">{details.oldScore}</span>
                                                            <span className="text-indigo-500 font-bold">→</span>
                                                            <span className="bg-indigo-50 border border-indigo-200/50 text-indigo-600 px-2 py-0.5 rounded font-bold">{details.newScore}</span>
                                                        </span>
                                                    ) : details.reason ? (
                                                        <span className="truncate max-w-[200px] block" title={details.reason}>{details.reason}</span>
                                                    ) : (
                                                        <span className="text-slate-400">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="mt-6 flex items-center justify-between">
                            <div className="text-sm text-slate-500 font-medium">
                                Page <span className="text-slate-800 font-bold">{currentPage}</span> of <span className="text-slate-800 font-bold">{totalPages}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1 || loading}
                                    className="flex items-center gap-1 px-4 py-2 border border-slate-200/80 rounded-xl bg-white text-slate-700 font-medium text-sm hover:bg-slate-50 disabled:opacity-50 active:scale-[0.98] transition-all duration-200"
                                >
                                    <ChevronLeft className="w-4 h-4 mr-1" />
                                    Previous
                                </button>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages || loading}
                                    className="flex items-center gap-1 px-4 py-2 border border-slate-200/80 rounded-xl bg-white text-slate-700 font-medium text-sm hover:bg-slate-50 disabled:opacity-50 active:scale-[0.98] transition-all duration-200"
                                >
                                    Next
                                    <ChevronRight className="w-4 h-4 ml-1" />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

export default ActivityLogPage
