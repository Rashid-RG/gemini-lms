"use client"
import React, { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { 
    Users, 
    AlertTriangle, 
    Crown,
    CreditCard,
    BookOpen,
    Loader2,
    RefreshCw,
    Plus,
    CheckCircle,
    Clock,
    XCircle,
    Search
} from 'lucide-react'
import { toast } from 'sonner'

function AdminUsersPage() {
    const { user, isLoaded } = useUser()
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [actionLoading, setActionLoading] = useState(null)
    const [creditModal, setCreditModal] = useState({ open: false, user: null })
    const [creditAmount, setCreditAmount] = useState(5)
    const [creditReason, setCreditReason] = useState('')

    const userEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase()
    const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
    const isAdmin = userEmail && adminEmails.includes(userEmail)

    useEffect(() => {
        if (isLoaded && isAdmin) {
            fetchUsers()
        }
    }, [isLoaded, isAdmin])

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
                adminEmail: userEmail
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
                adminEmail: userEmail
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

    const filteredUsers = users.filter(u => 
        u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.studentIdentifier?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (!isLoaded || loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!isAdmin) {
        return (
            <div className="p-8">
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
                    <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-red-700 dark:text-red-400 mb-2">Access Denied</h2>
                    <p className="text-red-600 dark:text-red-300">You don't have permission to manage users.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 dark:bg-slate-900/80 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm backdrop-blur-xl">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl">
                        <Users className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white bg-gradient-to-r from-slate-900 to-indigo-950 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">User Directory</h1>
                        <p className="text-sm text-slate-500 font-medium mt-0.5">{users.length} active registered student profiles</p>
                    </div>
                </div>
                <Button 
                    onClick={fetchUsers} 
                    variant="outline"
                    className="border-slate-200 hover:bg-slate-50 font-bold rounded-xl h-11 px-5 shadow-sm transition-all flex items-center gap-2"
                >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Refresh List
                </Button>
            </div>

            {/* Search */}
            <div className="bg-white/80 dark:bg-slate-900/80 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm backdrop-blur-xl">
                <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by name, email, or student ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-white/50 dark:bg-slate-950/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm placeholder-slate-400 transition-all"
                    />
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white/85 dark:bg-slate-900/85 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-800/60 overflow-hidden backdrop-blur-xl">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50/50 dark:bg-slate-950/50 border-b border-slate-200/60 dark:border-slate-800/60">
                            <tr>
                                <th className="px-5 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">User</th>
                                <th className="px-5 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Student ID</th>
                                <th className="px-5 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Membership</th>
                                <th className="px-5 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Available Credits</th>
                                <th className="px-5 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Course Generations</th>
                                <th className="px-5 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800/50">
                            {filteredUsers.map((u) => (
                                <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/30 transition-colors duration-150">
                                    <td className="px-5 py-4">
                                        <div>
                                            <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{u.name}</p>
                                            <p className="text-xs text-slate-500 font-medium mt-0.5">{u.email}</p>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 text-center">
                                        <span className="font-mono text-xs font-bold bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-lg border border-slate-200/40 dark:border-slate-800/40">{u.studentIdentifier || 'N/A'}</span>
                                    </td>
                                    <td className="px-5 py-4 text-center">
                                        {u.isMember ? (
                                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25 rounded-full text-xs font-bold">
                                                <Crown className="h-3 w-3 fill-amber-500" />
                                                Premium
                                            </span>
                                        ) : (
                                            <span className="text-slate-400 font-semibold text-xs bg-slate-50 dark:bg-slate-950 px-3 py-1 rounded-full border border-slate-200/40 dark:border-slate-800/40">Free</span>
                                        )}
                                    </td>
                                    <td className="px-5 py-4 text-center">
                                        <span className="inline-flex items-center gap-1.5 bg-indigo-50/50 dark:bg-indigo-950/30 px-3 py-1.5 rounded-xl border border-indigo-100/50 dark:border-indigo-900/30 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                                            <CreditCard className="h-3.5 w-3.5" />
                                            <span className="font-bold text-sm">{u.credits ?? 0}</span>
                                            <span className="text-indigo-400 font-normal">({u.totalCreditsUsed ?? 0} used)</span>
                                        </span>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center justify-center gap-3">
                                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-md border border-emerald-200/30">
                                                <CheckCircle className="h-3 w-3" />
                                                {u.courses?.ready || 0}
                                            </span>
                                            <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/20 px-2 py-0.5 rounded-md border border-amber-200/30">
                                                <Clock className="h-3 w-3" />
                                                {u.courses?.generating || 0}
                                            </span>
                                            <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/20 px-2 py-0.5 rounded-md border border-rose-200/30">
                                                <XCircle className="h-3 w-3" />
                                                {u.courses?.failed || 0}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setCreditModal({ open: true, user: u })}
                                                className="h-8 border-slate-200 font-bold hover:bg-slate-50 rounded-lg text-xs"
                                            >
                                                <Plus className="h-3 w-3 mr-1" />
                                                Adjust
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant={u.isMember ? "destructive" : "default"}
                                                onClick={() => handleToggleMembership(u)}
                                                disabled={actionLoading === u.email}
                                                className={`h-8 font-bold rounded-lg text-xs ${!u.isMember ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : ''}`}
                                            >
                                                {actionLoading === u.email ? (
                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                ) : u.isMember ? (
                                                    'Revoke'
                                                ) : (
                                                    'Grant Premium'
                                                )}
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Credits Modal */}
            {creditModal.open && (
                <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white/95 dark:bg-slate-900/95 rounded-2xl p-6 max-w-md w-full border border-slate-200/60 dark:border-slate-800/60 shadow-2xl backdrop-blur-2xl animate-in zoom-in-95 duration-200">
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-2">
                            <CreditCard className="h-5 w-5 text-indigo-600" />
                            Credit Manager
                        </h3>
                        <p className="text-sm text-slate-500 font-medium mb-5">
                            Modifying credits for: <span className="font-semibold text-slate-700 dark:text-slate-300">{creditModal.user?.email}</span>
                        </p>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Amount to Add</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={creditAmount}
                                    onChange={(e) => setCreditAmount(Number(e.target.value))}
                                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-bold"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Reason / Notes</label>
                                <input
                                    type="text"
                                    value={creditReason}
                                    onChange={(e) => setCreditReason(e.target.value)}
                                    placeholder="e.g. System bonus, test credits..."
                                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <Button 
                                variant="outline" 
                                onClick={() => setCreditModal({ open: false, user: null })}
                                className="border-slate-200 font-semibold rounded-xl"
                            >
                                Cancel
                            </Button>
                            <Button 
                                onClick={handleAddCredits}
                                disabled={actionLoading === 'credits' || creditAmount <= 0}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-md"
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
        </div>
    )
}

export default AdminUsersPage
