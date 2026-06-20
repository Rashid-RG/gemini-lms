"use client"
import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { 
  Database, 
  Download, 
  RefreshCw, 
  ShieldCheck, 
  HardDrive, 
  Clock, 
  Calendar,
  AlertTriangle,
  Loader2,
  FileJson,
  User,
  Plus
} from 'lucide-react'
import { toast } from 'sonner'
import { AdminSurface } from './AdminPageShell'

export default function BackupDashboard({ isAdminView = false }) {
  const [backups, setBackups] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    records: 0,
    lastBackup: null,
    totalSize: 0
  })

  useEffect(() => {
    fetchBackupHistory()
  }, [])

  const fetchBackupHistory = async () => {
    try {
      setLoading(true)
      const res = await axios.get('/api/admin/backup/history')
      if (res.data.success) {
        const list = res.data.backups || []
        setBackups(list)
        
        // Calculate stats
        const total = list.length
        const records = list.reduce((acc, b) => acc + (b.recordCount || 0), 0)
        const totalSize = list.reduce((acc, b) => acc + (b.fileSize || 0), 0)
        const lastBackup = list.length > 0 ? list[0].createdAt : null

        setStats({ total, records, lastBackup, totalSize })
      }
    } catch (error) {
      console.error('Error fetching backups:', error)
      toast.error('Failed to load backup history')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateBackup = async () => {
    try {
      setGenerating(true)
      toast.info('Generating system backup... compiling database tables')
      const res = await axios.post('/api/admin/backup/generate')
      if (res.data.success) {
        toast.success('Backup generated successfully!')
        fetchBackupHistory()
      }
    } catch (error) {
      console.error('Error generating backup:', error)
      toast.error('Failed to generate backup')
    } finally {
      setGenerating(false)
    }
  }

  const handleDownloadBackup = (token) => {
    if (!token) {
      toast.error('Download token not found')
      return
    }
    toast.info('Starting backup file download...')
    window.location.href = `/api/admin/backup/download?token=${token}`
  }

  const formatSize = (bytes) => {
    if (!bytes) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      {/* Visual background styling */}
      <style jsx>{`
        .glass-card {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(226, 232, 240, 0.8);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .dark .glass-card {
          background: rgba(30, 41, 59, 0.7);
          border: 1px solid rgba(51, 65, 85, 0.8);
        }
        .glass-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 20px -8px rgba(99, 102, 241, 0.15);
          border-color: rgba(99, 102, 241, 0.4);
        }
        .premium-badge {
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          box-shadow: 0 4px 10px rgba(79, 70, 229, 0.2);
        }
        .gradient-bg {
          background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%);
        }
      `}</style>

      {/* Hero Welcome banner */}
      <div className="relative overflow-hidden gradient-bg rounded-3xl p-6 sm:p-8 text-white shadow-xl group border border-slate-800">
        <div className="absolute right-0 top-0 -mt-6 -mr-6 w-48 h-48 bg-indigo-500/10 rounded-full filter blur-2xl transition-transform duration-500 group-hover:scale-110 animate-pulse" />
        <div className="absolute left-1/4 bottom-0 -mb-16 w-72 h-72 bg-violet-600/10 rounded-full filter blur-3xl" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 premium-badge px-3 py-1 rounded-full text-xs font-black w-fit tracking-wider text-indigo-100 uppercase">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
              <span>Premium Safeguard active</span>
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-indigo-100 to-indigo-200 bg-clip-text text-transparent">
              System Database Backups
            </h2>
            <p className="text-slate-300 text-sm max-w-xl font-medium leading-relaxed">
              Generate manual system backups on-demand or download automated cron snapshots. All files are compressed using Gzip (`.json.gz`) to protect and store database states cleanly.
            </p>
          </div>
          
          <button
            onClick={handleGenerateBackup}
            disabled={generating}
            className="flex items-center justify-center gap-2 premium-badge text-white font-bold px-6 py-3.5 rounded-2xl hover:scale-[1.03] transition-all active:scale-[0.98] shadow-lg disabled:opacity-50 disabled:scale-100 shrink-0 self-start md:self-auto border border-white/10"
          >
            {generating ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Compiling tables...</span>
              </>
            ) : (
              <>
                <Database className="h-5 w-5" />
                <span>Backup Now</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="glass-card rounded-2xl p-5 shadow-sm flex items-center justify-between group">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Backups</p>
            <p className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">{stats.total}</p>
          </div>
          <div className="h-12 w-12 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center border border-indigo-100/50 dark:border-indigo-900/30 transition-transform group-hover:scale-110">
            <HardDrive className="h-5 w-5" />
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 shadow-sm flex items-center justify-between group">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Records</p>
            <p className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">{stats.records}</p>
          </div>
          <div className="h-12 w-12 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center border border-emerald-100/50 dark:border-emerald-900/30 transition-transform group-hover:scale-110">
            <FileJson className="h-5 w-5" />
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 shadow-sm flex items-center justify-between group">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Archive Size</p>
            <p className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">{formatSize(stats.totalSize)}</p>
          </div>
          <div className="h-12 w-12 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center border border-amber-100/50 dark:border-amber-900/30 transition-transform group-hover:scale-110">
            <Database className="h-5 w-5" />
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 shadow-sm flex items-center justify-between group">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Last Backup</p>
            <p className="text-sm font-extrabold text-slate-700 dark:text-slate-300 mt-2 truncate">
              {stats.lastBackup ? new Date(stats.lastBackup).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never'}
            </p>
          </div>
          <div className="h-12 w-12 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center border border-purple-100/50 dark:border-purple-900/30 transition-transform group-hover:scale-110">
            <Clock className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* History log block */}
      <AdminSurface className="overflow-hidden glass-card shadow-sm border border-slate-200/50 dark:border-slate-800 rounded-2xl">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/30">
          <div>
            <h3 className="font-extrabold text-slate-800 dark:text-white text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-indigo-600" />
              Backup Log History
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Logs of manually generated backups and automated cron scheduler executions.</p>
          </div>
          <button 
            onClick={fetchBackupHistory} 
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-350 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Log
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <p className="text-sm font-semibold text-slate-500">Querying backup table logs...</p>
          </div>
        ) : backups.length === 0 ? (
          <div className="text-center py-20 max-w-sm mx-auto space-y-4">
            <div className="h-16 w-16 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <Database className="h-8 w-8 text-slate-300 dark:text-slate-650" />
            </div>
            <div>
              <p className="font-extrabold text-slate-700 dark:text-slate-300">No Backups Found</p>
              <p className="text-xs text-slate-450 dark:text-slate-500 mt-1">No backups exist in the database yet. Click the "Backup Now" button above to generate one manually.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/70 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">File Details</th>
                  <th className="px-6 py-3.5 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3.5 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Records</th>
                  <th className="px-6 py-3.5 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Size</th>
                  <th className="px-6 py-3.5 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Created By</th>
                  <th className="px-6 py-3.5 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Timestamp</th>
                  <th className="px-6 py-3.5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {backups.map((backup) => (
                  <tr key={backup.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 bg-indigo-50/60 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center shrink-0 border border-indigo-100/10">
                          <FileJson className="h-4.5 w-4.5" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 dark:text-white text-sm">{backup.fileName}</p>
                          <p className="text-[10px] text-slate-400 font-mono select-all">Token: {backup.downloadToken ? `${backup.downloadToken.slice(0, 16)}...` : 'N/A'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        backup.backupType === 'scheduled'
                          ? 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/30'
                          : 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/30'
                      }`}>
                        {backup.backupType === 'scheduled' ? 'Scheduled' : 'Manual'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
                        {backup.recordCount.toLocaleString()} rows
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
                        {formatSize(backup.fileSize)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 px-2 py-1 rounded-lg">
                        <User className="h-3.5 w-3.5 text-slate-450" />
                        {backup.createdBy}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-xs text-slate-500 dark:text-slate-450 flex items-center justify-center gap-1 font-medium">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        {formatDate(backup.createdAt)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDownloadBackup(backup.downloadToken)}
                        className="inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-100 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer border border-indigo-500/10"
                        title="Download backup file"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Download</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminSurface>
    </div>
  )
}
