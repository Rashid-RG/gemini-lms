"use client"
import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw, Copy, Eye, EyeOff, Loader2, Mail, Lock } from 'lucide-react'
import axios from 'axios'
import { toast } from 'sonner'
import { useAdminAuth } from '@/app/_context/AdminAuthContext'

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
  const [tutors, setTutors] = useState([])
  const [loading, setLoading] = useState(true)
  const [resettingId, setResettingId] = useState(null)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [selectedTutor, setSelectedTutor] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    fetchTutors()
  }, [])

  const fetchTutors = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/admin/team-members?role=tutor')
      setTutors(response.data.result || [])
    } catch (error) {
      toast.error('Failed to load team members')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const openPasswordModal = (tutor) => {
    setSelectedTutor(tutor)
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
      const response = await axios.post('/api/admin/reset-team-password', {
        email: selectedTutor.email,
        password: newPassword,
        sendEmail: true
      })

      toast.success('Password reset and email sent!')
      setShowPasswordModal(false)
      setNewPassword('')
      setSelectedTutor(null)
      fetchTutors()
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



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Team Password Management</h1>
          <p className="text-gray-600 mt-1">Manage passwords for your team members and tutors</p>
        </div>
        <Button
          onClick={fetchTutors}
          disabled={loading}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : tutors.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <p className="text-gray-600">No team members found</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {tutors.map((tutor) => (
            <div key={tutor.id} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg text-gray-900">{tutor.name}</h3>
                  <p className="text-sm text-gray-500">{tutor.email}</p>
                </div>
                <div className="flex gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {tutor.role}
                  </span>
                  {tutor.isActive ? (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      Inactive
                    </span>
                  )}
                </div>
              </div>

              {/* Password Status */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Last Password Set:</p>
                    <p className="text-sm text-gray-600">
                      {formatPasswordAge(tutor.passwordSetAt)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <Button
                onClick={() => openPasswordModal(tutor)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Lock className="w-4 h-4 mr-2" />
                Reset Password & Send
              </Button>
            </div>
          ))}
        </div>
      )}
      {showPasswordModal && selectedTutor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Reset Team Member Password</h3>
            
            <div className="space-y-4">
              {/* Team Member Info */}
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">Name:</span> {selectedTutor.name}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">Email:</span> {selectedTutor.email}
                </p>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Temporary Password
                </label>
                <div className="relative flex gap-2">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
              </div>

              {/* Generate Button */}
              <div className="flex gap-2">
                <Button
                  onClick={() => setNewPassword(generatePassword())}
                  variant="outline"
                  className="flex-1 text-sm"
                >
                  🔄 Generate
                </Button>
                <Button
                  onClick={() => copyToClipboard(newPassword)}
                  variant="outline"
                  className="text-sm"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800">
                  ℹ️ Password will be sent to {selectedTutor.email}. Team member can use it to log in.
                </p>
              </div>

              {/* Modal Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  onClick={() => {
                    setShowPasswordModal(false)
                    setNewPassword('')
                    setSelectedTutor(null)
                  }}
                  variant="outline"
                  className="flex-1"
                  disabled={sending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={resetPassword}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  disabled={sending || !newPassword.trim()}
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Reset & Send Email
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
