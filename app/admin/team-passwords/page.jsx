"use client"
import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw, Copy, Eye, EyeOff, Loader2, Mail, Lock, Search, Shield, User, X } from 'lucide-react'
import axios from 'axios'
import { toast } from 'sonner'
import { useAdminAuth } from '@/app/_context/AdminAuthContext'
import { AdminPageShell, AdminPageHeader, AdminSurface } from '@/components/admin/AdminPageShell'

// Generate random password
const generatePassword = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%'
  let password = ''
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

export default function TeamPasswordManagementPage() {
  const { admin } = useAdminAuth()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [selectedMember, setSelectedMember] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [sending, setSending] = useState(false)
  
  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  useEffect(() => {
    fetchMembers()
  }, [])

  const fetchMembers = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/admin/team-members')
      setMembers(response.data.result || [])
    } catch (error) {
      toast.error('Failed to load team members')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const openPasswordModal = (member) => {
    setSelectedMember(member)
    setNewPassword(generatePassword())
    setShowPassword(false)
    setShowPasswordModal(true)
  }

  const resetPassword = async () => {
    if (!newPassword.trim() || newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    try {
      setSending(true)
      await axios.post('/api/admin/reset-team-password', {
        email: selectedMember.email,
        password: newPassword,
        sendEmail: true
      })

      toast.success('Password reset and email sent successfully!')
      setShowPasswordModal(false)
      setNewPassword('')
      setSelectedMember(null)
      fetchMembers()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to reset password')
    } finally {
      setSending(false)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard!')
  }

  const formatPasswordAge = (passwordSetAt) => {
    if (!passwordSetAt) return 'Never set'
    
    const setTime = new Date(passwordSetAt).getTime()
    const now = Date.now()
    const diff = now - setTime
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    
    if (days > 0) return `${days}d ${hours}h ago`
    if (hours > 0) return `${hours}h ago`
    return 'Just now'
  }

  // Filter members based on search term and selected role
  const filteredMembers = members.filter(member => {
    const matchesSearch = 
      (member.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (member.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = roleFilter === 'all' || member.role === roleFilter

    return matchesSearch && matchesRole
  })

  // Role Badge Styling mapping
  const roleStyles = {
    super_admin: 'bg-purple-100 text-purple-750 dark:bg-purple-950/30 dark:text-purple-400 border-purple-200/50 dark:border-purple-900/30',
    admin: 'bg-blue-100 text-blue-750 dark:bg-blue-950/30 dark:text-blue-400 border-blue-200/50 dark:border-blue-900/30',
    tutor: 'bg-orange-100 text-orange-750 dark:bg-orange-950/30 dark:text-orange-400 border-orange-200/50 dark:border-orange-900/30'
  }

  return (
    <AdminPageShell>
      <AdminPageHeader
        title="Team Passwords"
        description="Manage security credentials for admins, super admins, and tutors"
        icon={Lock}
        actions={
          <Button
            onClick={fetchMembers}
            disabled={loading}
            variant="outline"
            className="flex items-center gap-2 border-gray-250 dark:border-gray-700/60"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        }
      />

      {/* Filters & Search Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-10 pr-4 py-2 border border-gray-250 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent text-gray-900 dark:text-white text-sm"
          />
        </div>

        <div className="flex gap-2">
          {['all', 'super_admin', 'admin', 'tutor'].map((role) => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all duration-200 ${
                roleFilter === role
                  ? 'bg-primary text-white border-primary shadow-sm shadow-indigo-500/10'
                  : 'bg-white dark:bg-gray-800 text-gray-650 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              {role === 'all' ? 'All Roles' : role === 'super_admin' ? 'Super Admin' : role.charAt(0).toUpperCase() + role.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      ) : filteredMembers.length === 0 ? (
        <AdminSurface className="p-12 text-center">
          <Lock className="w-12 h-12 mx-auto text-gray-350 dark:text-gray-600 mb-4 opacity-50" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">No team members found matching your search</p>
        </AdminSurface>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMembers.map((member) => {
            const isSelf = admin?.email === member.email
            const roleStyle = roleStyles[member.role] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
            
            return (
              <AdminSurface key={member.id} className="p-6 flex flex-col justify-between relative overflow-hidden group">
                {/* Visual glow element */}
                <div className="absolute -right-3 -bottom-3 w-16 h-16 rounded-full filter blur-xl opacity-0 group-hover:opacity-10 transition-opacity bg-primary" />
                
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white text-base group-hover:text-primary dark:group-hover:text-blue-400 transition-colors duration-200">
                        {member.name} {isSelf && <span className="text-xs font-normal text-gray-400 dark:text-gray-500">(You)</span>}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 break-all font-medium mt-0.5">{member.email}</p>
                    </div>
                    <div className="flex flex-col gap-1.5 items-end">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${roleStyle}`}>
                        {member.role === 'super_admin' ? 'Super Admin' : member.role}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        member.isActive 
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/15'
                          : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/15'
                      }`}>
                        {member.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  {/* Password Set Age Details */}
                  <div className="mb-6 p-3 bg-gray-50/50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/30 rounded-xl flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Last Reset:</span>
                    <span className="text-xs text-gray-800 dark:text-gray-200 font-semibold bg-white dark:bg-gray-800 px-2.5 py-1 rounded-lg border border-gray-100 dark:border-gray-700">
                      {formatPasswordAge(member.passwordSetAt)}
                    </span>
                  </div>
                </div>

                {/* Reset button action */}
                <Button
                  onClick={() => openPasswordModal(member)}
                  disabled={isSelf}
                  className={`w-full text-xs font-bold py-2 rounded-xl transition-all duration-200 ${
                    isSelf 
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed border border-gray-200 dark:border-gray-700' 
                      : 'bg-primary hover:bg-primary/95 text-white shadow-sm hover:shadow'
                  }`}
                  title={isSelf ? "You cannot reset your own password here" : "Reset password for this staff member"}
                >
                  <Lock className="w-3.5 h-3.5 mr-1.5" />
                  Reset Password & Send
                </Button>
              </AdminSurface>
            )
          })}
        </div>
      )}

      {/* Password Reset Modal */}
      {showPasswordModal && selectedMember && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 dark:border-gray-800/80 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Reset Staff Password</h3>
              <button 
                onClick={() => {
                  setShowPasswordModal(false)
                  setSelectedMember(null)
                }}
                className="text-gray-400 hover:text-gray-650 dark:hover:text-gray-300 p-1 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Account Info Summary card */}
              <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/30 p-4 rounded-2xl">
                <p className="text-sm text-gray-750 dark:text-gray-300 flex justify-between">
                  <span className="font-semibold text-gray-500">Name:</span> 
                  <span className="font-bold text-gray-900 dark:text-white">{selectedMember.name}</span>
                </p>
                <p className="text-sm text-gray-755 dark:text-gray-300 flex justify-between mt-2">
                  <span className="font-semibold text-gray-500">Email:</span> 
                  <span className="font-mono text-xs text-gray-850 dark:text-gray-200 font-medium">{selectedMember.email}</span>
                </p>
                <p className="text-sm text-gray-755 dark:text-gray-300 flex justify-between mt-2">
                  <span className="font-semibold text-gray-500">Role:</span> 
                  <span className="capitalize font-bold text-primary dark:text-blue-400 text-xs">{selectedMember.role}</span>
                </p>
              </div>

              {/* Password Input field */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Temporary Password
                </label>
                <div className="relative flex gap-2">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 border border-gray-250 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm font-mono"
                  />
                  <Button
                    variant="outline"
                    onClick={() => setShowPassword(!showPassword)}
                    className="border-gray-250 dark:border-gray-700 text-gray-500 hover:text-gray-750 dark:hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5 font-medium">Must be at least 8 characters long</p>
              </div>

              {/* Password Generator controls */}
              <div className="flex gap-2">
                <Button
                  onClick={() => setNewPassword(generatePassword())}
                  variant="outline"
                  className="flex-1 text-xs font-bold border-gray-250 dark:border-gray-700/80"
                >
                  🔄 Regenerate
                </Button>
                <Button
                  onClick={() => copyToClipboard(newPassword)}
                  variant="outline"
                  className="text-xs border-gray-250 dark:border-gray-700/80"
                  title="Copy password to clipboard"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>

              {/* Notice text box */}
              <div className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 rounded-2xl p-3.5">
                <p className="text-xs text-amber-800 dark:text-amber-400 font-medium leading-relaxed">
                  ⚠️ An automated email containing this new temporary password will be sent immediately to **{selectedMember.email}**. They will be prompted to change it upon their next login.
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-gray-800/80">
                <Button
                  onClick={() => {
                    setShowPasswordModal(false)
                    setNewPassword('')
                    setSelectedMember(null)
                  }}
                  variant="outline"
                  className="flex-1 rounded-xl border-gray-250 dark:border-gray-700"
                  disabled={sending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={resetPassword}
                  className="flex-1 bg-primary hover:bg-primary/95 text-white rounded-xl shadow-sm"
                  disabled={sending || !newPassword.trim()}
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-1.5" />
                      Reset & Send
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminPageShell>
  )
}
