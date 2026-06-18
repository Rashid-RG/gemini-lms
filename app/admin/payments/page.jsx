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
import { Button } from '@/components/ui/button'
import { AdminPageShell, AdminPageHeader, AdminSurface } from '@/components/admin/AdminPageShell'
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

const COLOR_MAPS = {
    green: {
        bg: 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-100/60 dark:border-emerald-900/30',
        iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
        iconText: 'text-emerald-600 dark:text-emerald-400',
        glow: 'shadow-emerald-500/5 dark:shadow-emerald-500/10'
    },
    blue: {
        bg: 'bg-blue-50/70 dark:bg-blue-950/20 border-blue-100/60 dark:border-blue-900/30',
        iconBg: 'bg-blue-100 dark:bg-blue-900/40',
        iconText: 'text-blue-600 dark:text-blue-400',
        glow: 'shadow-blue-500/5 dark:shadow-blue-500/10'
    },
    purple: {
        bg: 'bg-purple-50/70 dark:bg-purple-950/20 border-purple-100/60 dark:border-purple-900/30',
        iconBg: 'bg-purple-100 dark:bg-purple-900/40',
        iconText: 'text-purple-600 dark:text-purple-400',
        glow: 'shadow-purple-500/5 dark:shadow-purple-500/10'
    },
    orange: {
        bg: 'bg-orange-50/70 dark:bg-orange-950/20 border-orange-100/60 dark:border-orange-900/30',
        iconBg: 'bg-orange-100 dark:bg-orange-900/40',
        iconText: 'text-orange-600 dark:text-orange-400',
        glow: 'shadow-orange-500/5 dark:shadow-orange-500/10'
    }
}

