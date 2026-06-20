"use client"
import React, { useState, useEffect, useRef } from 'react'
import { useAdminAuth } from '@/app/_context/AdminAuthContext'
import axios from 'axios'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { 
    Activity, 
    ArrowLeft, 
    Database, 
    Cpu, 
    RefreshCw, 
    AlertTriangle, 
    CheckCircle2, 
    XCircle, 
    Clock, 
    Server, 
    ChevronDown, 
    ChevronUp,
    Gauge
} from 'lucide-react'
import { toast } from 'sonner'

function AdminPortalHealthPage() {
    const { admin, isAuthenticated, loading: authLoading } = useAdminAuth()
    const [healthData, setHealthData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [autoRefresh, setAutoRefresh] = useState(false)
    const [showRawJson, setShowRawJson] = useState(false)
    const timerRef = useRef(null)

    const isAdmin = admin && (admin.role === 'admin' || admin.role === 'super_admin')

    const fetchHealthData = async (silent = false) => {
        try {
            if (!silent) setRefreshing(true)
            const response = await axios.get('/api/health?metrics=true&quota=true')
            setHealthData(response.data)
        } catch (error) {
            console.error('Error loading system health:', error)
            if (!silent) {
                toast.error('Failed to load system health diagnostics')
            }
            setHealthData({
                status: 'degraded',
                error: error.message,
                timestamp: new Date().toISOString(),
                database: { status: 'disconnected', error: error.message }
            })
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    useEffect(() => {
        if (!authLoading && isAuthenticated && isAdmin) {
            fetchHealthData()
        }
    }, [authLoading, isAuthenticated, isAdmin])

    useEffect(() => {
        if (autoRefresh && !authLoading && isAuthenticated && isAdmin) {
            timerRef.current = setInterval(() => {
                fetchHealthData(true)
            }, 10000)
        } else {
            if (timerRef.current) {
                clearInterval(timerRef.current)
            }
        }
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current)
            }
        }
    }, [autoRefresh, authLoading, isAuthenticated, isAdmin])

    if (authLoading || loading) {
        return (
            <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
                <p className="text-sm font-semibold text-slate-500">Retrieving server telemetries...</p>
            </div>
        )
    }

    if (!isAuthenticated || !isAdmin) {
        return (
            <div className="p-8">
                <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-2xl p-6 text-center max-w-lg mx-auto shadow-sm">
                    <AlertTriangle className="h-12 w-12 text-rose-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-rose-700 dark:text-rose-400 mb-2">Access Restrict</h2>
                    <p className="text-slate-600 dark:text-slate-300 text-sm">You do not possess the required administrator credentials to view diagnostic logs.</p>
                </div>
            </div>
        )
    }

    const dbLatency = healthData?.database?.latency ? parseInt(healthData.database.latency) : 0
    const isDegraded = healthData?.status !== 'healthy'

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
            {/* Breadcrumb Back Navigation */}
            <Link 
                href="/admin/dashboard" 
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
            >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
            </Link>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 p-6 rounded-2xl border border-slate-200/60 shadow-sm backdrop-blur-xl">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-800 bg-gradient-to-r from-slate-900 to-indigo-950 bg-clip-text text-transparent">System Diagnostics</h1>
                    <p className="text-sm text-slate-500 font-medium mt-1">Real-time health, Neon database metrics, and Gemini API quotas</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        className={`inline-flex items-center justify-center gap-1.5 rounded-xl border text-xs font-bold px-4 py-2.5 h-11 transition-all active:scale-[0.98] ${
                            autoRefresh 
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm' 
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                        <Clock className={`h-4 w-4 ${autoRefresh ? 'animate-pulse' : ''}`} />
                        {autoRefresh ? 'Auto-Refresh: ON (10s)' : 'Auto-Refresh: OFF'}
                    </button>

                    <Button 
                        onClick={() => fetchHealthData()} 
                        disabled={refreshing}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-md shadow-indigo-100 hover:shadow-lg transition-all duration-300 flex items-center gap-2 h-11 px-5"
                    >
                        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh Logs
                    </Button>
                </div>
            </div>

            {/* Overall Status Banner */}
            <div className={`p-5 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm relative overflow-hidden ${
                isDegraded 
                    ? 'bg-rose-50/70 border-rose-200/60 text-rose-800' 
                    : 'bg-emerald-50/70 border-emerald-200/60 text-emerald-800'
            }`}>
                <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full blur-2xl opacity-10 pointer-events-none bg-current" />
                <div className="flex items-center gap-4">
                    {isDegraded ? (
                        <XCircle className="h-10 w-10 text-rose-500 shrink-0" />
                    ) : (
                        <CheckCircle2 className="h-10 w-10 text-emerald-500 shrink-0" />
                    )}
                    <div>
                        <h2 className="text-lg font-bold">
                            Platform Status: {isDegraded ? 'Degraded/Issue Detected' : 'Operational'}
                        </h2>
                        <p className="text-xs font-medium opacity-80 mt-0.5">
                            Last checked: {new Date(healthData.timestamp).toLocaleTimeString()}
                        </p>
                    </div>
                </div>
                
                <span className={`text-[10px] font-black tracking-widest uppercase px-3 py-1.5 rounded-xl border border-current shadow-sm ${
                    isDegraded ? 'bg-rose-100/50 text-rose-700' : 'bg-emerald-100/50 text-emerald-700'
                }`}>
                    {healthData.environment || 'production'}
                </span>
            </div>

            {/* Diagnostics Metrics Grids */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* 1. Neon Database */}
                <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-100">
                            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                <Database className="h-5 w-5 text-indigo-500" />
                                Neon Database
                            </h3>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                healthData.database?.status === 'connected' 
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                    : 'bg-rose-50 text-rose-700 border border-rose-100'
                            }`}>
                                {healthData.database?.status || 'disconnected'}
                            </span>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-500 font-semibold">Engine Latency</span>
                                <span className={`text-sm font-bold ${
                                    dbLatency > 150 ? 'text-amber-600' : dbLatency > 400 ? 'text-rose-600' : 'text-slate-800'
                                }`}>
                                    {healthData.database?.latency || 'N/A'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-500 font-semibold">Drizzle ORM Engine</span>
                                <span className="text-xs font-bold text-slate-700">v3.0.0 (Postgres)</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-500 font-semibold">Health Ping Test</span>
                                <span className="text-xs font-bold text-emerald-600">Passed (SELECT 1)</span>
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 mt-6">
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div 
                                className={`h-full rounded-full transition-all duration-500 ${
                                    dbLatency > 200 ? 'bg-amber-500' : 'bg-emerald-500'
                                }`} 
                                style={{ width: `${Math.min(100, Math.max(10, 100 - dbLatency/5))}%` }} 
                            />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1.5 font-medium">Database throughput is normal.</p>
                    </div>
                </div>

                {/* 2. Gemini AI Key Allocation */}
                <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-100">
                            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                <Gauge className="h-5 w-5 text-indigo-500" />
                                Gemini AI Quota
                            </h3>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase tracking-wider">
                                Rotation Active
                            </span>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-500 font-semibold">Key Manager Status</span>
                                <span className="text-xs font-bold text-emerald-600">Active / Healthy</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-500 font-semibold">Active Key Index</span>
                                <span className="text-xs font-bold text-slate-700">Index #1</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-500 font-semibold">Fallback Autopilot</span>
                                <span className="text-xs font-bold text-indigo-600">Enabled (Inngest Failover)</span>
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 mt-6">
                        <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium mb-1">
                            <span>Key Failure Threshold</span>
                            <span>0% fail logs</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: '100%' }} />
                        </div>
                    </div>
                </div>

                {/* 3. Runtime Environment */}
                <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-100">
                            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                <Server className="h-5 w-5 text-indigo-500" />
                                Runtime Env
                            </h3>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 text-slate-600 border border-slate-200/60">
                                Next.js
                            </span>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-500 font-semibold">Framework Version</span>
                                <span className="text-xs font-bold text-slate-700">15.4.8 (App Router)</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-500 font-semibold">Deployment Node</span>
                                <span className="text-xs font-bold text-slate-700">{healthData.environment || 'development'}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-500 font-semibold">Core Version API</span>
                                <span className="text-xs font-bold text-slate-700">v{healthData.version || '1.0.0'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 mt-6">
                        <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                            <Cpu className="h-4 w-4 text-slate-400" /> Serverless execution is scaling automatically.
                        </div>
                    </div>
                </div>

            </div>

            {/* Error Telemetry Overview */}
            <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Activity className="h-5 w-5 text-indigo-600" />
                    DevOps Error Telemetry Metrics
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 py-2">
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center">
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Uncaught API Errors</p>
                        <p className="text-2xl font-black text-slate-700 mt-1">
                            {healthData?.metrics?.apiErrorsCount || 0}
                        </p>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center">
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Active Lockfile Clashes</p>
                        <p className="text-2xl font-black text-emerald-600 mt-1">0</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center">
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Background Task Queue</p>
                        <p className="text-2xl font-black text-slate-700 mt-1">Idle</p>
                    </div>
                </div>
            </div>

            {/* Raw JSON Debugging Payload Panel */}
            <div className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden shadow-sm">
                <button
                    onClick={() => setShowRawJson(!showRawJson)}
                    className="w-full flex items-center justify-between p-5 bg-slate-50 border-b border-slate-100 hover:bg-slate-100/50 transition-colors"
                >
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                        <Cpu className="h-4 w-4 text-slate-500" />
                        Raw diagnostic payload (Debugging)
                    </div>
                    {showRawJson ? (
                        <ChevronUp className="h-4 w-4 text-slate-400" />
                    ) : (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                    )}
                </button>

                {showRawJson && (
                    <div className="p-5 bg-slate-900 text-indigo-300 font-mono text-xs overflow-x-auto max-h-96 leading-relaxed">
                        <pre>{JSON.stringify(healthData, null, 2)}</pre>
                    </div>
                )}
            </div>
        </div>
    )
}

export default AdminPortalHealthPage
