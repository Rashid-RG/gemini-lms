"use client"
import React, { useState, useEffect } from 'react'
import { useAdminAuth } from '@/app/_context/AdminAuthContext'
import axios from 'axios'
import { Button } from '@/components/ui/button'
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
    Search
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

    const filteredUsers = users.filter(u => 
        u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )

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
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Users className="h-6 w-6 text-primary" />
                        User Management
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">{users.length} total users</p>
                </div>
                <Button onClick={fetchUsers} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                </Button>
            </div>

            {/* Search */}
            <div className="mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">User</th>
                                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600 dark:text-gray-300">Member</th>
                                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600 dark:text-gray-300">Credits</th>
                                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600 dark:text-gray-300">Courses</th>
                                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600 dark:text-gray-300">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredUsers.map((u) => (
                                <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-4 py-3">
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">{u.name}</p>
                                            <p className="text-sm text-gray-500">{u.email}</p>
                                        </div>
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
                                        <div className="flex items-center justify-end gap-2">
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
        </div>
    )
}

export default AdminUsersPage