function StatCard({ title, value, icon, color = 'blue', trendText, trendIcon: TrendIcon, trendColor = 'text-green-600' }) {
    const style = COLOR_MAPS[color] || COLOR_MAPS.blue
    return (
        <div className={`relative overflow-hidden bg-white/95 dark:bg-gray-800/90 border border-gray-150 dark:border-gray-700/50 rounded-2xl p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${style.glow}`}>
            <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full filter blur-xl opacity-10 bg-current" style={{ color: style.iconText.includes('text-blue') ? '#3b82f6' : style.iconText.includes('text-emerald') ? '#10b981' : style.iconText.includes('text-purple') ? '#8b5cf6' : '#f97316' }} />
            <div className="flex items-start justify-between relative z-10">
                <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{title}</p>
                    <p className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">{value}</p>
                    {trendText && (
                        <div className={`flex items-center text-xs font-semibold ${trendColor} bg-current/10 px-2.5 py-0.5 rounded-full w-fit`}>
                            {TrendIcon && <TrendIcon className="h-3 w-3 mr-1" />}
                            <span className="opacity-95">{trendText}</span>
                        </div>
                    )}
                </div>
                <div className={`p-3.5 rounded-2xl ${style.iconBg} border border-black/5 dark:border-white/5`}>
                    <div className={style.iconText}>{icon}</div>
                </div>
            </div>
        </div>
    )
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
        <AdminPageShell>
            {/* Header */}
            <AdminPageHeader
                title="Payment & Revenue"
                description="Track payments, revenue, and financial analytics"
                icon={DollarSign}
                actions={
                    <div className="flex gap-3">
                        <Button
                            onClick={exportToCSV}
                            variant="outline"
                            disabled={payments.length === 0}
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Export
                        </Button>
                        <Button
                            onClick={() => setShowAddModal(true)}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Record Payment
                        </Button>
                    </div>
                }
            />

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard
                    title="Total Revenue"
                    value={`Rs. ${analytics?.totalRevenue || '0.00'}`}
                    icon={<DollarSign className="w-5 h-5" />}
                    color="green"
                    trendText="All time"
                    trendIcon={ArrowUpRight}
                    trendColor="text-emerald-600 dark:text-emerald-400"
                />

                <StatCard
                    title="Monthly Revenue"
                    value={`Rs. ${analytics?.monthlyRevenue || '0.00'}`}
                    icon={<TrendingUp className="w-5 h-5" />}
                    color="blue"
                    trendText="This month"
                    trendIcon={Calendar}
                    trendColor="text-blue-600 dark:text-blue-400"
                />

                <StatCard
                    title="Total Transactions"
                    value={analytics?.totalTransactions || 0}
                    icon={<Receipt className="w-5 h-5" />}
                    color="purple"
                    trendText={`Avg: Rs. ${analytics?.averageOrderValue || '0.00'}`}
                />

                <StatCard
                    title="Paying Users"
                    value={analytics?.payingUsers || 0}
                    icon={<Users className="w-5 h-5" />}
                    color="orange"
                    trendText="Unique customers"
                    trendIcon={CreditCard}
                    trendColor="text-orange-600 dark:text-orange-400"
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Revenue Trend */}
                <AdminSurface className="p-6">
                    <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">Revenue Trend</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={analytics?.monthlyTrend || []}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" className="dark:hidden" />
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" className="hidden dark:block" />
                                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#9ca3af" tickLine={false} />
                                <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" tickLine={false} tickFormatter={(v) => `Rs.${v}`} />
                                <Tooltip 
                                    formatter={(value) => [`Rs. ${value.toFixed(2)}`, 'Revenue']}
                                    contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="revenue" 
                                    stroke="#8b5cf6" 
                                    strokeWidth={2.5}
                                    fill="url(#colorRevenue)" 
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </AdminSurface>

                {/* Revenue by Plan */}
                <AdminSurface className="p-6">
                    <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">Revenue by Plan</h3>
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
                                    <Tooltip formatter={(value) => `Rs. ${value.toFixed(2)}`} contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                                No payment data yet
                            </div>
                        )}
                    </div>
                </AdminSurface>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                        className="border border-gray-300 dark:border-gray-750 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
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
                    className="border border-gray-300 dark:border-gray-750 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
                >
                    <option value="">All Statuses</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                    <option value="refunded">Refunded</option>
                </select>
                <Button
                    onClick={fetchPayments}
                    variant="outline"
                    size="icon"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            {/* Transactions Table */}
            <AdminSurface className="overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-150 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/40">
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">Recent Transactions</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Summary of payments processed on the platform</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                            <tr>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Plan</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                            {payments.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                                        No payments found
                                    </td>
                                </tr>
                            ) : (
                                payments.map((payment) => (
                                    <tr key={payment.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-700/30 transition-colors">
                                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-medium">
                                            {new Date(payment.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                                            {payment.userEmail}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span 
                                                className="inline-flex px-2.5 py-1 text-[11px] font-bold rounded-full border"
                                                style={{ 
                                                    backgroundColor: `${PLAN_COLORS[payment.plan] || PLAN_COLORS.default}15`,
                                                    color: PLAN_COLORS[payment.plan] || PLAN_COLORS.default,
                                                    borderColor: `${PLAN_COLORS[payment.plan] || PLAN_COLORS.default}30`
                                                }}
                                            >
                                                {payment.plan}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white">
                                            Rs. {parseFloat(payment.amount).toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex px-2.5 py-1 text-[11px] font-bold rounded-full ${
                                                payment.status === 'completed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/30' :
                                                payment.status === 'pending' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/30' :
                                                'bg-rose-100 text-rose-800 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-200/50 dark:border-rose-900/30'
                                            }`}>
                                                {payment.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {payment.status === 'completed' && (
                                                <Button
                                                    onClick={() => handleRefund(payment.id)}
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 font-semibold"
                                                >
                                                    Refund
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </AdminSurface>

            {/* Add Payment Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200 text-gray-900 dark:text-white">
                        <div className="flex items-center justify-between mb-6 border-b dark:border-gray-700 pb-3">
                            <h3 className="text-lg font-bold">Record Manual Payment</h3>
                            <button onClick={() => setShowAddModal(false)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>
                        <form onSubmit={handleAddPayment} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                                    User Email *
                                </label>
                                <input
                                    type="email"
                                    value={newPayment.userEmail}
                                    onChange={(e) => setNewPayment({ ...newPayment, userEmail: e.target.value })}
                                    className="w-full border border-gray-300 dark:border-gray-750 bg-white dark:bg-gray-905 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900 dark:text-white"
                                    placeholder="student@example.com"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                                        Amount (Rs.) *
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={newPayment.amount}
                                        onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                                        className="w-full border border-gray-300 dark:border-gray-750 bg-white dark:bg-gray-905 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900 dark:text-white"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                                        Credits to Add
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={newPayment.creditsAdded}
                                        onChange={(e) => setNewPayment({ ...newPayment, creditsAdded: e.target.value })}
                                        className="w-full border border-gray-300 dark:border-gray-750 bg-white dark:bg-gray-905 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900 dark:text-white"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                                        Plan *
                                    </label>
                                    <select
                                        value={newPayment.plan}
                                        onChange={(e) => setNewPayment({ ...newPayment, plan: e.target.value })}
                                        className="w-full border border-gray-300 dark:border-gray-750 bg-white dark:bg-gray-905 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary text-gray-900 dark:text-white"
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
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                                        Payment Method
                                    </label>
                                    <select
                                        value={newPayment.paymentMethod}
                                        onChange={(e) => setNewPayment({ ...newPayment, paymentMethod: e.target.value })}
                                        className="w-full border border-gray-300 dark:border-gray-750 bg-white dark:bg-gray-905 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary text-gray-900 dark:text-white"
                                    >
                                        <option value="card">Card</option>
                                        <option value="paypal">PayPal</option>
                                        <option value="bank_transfer">Bank Transfer</option>
                                        <option value="manual">Manual</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                                    Notes
                                </label>
                                <textarea
                                    value={newPayment.notes}
                                    onChange={(e) => setNewPayment({ ...newPayment, notes: e.target.value })}
                                    className="w-full border border-gray-300 dark:border-gray-750 bg-white dark:bg-gray-905 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900 dark:text-white"
                                    rows={2}
                                    placeholder="e.g. Received via bank transfer..."
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setShowAddModal(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={addingPayment}
                                    className="flex items-center gap-2"
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
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminPageShell>
    )
}

export default PaymentsDashboard
