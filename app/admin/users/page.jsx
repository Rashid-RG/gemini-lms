"use client"
import React, { useState, useEffect } from 'react'
import { useAdminAuth } from '@/app/_context/AdminAuthContext'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { AdminPageShell, AdminPageHeader, AdminSurface } from '@/components/admin/AdminPageShell'
import { 
    Users, 
    Crown,
    CreditCard,
    Loader2,
    RefreshCw,
    Plus,
    CheckCircle,
    Clock,
    XCircle,
    Search,
    BookOpen,
    Trophy,
    ClipboardList,
    Award,
    Activity,
    Calendar,
    X
} from 'lucide-react'
import { toast } from 'sonner'

function AdminUsersPage() {
    const { admin, loading: authLoading } = useAdminAuth()
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [actionLoading, setActionLoading] = useState(null)
    const [creditModal, setCreditModal] = useState({ open: false, user: null })
    const [creditAmount, setCreditAmount] = useState(5)
    const [creditReason, setCreditReason] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [progressModal, setProgressModal] = useState({ open: false, user: null, loading: false, data: null })
    const [activeTab, setActiveTab] = useState('overview')
    const itemsPerPage = 10

    const handleViewProgress = async (targetUser) => {
        setProgressModal({ open: true, user: targetUser, loading: true, data: null })
        setActiveTab('overview')
        try {
            const response = await axios.get(`/api/admin/users/progress?email=${targetUser.email}`)
            setProgressModal(prev => ({ ...prev, loading: false, data: response.data }))
        } catch (error) {
            console.error('Error fetching progress:', error)
            toast.error('Failed to load student progress details')
            setProgressModal({ open: false, user: null, loading: false, data: null })
        }
    }

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value)
        setCurrentPage(1)
    }

    useEffect(() => {
        if (!authLoading && admin) {
            fetchUsers()
        }
    }, [authLoading, admin])

    const fetchUsers = async () => {
        try {
            setLoading(true)
            const response = await axios.get('/api/admin/users')
            setUsers(response.data.users || [])
        } catch (error) {
            console.error('Error fetching users:', error)
            toast.error('Failed to load users')
        } finally {
            setLoading(false)
        }
    }

    const handleAddCredits = async () => {
        if (!creditModal.user || creditAmount <= 0) return

        try {
            setActionLoading('credits')
            const response = await axios.post('/api/admin/users', {
                action: 'add_credits',
                userEmail: creditModal.user.email,
                amount: creditAmount,
                reason: creditReason || `Admin added ${creditAmount} credits`,
                adminEmail: admin?.email
            })

            if (response.data.success) {
                toast.success(`Added ${creditAmount} credits to ${creditModal.user.email}`)
                setCreditModal({ open: false, user: null })
                setCreditAmount(5)
                setCreditReason('')
                fetchUsers()
            }
        } catch (error) {
            toast.error('Failed to add credits')
        } finally {
            setActionLoading(null)
        }
    }

    const handleToggleMembership = async (targetUser) => {
        try {
            setActionLoading(targetUser.email)
            const response = await axios.post('/api/admin/users', {
                action: 'toggle_membership',
                userEmail: targetUser.email,
                adminEmail: admin?.email
            })

            if (response.data.success) {
                toast.success(response.data.message)
                fetchUsers()
            }
        } catch (error) {
            toast.error('Failed to update membership')
        } finally {
            setActionLoading(null)
        }
    }

    const handleDeleteCertificate = async (certificateId) => {
        if (!confirm(`Are you sure you want to permanently delete/revoke certificate ${certificateId}? This will reset the student's progress for this course back to In Progress.`)) return;

        try {
            setActionLoading(`delete_cert_${certificateId}`);
            const response = await axios.delete(`/api/admin/certificates?certificateId=${certificateId}`);
            if (response.data.success) {
                toast.success(response.data.message || 'Certificate revoked successfully');
                // Refresh progress modal data
                if (progressModal.user) {
                    const freshDataRes = await axios.get(`/api/admin/users/progress?email=${progressModal.user.email}`);
                    setProgressModal(prev => ({ ...prev, data: freshDataRes.data }));
                }
            }
        } catch (error) {
            console.error('Error deleting certificate:', error);
            toast.error(error.response?.data?.error || 'Failed to delete certificate');
        } finally {
            setActionLoading(null);
        }
    }

    const filteredUsers = users.filter(u => 
        u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.studentIdentifier?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1
    const startIndex = (currentPage - 1) * itemsPerPage
    const paginatedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage)

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <AdminPageShell>
            <AdminPageHeader
                title="User Management"
                description={`${users.length} total users`}
                icon={Users}
                actions={
                <Button onClick={fetchUsers} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                </Button>
                }
            />

            {/* Search */}
            <div className="mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name, email, or student ID..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                </div>
            </div>

            {/* Users Table */}
            <AdminSurface className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">User</th>
                                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600 dark:text-gray-300">Student ID</th>
                                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600 dark:text-gray-300">Member</th>
                                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600 dark:text-gray-300">Credits</th>
                                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600 dark:text-gray-300">Courses</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600 dark:text-gray-300">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {paginatedUsers.map((u) => (
                                <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-4 py-3">
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">{u.name}</p>
                                            {u.email && <p className="text-sm text-gray-500">{u.email}</p>}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className="font-mono text-sm text-gray-700 dark:text-gray-200">{u.studentIdentifier || 'N/A'}</span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {u.isMember ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full text-xs">
                                                <Crown className="h-3 w-3" />
                                                Member
                                            </span>
                                        ) : (
                                            <span className="text-gray-400 text-sm">Free</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className="inline-flex items-center gap-1">
                                            <CreditCard className="h-4 w-4 text-primary" />
                                            <span className="font-medium">{u.credits ?? 0}</span>
                                            <span className="text-gray-400 text-sm">({u.totalCreditsUsed ?? 0} used)</span>
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-center gap-2">
                                            <span className="inline-flex items-center gap-1 text-green-600">
                                                <CheckCircle className="h-3 w-3" />
                                                {u.courses?.ready || 0}
                                            </span>
                                            <span className="inline-flex items-center gap-1 text-yellow-600">
                                                <Clock className="h-3 w-3" />
                                                {u.courses?.generating || 0}
                                            </span>
                                            <span className="inline-flex items-center gap-1 text-red-600">
                                                <XCircle className="h-3 w-3" />
                                                {u.courses?.failed || 0}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-2 flex-wrap">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400 dark:hover:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900/50"
                                                onClick={() => handleViewProgress(u)}
                                            >
                                                Progress
                                            </Button>
                                            {admin?.role !== 'tutor' && (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => setCreditModal({ open: true, user: u })}
                                                    >
                                                        <Plus className="h-3 w-3 mr-1" />
                                                        Credits
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant={u.isMember ? "destructive" : "default"}
                                                        onClick={() => handleToggleMembership(u)}
                                                        disabled={actionLoading === u.email}
                                                    >
                                                        {actionLoading === u.email ? (
                                                            <Loader2 className="h-3 w-3 animate-spin" />
                                                        ) : u.isMember ? (
                                                            'Remove'
                                                        ) : (
                                                            'Make Member'
                                                        )}
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                        >
                            Previous
                        </Button>
                        <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                            Page {currentPage} of {totalPages}
                        </span>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                        >
                            Next
                        </Button>
                    </div>
                )}
            </AdminSurface>

            {/* Add Credits Modal */}
            {creditModal.open && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
                        <h3 className="text-lg font-semibold mb-4">Add Credits</h3>
                        <p className="text-sm text-gray-500 mb-4">
                            Adding credits to: <span className="font-medium">{creditModal.user?.email}</span>
                        </p>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Amount</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={creditAmount}
                                    onChange={(e) => setCreditAmount(Number(e.target.value))}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Reason (optional)</label>
                                <input
                                    type="text"
                                    value={creditReason}
                                    onChange={(e) => setCreditReason(e.target.value)}
                                    placeholder="e.g., Support compensation, bonus..."
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <Button 
                                variant="outline" 
                                onClick={() => setCreditModal({ open: false, user: null })}
                            >
                                Cancel
                            </Button>
                            <Button 
                                onClick={handleAddCredits}
                                disabled={actionLoading === 'credits' || creditAmount <= 0}
                            >
                                {actionLoading === 'credits' ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <Plus className="h-4 w-4 mr-2" />
                                )}
                                Add {creditAmount} Credits
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Student Progress Modal */}
            {progressModal.open && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 overflow-y-auto p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-4xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/20">
                            <div>
                                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Student Progress Details</h3>
                                <p className="text-sm text-slate-500 mt-0.5">
                                    Full learning analytics and academic history for: <span className="font-semibold text-indigo-600 dark:text-indigo-400">{progressModal.user?.name}</span> ({progressModal.user?.email})
                                </p>
                            </div>
                            <button 
                                onClick={() => setProgressModal({ open: false, user: null, loading: false, data: null })}
                                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl transition hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {progressModal.loading ? (
                            <div className="flex flex-col items-center justify-center p-12 min-h-[400px]">
                                <Loader2 className="h-10 w-10 animate-spin text-indigo-600 dark:text-indigo-400 mb-3" />
                                <p className="text-sm font-semibold text-slate-500 animate-pulse">Loading progress metrics...</p>
                            </div>
                        ) : progressModal.data ? (
                            <div>
                                {/* Tabs */}
                                <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 bg-slate-50/50 dark:bg-slate-950/10">
                                    {['overview', 'courses', 'scores', 'certificates'].map((tab) => (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveTab(tab)}
                                            className={`py-3 px-4 text-sm font-bold border-b-2 transition-all capitalize -mb-px ${
                                                activeTab === tab
                                                    ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                                                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                            }`}
                                        >
                                            {tab === 'scores' ? 'Grades & Scores' : tab}
                                        </button>
                                    ))}
                                </div>

                                {/* Modal Content Container */}
                                <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6">
                                    {/* 1. OVERVIEW TAB */}
                                    {activeTab === 'overview' && (
                                        <div className="space-y-6">
                                            {/* General Info Cards */}
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/65 dark:border-slate-700/60">
                                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Account Status</p>
                                                    <p className="text-lg font-black text-slate-800 dark:text-white mt-1 flex items-center gap-1.5">
                                                        {progressModal.data.user?.isMember ? (
                                                            <>
                                                                <Crown className="h-5 w-5 text-amber-500 fill-amber-500/20" />
                                                                Premium Member
                                                            </>
                                                        ) : (
                                                            'Free Tier'
                                                        )}
                                                    </p>
                                                </div>
                                                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/65 dark:border-slate-700/60">
                                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Course Credits</p>
                                                    <p className="text-lg font-black text-slate-800 dark:text-white mt-1 flex items-center gap-1.5">
                                                        <CreditCard className="h-5 w-5 text-indigo-500" />
                                                        {progressModal.data.user?.credits}
                                                    </p>
                                                </div>
                                                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/65 dark:border-slate-700/60">
                                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Courses Enrolled</p>
                                                    <p className="text-lg font-black text-slate-800 dark:text-white mt-1 flex items-center gap-1.5">
                                                        <BookOpen className="h-5 w-5 text-emerald-500" />
                                                        {progressModal.data.enrollments?.length || 0}
                                                    </p>
                                                </div>
                                                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/65 dark:border-slate-700/60">
                                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Certificates Earned</p>
                                                    <p className="text-lg font-black text-slate-800 dark:text-white mt-1 flex items-center gap-1.5">
                                                        <Trophy className="h-5 w-5 text-yellow-500" />
                                                        {progressModal.data.certificates?.length || 0}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Detailed Profile Info */}
                                            <div className="bg-slate-50 dark:bg-slate-800/20 rounded-xl p-5 border border-slate-200/60 dark:border-slate-800/60">
                                                <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                                                    <Users className="h-4 w-4 text-slate-400" />
                                                    Personal Profile Information
                                                </h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 text-sm">
                                                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/50 pb-2">
                                                        <span className="text-slate-400">Full Name</span>
                                                        <span className="font-semibold text-slate-700 dark:text-slate-200">{progressModal.data.user?.name || 'N/A'}</span>
                                                    </div>
                                                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/50 pb-2">
                                                        <span className="text-slate-400">Student ID</span>
                                                        <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">{progressModal.data.user?.studentIdentifier || 'N/A'}</span>
                                                    </div>
                                                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/50 pb-2">
                                                        <span className="text-slate-400">Phone Number</span>
                                                        <span className="font-semibold text-slate-700 dark:text-slate-200">{progressModal.data.user?.phoneNumber || 'N/A'}</span>
                                                    </div>
                                                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/50 pb-2">
                                                        <span className="text-slate-400">Joined Date</span>
                                                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                                                            {progressModal.data.user?.createdAt ? new Date(progressModal.data.user.createdAt).toLocaleDateString() : 'N/A'}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/50 pb-2 md:col-span-2">
                                                        <span className="text-slate-400">Mailing Address</span>
                                                        <span className="font-semibold text-slate-700 dark:text-slate-200 text-right">{progressModal.data.user?.address || 'N/A'}</span>
                                                    </div>
                                                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800/50 pb-2">
                                                        <span className="text-slate-400">Emergency Contact</span>
                                                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                                                            {progressModal.data.user?.emergencyContactName || 'N/A'} 
                                                            {progressModal.data.user?.emergencyContactPhone ? ` (${progressModal.data.user.emergencyContactPhone})` : ''}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* 2. COURSES TAB */}
                                    {activeTab === 'courses' && (
                                        <div className="space-y-4">
                                            <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 mb-2">Enrollment and Course History</h4>
                                            {progressModal.data.enrollments?.length === 0 ? (
                                                <div className="text-center py-8 text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                                                    No course enrollment records found.
                                                </div>
                                            ) : (
                                                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                                                    <table className="w-full text-sm">
                                                        <thead className="bg-slate-50 dark:bg-slate-800">
                                                            <tr className="border-b border-slate-200 dark:border-slate-800">
                                                                <th className="text-left p-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Course</th>
                                                                <th className="text-center p-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Type</th>
                                                                <th className="text-center p-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Date Enrolled</th>
                                                                <th className="text-center p-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Progress</th>
                                                                <th className="text-center p-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Time Spent</th>
                                                                <th className="text-center p-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Cert</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                                            {progressModal.data.enrollments.map((enr) => (
                                                                <tr key={enr.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                                                    <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                                                                        {enr.courseTopic || 'Unknown Course'}
                                                                    </td>
                                                                    <td className="p-3 text-center text-xs text-slate-500 dark:text-slate-400">
                                                                        {enr.courseType}
                                                                    </td>
                                                                    <td className="p-3 text-center text-xs">
                                                                        {enr.enrolledAt ? new Date(enr.enrolledAt).toLocaleDateString() : 'N/A'}
                                                                    </td>
                                                                    <td className="p-3">
                                                                        <div className="flex items-center justify-center gap-2">
                                                                            <div className="w-20 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                                                                                <div 
                                                                                    className="bg-emerald-500 h-1.5 rounded-full" 
                                                                                    style={{ width: `${enr.completionPercentage || 0}%` }}
                                                                                ></div>
                                                                            </div>
                                                                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-350">
                                                                                {enr.completionPercentage || 0}%
                                                                            </span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="p-3 text-center text-xs font-medium">
                                                                        {enr.totalTimeSpent || 0} mins
                                                                    </td>
                                                                    <td className="p-3 text-center">
                                                                        {enr.certificateIssued ? (
                                                                            <span className="inline-flex items-center px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-[10px] font-bold">
                                                                                Issued
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-slate-400 text-xs">-</span>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* 3. GRADES & SCORES TAB */}
                                    {activeTab === 'scores' && (
                                        <div className="space-y-6">
                                            {/* Graded Course Aggregates */}
                                            <div>
                                                <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                                                    <Activity className="h-4 w-4 text-emerald-500" />
                                                    Course Grades and Progress Records
                                                </h4>
                                                {progressModal.data.progressRecords?.length === 0 ? (
                                                    <div className="text-center py-6 text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-sm">
                                                        No progress performance logs found.
                                                    </div>
                                                ) : (
                                                    <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                                                        <table className="w-full text-sm">
                                                            <thead className="bg-slate-50 dark:bg-slate-800">
                                                                <tr className="border-b border-slate-200 dark:border-slate-800">
                                                                    <th className="text-left p-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Course</th>
                                                                    <th className="text-center p-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Quiz Avg</th>
                                                                    <th className="text-center p-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Assign Avg</th>
                                                                    <th className="text-center p-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Calculated Grade</th>
                                                                    <th className="text-center p-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Status</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                                                {progressModal.data.progressRecords.map((prog) => {
                                                                    const parseScores = (scoresObj) => {
                                                                        try {
                                                                            const obj = typeof scoresObj === 'string' ? JSON.parse(scoresObj || '{}') : (scoresObj || {});
                                                                            const vals = Object.values(obj).map(Number).filter(v => !isNaN(v));
                                                                            return vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
                                                                        } catch {
                                                                            return 0;
                                                                        }
                                                                    };
                                                                    const qAvg = parseScores(prog.quizScores);
                                                                    const aAvg = parseScores(prog.assignmentScores);
                                                                    return (
                                                                        <tr key={prog.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                                                            <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                                                                                {prog.courseTopic || 'Unknown Course'}
                                                                            </td>
                                                                            <td className="p-3 text-center font-bold text-indigo-650 dark:text-indigo-400">
                                                                                {qAvg}%
                                                                            </td>
                                                                            <td className="p-3 text-center font-bold text-sky-750 dark:text-sky-400">
                                                                                {aAvg}%
                                                                            </td>
                                                                            <td className="p-3 text-center font-black text-slate-800 dark:text-slate-100">
                                                                                {prog.finalScore ?? 0}%
                                                                            </td>
                                                                            <td className="p-3 text-center">
                                                                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                                                                    prog.status === 'Completed' 
                                                                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                                                                                        : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400'
                                                                                }`}>
                                                                                    {prog.status || 'In Progress'}
                                                                                </span>
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Graded Assignment Submissions */}
                                            <div>
                                                <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                                                    <ClipboardList className="h-4 w-4 text-sky-500" />
                                                    Detailed Assignment Submissions
                                                </h4>
                                                {progressModal.data.submissions?.length === 0 ? (
                                                    <div className="text-center py-6 text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-sm">
                                                        No assignment submissions have been graded yet.
                                                    </div>
                                                ) : (
                                                    <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                                                        <table className="w-full text-sm">
                                                            <thead className="bg-slate-50 dark:bg-slate-800">
                                                                <tr className="border-b border-slate-200 dark:border-slate-800">
                                                                    <th className="text-left p-3 text-xs font-bold text-slate-500 dark:text-slate-405 uppercase">Course</th>
                                                                    <th className="text-left p-3 text-xs font-bold text-slate-500 dark:text-slate-405 uppercase">Assignment ID</th>
                                                                    <th className="text-center p-3 text-xs font-bold text-slate-500 dark:text-slate-405 uppercase">Score</th>
                                                                    <th className="text-center p-3 text-xs font-bold text-slate-500 dark:text-slate-405 uppercase">Status</th>
                                                                    <th className="text-center p-3 text-xs font-bold text-slate-500 dark:text-slate-405 uppercase">Submitted</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                                                {progressModal.data.submissions.map((sub) => (
                                                                    <tr key={sub.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                                                        <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                                                                            {sub.courseTopic || 'Unknown Course'}
                                                                        </td>
                                                                        <td className="p-3 font-mono text-xs text-slate-500 dark:text-slate-400">
                                                                            {sub.assignmentId}
                                                                        </td>
                                                                        <td className="p-3 text-center font-bold text-emerald-650 dark:text-emerald-400">
                                                                            {sub.score !== null ? `${sub.score}%` : 'Pending'}
                                                                        </td>
                                                                        <td className="p-3 text-center">
                                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                                                sub.status === 'graded' 
                                                                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400' 
                                                                                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-450'
                                                                            }`}>
                                                                                {sub.status || 'submitted'}
                                                                            </span>
                                                                        </td>
                                                                        <td className="p-3 text-center text-xs text-slate-505 dark:text-slate-455">
                                                                            {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : 'N/A'}
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* 4. CERTIFICATES TAB */}
                                    {activeTab === 'certificates' && (
                                        <div className="space-y-4">
                                            <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 mb-2">Earned Course Certificates</h4>
                                            {progressModal.data.certificates?.length === 0 ? (
                                                <div className="text-center py-8 text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                                                    No certificates earned yet.
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {progressModal.data.certificates.map((cert) => (
                                                        <div key={cert.id} className="relative border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 p-5 rounded-xl space-y-3">
                                                            <div className="flex items-center justify-between">
                                                                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg text-indigo-600 dark:text-indigo-400">
                                                                    <Award className="h-5 w-5" />
                                                                </div>
                                                                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                                                                    Verified
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <h5 className="font-extrabold text-slate-900 dark:text-white line-clamp-1">{cert.courseName}</h5>
                                                                <p className="text-xs text-slate-500 mt-0.5">Final Score: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{cert.finalScore}%</span></p>
                                                            </div>
                                                            <div className="bg-white dark:bg-slate-900 border border-slate-150/60 dark:border-slate-800 rounded-lg p-2.5">
                                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Certificate ID</p>
                                                                <p className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300 break-all mt-0.5 select-all">{cert.certificateId}</p>
                                                            </div>
                                                            <div className="text-xs text-slate-505 dark:text-slate-455 flex items-center gap-1">
                                                                <Calendar className="h-3.5 w-3.5" />
                                                                <span>Completed on: {new Date(cert.completedAt).toLocaleDateString()}</span>
                                                            </div>
                                                            {admin?.role !== 'tutor' && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="destructive"
                                                                    className="w-full mt-2 bg-red-50 hover:bg-red-600 hover:text-white text-red-600 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-900/50 rounded-xl font-bold h-9"
                                                                    onClick={() => handleDeleteCertificate(cert.certificateId)}
                                                                    disabled={actionLoading === `delete_cert_${cert.certificateId}`}
                                                                >
                                                                    {actionLoading === `delete_cert_${cert.certificateId}` ? (
                                                                        <>
                                                                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                                                                            Revoking...
                                                                        </>
                                                                    ) : (
                                                                        'Revoke Certificate'
                                                                    )}
                                                                </Button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Modal Footer */}
                                <div className="flex justify-end p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/20">
                                    <Button 
                                        onClick={() => setProgressModal({ open: false, user: null, loading: false, data: null })}
                                        className="bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 text-white font-bold rounded-xl shadow-md transition active:scale-95"
                                    >
                                        Close Details
                                    </Button>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}
        </AdminPageShell>
    )
}

export default AdminUsersPage
