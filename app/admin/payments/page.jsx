"use client"
import React, { useState, useEffect } from 'react'
import { useAdminAuth } from '../../_context/AdminAuthContext'
import axios from 'axios'
import { 
    DollarSign, 
    TrendingUp, 
    Users, 
    CreditCard,
    ArrowUpRight,
    ArrowDownRight,
    Download,
    Filter,
    RefreshCw,
    Receipt,
    Calendar,
    Plus,
    X,
    Check
} from 'lucide-react'
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts'

const PLAN_COLORS = {
    'pro': '#8b5cf6',
    'basic': '#3b82f6',
    'enterprise': '#f59e0b',
    'credits_10': '#10b981',
    'credits_50': '#06b6d4',
    'credits_100': '#ec4899',
    'default': '#6b7280'
}

const STATUS_STYLES = {
    completed: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    failed: 'bg-red-100 text-red-800',
    refunded: 'bg-gray-100 text-gray-800'
}

function PaymentsDashboard() {
    const { admin } = useAdminAuth()
    const [loading, setLoading] = useState(true)
    const [payments, setPayments] = useState([])
    const [analytics, setAnalytics] = useState(null)
    const [period, setPeriod] = useState('all')
    const [statusFilter, setStatusFilter] = useState('')
    const [showAddModal, setShowAddModal] = useState(false)
    const [addingPayment, setAddingPayment] = useState(false)

    const [newPayment, setNewPayment] = useState({
        userEmail: '',
        amount: '',
        plan: 'pro',
        planType: 'subscription',
        creditsAdded: 0,
        paymentMethod: 'card',
        notes: ''
    })

    useEffect(() => {
        fetchPayments()
    }, [period, statusFilter])

    const fetchPayments = async () => {
        try {
            setLoading(true)
            const params = new URLSearchParams()
            if (period !== 'all') params.append('period', period)
            if (statusFilter) params.append('status', statusFilter)
            
            const response = await axios.get(`/api/admin/payments?${params}`)
            setPayments(response.data.payments || [])
            setAnalytics(response.data.analytics)
        } catch (error) {
            console.error('Error fetching payments:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleAddPayment = async (e) => {
        e.preventDefault()
        if (!newPayment.userEmail || !newPayment.amount || !newPayment.plan) return

        try {
            setAddingPayment(true)
            await axios.post('/api/admin/payments', {
                ...newPayment,
                amount: parseFloat(newPayment.amount),
                creditsAdded: parseInt(newPayment.creditsAdded) || 0,
                adminEmail: admin?.email
            })
            setShowAddModal(false)
            setNewPayment({
                userEmail: '',
                amount: '',
                plan: 'pro',
                planType: 'subscription',
                creditsAdded: 0,
                paymentMethod: 'card',
                notes: ''
            })
            fetchPayments()
        } catch (error) {
            console.error('Error adding payment:', error)
            alert('Failed to add payment')
        } finally {
            setAddingPayment(false)
        }
    }

    const handleRefund = async (paymentId) => {
        if (!confirm('Are you sure you want to mark this payment as refunded?')) return

        try {
            await axios.put('/api/admin/payments', {
                id: paymentId,
                status: 'refunded',
                adminEmail: admin?.email
            })
            fetchPayments()
        } catch (error) {
            console.error('Error refunding payment:', error)
            alert('Failed to update payment status')
        }
    }

    const exportToCSV = () => {
        if (payments.length === 0) return

        const headers = ['ID', 'Date', 'User Email', 'Amount', 'Currency', 'Plan', 'Status', 'Payment Method']
        const rows = payments.map(p => [
            p.id,
            new Date(p.createdAt).toLocaleDateString(),
            p.userEmail,
            p.amount,
            p.currency?.toUpperCase(),
            p.plan,
            p.status,
            p.paymentMethod || 'N/A'
        ])

        const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `payments_${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    // Prepare chart data
    const pieData = analytics?.revenueByPlan 
        ? Object.entries(analytics.revenueByPlan).map(([name, value]) => ({ name, value }))
        : []

    if (loading && !analytics) {
        return (
            <div className="p-8 flex items-center justify-center">
                <RefreshCw className="w-6 h-6 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Payment & Revenue</h1>
                    <p className="text-gray-500 mt-1">Track payments, revenue, and financial analytics</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={exportToCSV}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        <Download className="w-4 h-4" />
                        Export
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                    >
                        <Plus className="w-4 h-4" />
                        Record Payment
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-xl p-6 shadow-sm border">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Total Revenue</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">
                                Rs. {analytics?.totalRevenue || '0.00'}
                            </p>
                        </div>
                        <div className="p-3 bg-green-100 rounded-lg">
                            <DollarSign className="w-6 h-6 text-green-600" />
                        </div>
                    </div>
                    <div className="flex items-center gap-1 mt-4 text-sm">
                        <ArrowUpRight className="w-4 h-4 text-green-500" />
                        <span className="text-green-600 font-medium">All time</span>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Monthly Revenue</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">
                                Rs. {analytics?.monthlyRevenue || '0.00'}
                            </p>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <TrendingUp className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                    <div className="flex items-center gap-1 mt-4 text-sm">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-500">This month</span>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Total Transactions</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">
                                {analytics?.totalTransactions || 0}
                            </p>
                        </div>
                        <div className="p-3 bg-purple-100 rounded-lg">
                            <Receipt className="w-6 h-6 text-purple-600" />
                        </div>
                    </div>
                    <div className="flex items-center gap-1 mt-4 text-sm">
                        <span className="text-gray-500">Avg: Rs. {analytics?.averageOrderValue || '0.00'}</span>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Paying Users</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">
                                {analytics?.payingUsers || 0}
                            </p>
                        </div>
                        <div className="p-3 bg-orange-100 rounded-lg">
                            <Users className="w-6 h-6 text-orange-600" />
                        </div>
                    </div>
                    <div className="flex items-center gap-1 mt-4 text-sm">
                        <CreditCard className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-500">Unique customers</span>
                    </div>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Revenue Trend */}
                <div className="bg-white rounded-xl p-6 shadow-sm border">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={analytics?.monthlyTrend || []}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `Rs.${v}`} />
                                <Tooltip 
                                    formatter={(value) => [`Rs. ${value.toFixed(2)}`, 'Revenue']}
                                    contentStyle={{ borderRadius: '8px' }}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="revenue" 
                                    stroke="#8b5cf6" 
                                    strokeWidth={2}
                                    fill="url(#colorRevenue)" 
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Revenue by Plan */}
                <div className="bg-white rounded-xl p-6 shadow-sm border">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Plan</h3>
                    <div className="h-64">
                        {pieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell 
                                                key={`cell-${index}`} 
                                                fill={PLAN_COLORS[entry.name] || PLAN_COLORS.default} 
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value) => `Rs. ${value.toFixed(2)}`} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-500">
                                No payment data yet
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                        className="border rounded-lg px-3 py-2 text-sm"
                    >
                        <option value="all">All Time</option>
                        <option value="today">Today</option>
                        <option value="week">Last 7 Days</option>
                        <option value="month">Last 30 Days</option>
                        <option value="year">Last Year</option>
                    </select>
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="border rounded-lg px-3 py-2 text-sm"
                >
                    <option value="">All Statuses</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                    <option value="refunded">Refunded</option>
                </select>
                <button
                    onClick={fetchPayments}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                    title="Refresh"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Transactions Table */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="p-4 border-b">
                    <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">User</th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Plan</th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {payments.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                                        No payments found
                                    </td>
                                </tr>
                            ) : (
                                payments.map((payment) => (
                                    <tr key={payment.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm text-gray-900">
                                            {new Date(payment.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">
                                            {payment.userEmail}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span 
                                                className="inline-flex px-2 py-1 text-xs font-medium rounded-full"
                                                style={{ 
                                                    backgroundColor: `${PLAN_COLORS[payment.plan] || PLAN_COLORS.default}20`,
                                                    color: PLAN_COLORS[payment.plan] || PLAN_COLORS.default
                                                }}
                                            >
                                                {payment.plan}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                            Rs. {parseFloat(payment.amount).toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${STATUS_STYLES[payment.status] || STATUS_STYLES.pending}`}>
                                                {payment.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {payment.status === 'completed' && (
                                                <button
                                                    onClick={() => handleRefund(payment.id)}
                                                    className="text-sm text-red-600 hover:text-red-800"
                                                >
                                                    Refund
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Payment Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">Record Manual Payment</h3>
                            <button onClick={() => setShowAddModal(false)}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleAddPayment} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    User Email *
                                </label>
                                <input
                                    type="email"
                                    value={newPayment.userEmail}
                                    onChange={(e) => setNewPayment({ ...newPayment, userEmail: e.target.value })}
                                    className="w-full border rounded-lg px-3 py-2"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Amount (Rs.) *
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={newPayment.amount}
                                        onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                                        className="w-full border rounded-lg px-3 py-2"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Credits to Add
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={newPayment.creditsAdded}
                                        onChange={(e) => setNewPayment({ ...newPayment, creditsAdded: e.target.value })}
                                        className="w-full border rounded-lg px-3 py-2"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Plan *
                                    </label>
                                    <select
                                        value={newPayment.plan}
                                        onChange={(e) => setNewPayment({ ...newPayment, plan: e.target.value })}
                                        className="w-full border rounded-lg px-3 py-2"
                                    >
                                        <option value="basic">Basic</option>
                                        <option value="pro">Pro</option>
                                        <option value="enterprise">Enterprise</option>
                                        <option value="credits_10">10 Credits</option>
                                        <option value="credits_50">50 Credits</option>
                                        <option value="credits_100">100 Credits</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Payment Method
                                    </label>
                                    <select
                                        value={newPayment.paymentMethod}
                                        onChange={(e) => setNewPayment({ ...newPayment, paymentMethod: e.target.value })}
                                        className="w-full border rounded-lg px-3 py-2"
                                    >
                                        <option value="card">Card</option>
                                        <option value="paypal">PayPal</option>
                                        <option value="bank_transfer">Bank Transfer</option>
                                        <option value="manual">Manual</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Notes
                                </label>
                                <textarea
                                    value={newPayment.notes}
                                    onChange={(e) => setNewPayment({ ...newPayment, notes: e.target.value })}
                                    className="w-full border rounded-lg px-3 py-2"
                                    rows={2}
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={addingPayment}
                                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {addingPayment ? (
                                        <>
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                            Recording...
                                        </>
                                    ) : (
                                        <>
                                            <Check className="w-4 h-4" />
                                            Record Payment
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default PaymentsDashboard
