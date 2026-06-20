"use client"
import React from 'react'
import BackupDashboard from '@/components/admin/BackupDashboard'
import { Database } from 'lucide-react'

export default function ClerkAdminBackupPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 dark:bg-slate-900/80 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 p-3 shadow-sm border border-indigo-100/30">
            <Database className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-800 dark:text-white bg-gradient-to-r from-slate-900 to-indigo-950 dark:from-white dark:to-indigo-250 bg-clip-text text-transparent">
              Database Backups
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
              Safeguard database contents and monitor automated snapshots
            </p>
          </div>
        </div>
      </div>

      <BackupDashboard isAdminView={false} />
    </div>
  )
}
