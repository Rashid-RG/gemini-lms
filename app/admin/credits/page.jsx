"use client"
import React, { useState, useEffect } from 'react'
import { useAdminAuth } from '@/app/_context/AdminAuthContext'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { 
    CreditCard, 
    Users, 
    Plus, 
    Search,
    RefreshCw,
    Crown,
    Loader2,
    ChevronDown,
    ChevronUp,
    History,
    Coins
} from 'lucide-react'
import { toast } from 'sonner'

function AdminCreditsPage() {
    const { admin, loading: authLoading } = useAdminAuth()
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

    useEffect(() => {
        if (!authLoading && admin) {
            fetchCreditsData()
        }
    }, [authLoading, admin])

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
                adminEmail: admin?.email
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
                adminEmail: admin?.email
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

    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/10 rounded-xl">
                        <CreditCard className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Credits Management</h1>
                        <p className="text-gray-500">Manage user credits and memberships</p>
                    </div>
                </div>
                <Button onClick={fetchCreditsData} disabled={refreshing} variant="outline">
                    <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                        <Users className="w-6 h-6 text-blue-600 mb-2" />
                        <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{stats.totalUsers}</p>
                        <p className="text-sm text-blue-600">Total Users</p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                        <Coins className="w-6 h-6 text-green-600 mb-2" />
                        <p className="text-2xl font-bold text-green-700 dark:text-green-400">{stats.totalCredits}</p>
                        <p className="text-sm text-green-600">Total Credits</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                        <Users className="w-6 h-6 text-gray-600 mb-2" />
                        <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">{stats.freeUsers}</p>
                        <p className="text-sm text-gray-600">Free Users</p>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4">
                        <Crown className="w-6 h-6 text-purple-600 mb-2" />
                        <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">{stats.premiumUsers}</p>
                        <p className="text-sm text-purple-600">Premium Users</p>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                        <CreditCard className="w-6 h-6 text-amber-600 mb-2" />
                        <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{stats.averageCredits}</p>
                        <p className="text-sm text-amber-600">Avg Credits</p>
                    </div>
                </div>
            )}

            {/* Search */}
            <div className="mb-6">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                </div>
            </div>

            {/* Users List */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 dark:bg-gray-700 border-b font-medium text-sm text-gray-600 dark:text-gray-300">
                    <div className="col-span-4">User</div>
                    <div className="col-span-2 text-center">Credits</div>
                    <div className="col-span-2 text-center">Membership</div>
                    <div className="col-span-2 text-center">Joined</div>
                    <div className="col-span-2 text-center">Actions</div>
                </div>

                {filteredUsers.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        No users found
                    </div>
                ) : (
                    filteredUsers.map((u) => (
                        <div key={u.id} className="border-b border-gray-200 dark:border-gray-700 last:border-0">
                            <div className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <div className="col-span-4">
                                    <p className="font-medium text-gray-900 dark:text-white">{u.name || 'Unknown'}</p>
                                    <p className="text-sm text-gray-500">{u.email}</p>
                                </div>
                                <div className="col-span-2 text-center">
                                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold ${
                                        u.credits >= 9999 ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                                        u.credits > 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 
                                        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                    }`}>
                                        <Coins className="w-4 h-4" />
                                        {u.credits >= 9999 ? '∞' : u.credits ?? 5}
                                    </span>
                                </div>
                                <div className="col-span-2 text-center">
                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                        u.isMember 
                                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' 
                                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                    }`}>
                                        {u.isMember && <Crown className="w-3 h-3" />}
                                        {u.isMember ? 'premium' : 'free'}
                                    </span>
                                </div>
                                <div className="col-span-2 text-center text-sm text-gray-500">
                                    {formatDate(u.createdAt)}
                                </div>
                                <div className="col-span-2 flex items-center justify-center gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setSelectedUser(u)}
                                        className="text-xs"
                                    >
                                        <Plus className="w-3 h-3 mr-1" />
                                        Adjust
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleExpandUser(u.email)}
                                    >
                                        {expandedUser === u.email ? (
                                            <ChevronUp className="w-4 h-4" />
                                        ) : (
                                            <ChevronDown className="w-4 h-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>

                            {/* Expanded Section */}
                            {expandedUser === u.email && (
                                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 border-t border-gray-200 dark:border-gray-600">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Quick Actions */}
                                        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                                            <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                                <CreditCard className="w-4 h-4" /> Quick Actions
                                            </h4>
                                            <div className="space-y-2">
                                                <div className="flex gap-2">
                                                    <Button size="sm" onClick={() => handleAdjustCredits(u.email, 5)} className="bg-green-600 hover:bg-green-700">
                                                        <Plus className="w-3 h-3 mr-1" /> Add 5
                                                    </Button>
                                                    <Button size="sm" onClick={() => handleAdjustCredits(u.email, 10)} className="bg-green-600 hover:bg-green-700">
                                                        <Plus className="w-3 h-3 mr-1" /> Add 10
                                                    </Button>
                                                    <Button size="sm" onClick={() => handleAdjustCredits(u.email, 30)} className="bg-green-600 hover:bg-green-700">
                                                        <Plus className="w-3 h-3 mr-1" /> Add 30
                                                    </Button>
                                                </div>
                                                <div className="flex gap-2 pt-2">
                                                    {!u.isMember ? (
                                                        <Button size="sm" onClick={() => handleChangeMembership(u.email, true)} className="bg-purple-600 hover:bg-purple-700">
                                                            <Crown className="w-3 h-3 mr-1" /> Upgrade to Premium
                                                        </Button>
                                                    ) : (
                                                        <Button size="sm" variant="outline" onClick={() => handleChangeMembership(u.email, false)}>
                                                            Downgrade to Free
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Transaction History */}
                                        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                                            <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                                <History className="w-4 h-4" /> Recent Transactions
                                            </h4>
                                            {loadingTransactions ? (
                                                <div className="flex items-center justify-center py-4">
                                                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                                                </div>
                                            ) : transactions.length === 0 ? (
                                                <p className="text-sm text-gray-500 py-2">No transactions yet</p>
                                            ) : (
                                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                                    {transactions.slice(0, 5).map((t, i) => (
                                                        <div key={i} className="flex items-center justify-between text-sm border-b border-gray-100 dark:border-gray-700 pb-2">
                                                            <div>
                                                                <p className="text-gray-700 dark:text-gray-300">{t.description || t.type}</p>
                                                                <p className="text-xs text-gray-400">{formatDate(t.createdAt)}</p>
                                                            </div>
                                                            <span className={`font-medium ${t.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
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
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full">
                        <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Adjust Credits</h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            User: <strong>{selectedUser.name || selectedUser.email}</strong>
                            <br />
                            Current Credits: <strong>{selectedUser.credits ?? 5}</strong>
                        </p>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Amount (+ to add, - to deduct)
                                </label>
                                <input
                                    type="number"
                                    value={adjustAmount}
                                    onChange={(e) => setAdjustAmount(e.target.value)}
                                    placeholder="e.g. 5 or -3"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-primary/20"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Reason (optional)
                                </label>
                                <input
                                    type="text"
                                    value={adjustReason}
                                    onChange={(e) => setAdjustReason(e.target.value)}
                                    placeholder="e.g. Manual top-up"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-primary/20"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <Button variant="outline" onClick={() => { setSelectedUser(null); setAdjustAmount(''); setAdjustReason(''); }} className="flex-1">
                                Cancel
                            </Button>
                            <Button onClick={() => handleAdjustCredits(selectedUser.email, adjustAmount)} disabled={adjusting || !adjustAmount} className="flex-1">
                                {adjusting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                Apply
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AdminCreditsPage
