"use client"
import React from 'react'
import { AdminPageShell, AdminPageHeader } from '@/components/admin/AdminPageShell'
import BackupDashboard from '@/components/admin/BackupDashboard'
import { Database } from 'lucide-react'

export default function AdminBackupPage() {
  return (
    <AdminPageShell>
      <AdminPageHeader
        title="Database Backups"
        description="Monitor system database snapshot history and run manual backups"
        icon={Database}
      />
      <BackupDashboard isAdminView={true} />
    </AdminPageShell>
  )
}
