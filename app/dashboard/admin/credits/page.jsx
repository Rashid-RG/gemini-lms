"use client"
import React, { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { 
    CreditCard, 
    Users, 
    Plus, 
    Minus, 
    Search,
    RefreshCw,
    Crown,
    AlertCircle,
    CheckCircle,
    Loader2,
    ChevronDown,
    ChevronUp,
    History,
    Coins
} from 'lucide-react'
import { toast } from 'sonner'

function AdminCreditsPage() {
    const { user, isLoaded } = useUser()
    const [users, setUsers] = useState([])
    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedUser, setSelectedUser] = useState(null)
    const [adjustAmount, setAdjustAmount] = useState('')
    const [adjustReason, setAdjustReason] = useState('')
    const [adjusting, setAdjusting] = useState(false)
    const [expandedUser, setExpandedUser] = useState(null)
    const [transactions, setTransactions] = useState([])
    const [loadingTransactions, setLoadingTransactions] = useState(false)

    const userEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase()
    const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
    const isAdmin = userEmail && adminEmails.includes(userEmail)

    useEffect(() => {
        if (isLoaded && isAdmin) {
            fetchCreditsData()
        }
    }, [isLoaded, isAdmin])

    const fetchCreditsData = async () => {
        try {
            setRefreshing(true)
            const response = await axios.get('/api/admin/credits')
            setUsers(response.data.users || [])
            setStats(response.data.stats || null)
        } catch (error) {
            console.error('Error fetching credits:', error)
            toast.error('Failed to load credits data')
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    const fetchUserTransactions = async (email) => {
        try {
            setLoadingTransactions(true)
            const response = await axios.get(`/api/admin/credits?email=${encodeURIComponent(email)}`)
            setTransactions(response.data.transactions || [])
        } catch (error) {
            console.error('Error fetching transactions:', error)
            toast.error('Failed to load transaction history')
        } finally {
            setLoadingTransactions(false)
        }
    }

    const handleExpandUser = (email) => {
        if (expandedUser === email) {
            setExpandedUser(null)
            setTransactions([])
        } else {
            setExpandedUser(email)
            fetchUserTransactions(email)
        }
    }

    const handleAdjustCredits = async (email, amount) => {
        if (!amount || isNaN(parseInt(amount))) {
            toast.error('Please enter a valid amount')
            return
        }

        try {
            setAdjusting(true)
            await axios.post('/api/admin/credits', {
                email: email,
                amount: parseInt(amount),
                reason: adjustReason || 'Admin adjustment',
                adminEmail: userEmail
            })
            toast.success(`Credits ${amount > 0 ? 'added' : 'deducted'} successfully!`)
            setSelectedUser(null)
            setAdjustAmount('')
            setAdjustReason('')
            fetchCreditsData()
            if (expandedUser === email) {
                fetchUserTransactions(email)
            }
        } catch (error) {
            console.error('Error adjusting credits:', error)
            toast.error('Failed to adjust credits')
        } finally {
            setAdjusting(false)
        }
    }

    const handleChangeMembership = async (email, isPremium) => {
        try {
            await axios.put('/api/admin/credits', {
                email: email,
                isMember: isPremium,
                adminEmail: userEmail
            })
            toast.success(`Membership changed to ${isPremium ? 'premium' : 'free'}!`)
            fetchCreditsData()
        } catch (error) {
            console.error('Error changing membership:', error)
            toast.error('Failed to change membership')
        }
    }

    const filteredUsers = users.filter(u => 
        u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const formatDate = (date) => {
        if (!date) return 'N/A'
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })
    }

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
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-red-700 mb-2">Access Denied</h2>
                    <p className="text-red-600">You don't have permission to access this page.</p>
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
                        <CreditCard className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white bg-gradient-to-r from-slate-900 to-indigo-950 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">Credits Manager</h1>
                        <p className="text-sm text-slate-500 font-medium mt-0.5">Manage user credits and premium memberships</p>
                    </div>
                </div>
                <Button 
                    onClick={fetchCreditsData} 
                    disabled={refreshing}
                    variant="outline"
                    className="border-slate-200 hover:bg-slate-50 font-bold rounded-xl h-11 px-5 shadow-sm transition-all flex items-center gap-2"
                >
                    <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh Credits
                </Button>
            </div>

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-indigo-200/40 rounded-2xl p-5 shadow-sm">
                        <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mb-2" />
                        <p className="text-3xl font-black text-slate-800 dark:text-white">{stats.totalUsers}</p>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mt-1">Total Users</p>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-200/40 rounded-2xl p-5 shadow-sm">
                        <Coins className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mb-2" />
                        <p className="text-3xl font-black text-slate-800 dark:text-white">{stats.totalCredits}</p>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mt-1">Total Credits</p>
                    </div>
                    <div className="bg-gradient-to-br from-slate-500/10 to-slate-600/10 border border-slate-200/40 rounded-2xl p-5 shadow-sm">
                        <Users className="w-5 h-5 text-slate-600 dark:text-slate-400 mb-2" />
                        <p className="text-3xl font-black text-slate-800 dark:text-white">{stats.freeUsers}</p>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mt-1">Free Users</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500/10 to-violet-500/10 border border-purple-200/40 rounded-2xl p-5 shadow-sm">
                        <Crown className="w-5 h-5 text-purple-600 dark:text-purple-400 mb-2" />
                        <p className="text-3xl font-black text-slate-800 dark:text-white">{stats.premiumUsers}</p>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mt-1">Premium Members</p>
                    </div>
                    <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-200/40 rounded-2xl p-5 shadow-sm">
                        <CreditCard className="w-5 h-5 text-amber-600 dark:text-amber-400 mb-2" />
                        <p className="text-3xl font-black text-slate-800 dark:text-white">{stats.averageCredits}</p>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mt-1">Avg Credits</p>
                    </div>
                </div>
            )}

            {/* Search */}
            <div className="bg-white/80 dark:bg-slate-900/80 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm backdrop-blur-xl">
                <div className="relative max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-white/50 dark:bg-slate-950/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm placeholder-slate-400 transition-all"
                    />
                </div>
            </div>

            {/* Users List */}
            <div className="bg-white/85 dark:bg-slate-900/85 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl overflow-hidden shadow-sm backdrop-blur-xl">
                <div className="grid grid-cols-12 gap-4 p-4 bg-slate-50/50 dark:bg-slate-950/50 border-b border-slate-200/60 dark:border-slate-800/60 font-bold text-xs text-slate-500 uppercase tracking-wider">
                    <div className="col-span-4">User</div>
                    <div className="col-span-2 text-center">Credits</div>
                    <div className="col-span-2 text-center">Membership</div>
                    <div className="col-span-2 text-center">Joined</div>
                    <div className="col-span-2 text-center">Actions</div>
                </div>

                {filteredUsers.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 font-semibold text-sm">
                        No user profiles matched search query
                    </div>
                ) : (
                    filteredUsers.map((u) => (
                        <div key={u.id} className="border-b border-slate-200/50 dark:border-slate-800/50 last:border-0">
                            <div className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-slate-50/30 dark:hover:bg-slate-950/30 transition-colors duration-150">
                                <div className="col-span-4">
                                    <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{u.name || 'Unknown'}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">{u.email}</p>
                                </div>
                                <div className="col-span-2 text-center">
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${
                                        u.credits >= 9999 ? 'bg-purple-500/10 text-purple-700 border-purple-500/20 dark:text-purple-400' :
                                        u.credits > 0 ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400' : 
                                        'bg-rose-500/10 text-rose-700 border-rose-500/20 dark:text-rose-400'
                                    }`}>
                                        <Coins className="w-3.5 h-3.5" />
                                        {u.credits >= 9999 ? '∞' : u.credits ?? 5}
                                    </span>
                                </div>
                                <div className="col-span-2 text-center">
                                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${
                                        u.isMember 
                                            ? 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400' 
                                            : 'bg-slate-100 text-slate-500 border-slate-200/40 dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800/40'
                                    }`}>
                                        {u.isMember && <Crown className="w-3.5 h-3.5 fill-amber-500" />}
                                        {u.isMember ? 'premium' : 'free'}
                                    </span>
                                </div>
                                <div className="col-span-2 text-center text-xs text-slate-500 font-medium">
                                    {formatDate(u.createdAt)}
                                </div>
                                <div className="col-span-2 flex items-center justify-center gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setSelectedUser(u)}
                                        className="h-8 border-slate-200 font-bold hover:bg-slate-50 rounded-lg text-xs"
                                    >
                                        <Plus className="w-3 h-3 mr-1" />
                                        Adjust
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleExpandUser(u.email)}
                                        className="h-8 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg"
                                    >
                                        {expandedUser === u.email ? (
                                            <ChevronUp className="w-4 h-4 text-slate-500" />
                                        ) : (
                                            <ChevronDown className="w-4 h-4 text-slate-500" />
                                        )}
                                    </Button>
                                </div>
                            </div>

                            {/* Expanded Section - Transaction History & Quick Actions */}
                            {expandedUser === u.email && (
                                <div className="bg-slate-50/50 dark:bg-slate-950/20 p-4 border-t border-slate-200/50 dark:border-slate-800/50 animate-in slide-in-from-top-3 duration-200">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Quick Actions */}
                                        <div className="bg-white/80 dark:bg-slate-900/80 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm">
                                            <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm mb-4 flex items-center gap-2">
                                                <CreditCard className="w-4 h-4 text-indigo-500" /> Quick Actions
                                            </h4>
                                            <div className="space-y-4">
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleAdjustCredits(u.email, 5)}
                                                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg h-9 text-xs"
                                                    >
                                                        <Plus className="w-3.5 h-3.5 mr-1" /> Add 5
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleAdjustCredits(u.email, 10)}
                                                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg h-9 text-xs"
                                                    >
                                                        <Plus className="w-3.5 h-3.5 mr-1" /> Add 10
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleAdjustCredits(u.email, 30)}
                                                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg h-9 text-xs"
                                                    >
                                                        <Plus className="w-3.5 h-3.5 mr-1" /> Add 30
                                                    </Button>
                                                </div>
                                                <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                                                    {!u.isMember ? (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleChangeMembership(u.email, true)}
                                                            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg h-9 text-xs flex items-center gap-1"
                                                        >
                                                            <Crown className="w-3.5 h-3.5 fill-slate-950" /> Upgrade to Premium
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleChangeMembership(u.email, false)}
                                                            className="border-slate-200 font-bold rounded-lg h-9 text-xs"
                                                        >
                                                            Downgrade to Free
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Transaction History */}
                                        <div className="bg-white/80 dark:bg-slate-900/80 p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm">
                                            <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm mb-4 flex items-center gap-2">
                                                <History className="w-4 h-4 text-indigo-500" /> Recent Transactions
                                            </h4>
                                            {loadingTransactions ? (
                                                <div className="flex items-center justify-center py-6">
                                                    <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                                                </div>
                                            ) : transactions.length === 0 ? (
                                                <p className="text-xs text-slate-400 py-4 font-semibold italic">No transaction records found</p>
                                            ) : (
                                                <div className="space-y-3 max-h-40 overflow-y-auto pr-1">
                                                    {transactions.slice(0, 5).map((t, i) => (
                                                        <div key={i} className="flex items-center justify-between text-xs border-b border-slate-100 dark:border-slate-800 pb-2 last:border-0 last:pb-0">
                                                            <div>
                                                                <p className="font-semibold text-slate-700 dark:text-slate-300">{t.description || t.type}</p>
                                                                <p className="text-[10px] text-slate-400 font-medium mt-0.5">{formatDate(t.createdAt)}</p>
                                                            </div>
                                                            <span className={`font-bold text-sm ${t.amount > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                                {t.amount > 0 ? '+' : ''}{t.amount}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Adjust Credits Modal */}
            {selectedUser && (
                <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white/95 dark:bg-slate-900/95 rounded-2xl p-6 max-w-md w-full border border-slate-200/60 dark:border-slate-800/60 shadow-2xl backdrop-blur-2xl animate-in zoom-in-95 duration-200">
                        <h3 className="text-xl font-bold mb-2 flex items-center gap-2 text-slate-800 dark:text-white">
                            <Plus className="w-5 h-5 text-indigo-600" />
                            Adjust Credits
                        </h3>
                        <p className="text-sm text-slate-500 font-medium mb-5">
                            User: <strong className="text-slate-700 dark:text-slate-300">{selectedUser.name || selectedUser.email}</strong>
                            <br />
                            Current Balance: <strong className="text-indigo-600">{selectedUser.credits ?? 5} credits</strong>
                        </p>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                    Amount (+ to add, - to deduct)
                                </label>
                                <input
                                    type="number"
                                    value={adjustAmount}
                                    onChange={(e) => setAdjustAmount(e.target.value)}
                                    placeholder="e.g. 5 or -3"
                                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-bold"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                                    Reason / Reference
                                </label>
                                <input
                                    type="text"
                                    value={adjustReason}
                                    onChange={(e) => setAdjustReason(e.target.value)}
                                    placeholder="e.g. Customer support top-up"
                                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setSelectedUser(null)
                                    setAdjustAmount('')
                                    setAdjustReason('')
                                }}
                                className="flex-1 border-slate-200 font-semibold rounded-xl"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={() => handleAdjustCredits(selectedUser.email, adjustAmount)}
                                disabled={adjusting || !adjustAmount}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-md"
                            >
                                {adjusting ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                ) : null}
                                Apply Adjustment
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AdminCreditsPage
