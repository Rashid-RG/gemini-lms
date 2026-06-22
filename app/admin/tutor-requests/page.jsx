"use client"
import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Check, X, Clock, Loader2, RefreshCw } from 'lucide-react'
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

export default function TutorRequestsPage() {
  const { admin } = useAdminAuth()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [reviewingId, setReviewingId] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [showPasswordVerify, setShowPasswordVerify] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const [pendingApproval, setPendingApproval] = useState(null)
  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    fetchRequests()
  }, [filter])

  const fetchRequests = async () => {
    try {
      setLoading(true)
      const url = filter === 'all' 
        ? '/api/admin/tutor-requests' 
        : `/api/admin/tutor-requests?status=${filter}`
      
      const response = await axios.get(url)
      setRequests(response.data.result || [])
    } catch (error) {
      toast.error('Failed to load tutor requests')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  // Show password verification dialog
  const showApprovalDialog = (requestId, userEmail, userName) => {
    setPendingApproval({ requestId, userEmail, userName })
    setShowPasswordVerify(true)
    setAdminPassword('')
  }

  // Verify admin password and approve
  const verifyAndApprove = async () => {
    if (!adminPassword.trim()) {
      toast.error('Please enter your admin password')
      return
    }

    try {
      setVerifying(true)
      
      // Verify admin password
      const verifyResponse = await axios.post('/api/admin/verify-password', {
        password: adminPassword,
        email: admin?.email
      })

      if (verifyResponse.data.success) {
        // Admin password verified, proceed with approval
        const autoPassword = generatePassword()

        const response = await axios.patch(`/api/admin/tutor-requests/${pendingApproval.requestId}`, {
          status: 'approved',
          userEmail: pendingApproval.userEmail,
          password: autoPassword,
          reviewedBy: admin?.email
        })

        toast.success(`✅ Tutor approved! Credentials email sent to ${pendingApproval.userEmail} and available on their profile notification.`)
        setRequests(requests.filter(r => r.id !== pendingApproval.requestId))
        setShowPasswordVerify(false)
        setPendingApproval(null)
      } else {
        toast.error('Incorrect admin password')
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to approve request')
    } finally {
      setVerifying(false)
    }
  }

  // Instantly approve with auto-generated password
  const instantApprove = async (requestId, userEmail, userName) => {
    showApprovalDialog(requestId, userEmail, userName)
  }

  const rejectRequest = async (requestId) => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason')
      return
    }

    try {
      setReviewingId(requestId)
      const response = await axios.patch(`/api/admin/tutor-requests/${requestId}`, {
        status: 'rejected',
        rejectionReason,
        reviewedBy: admin?.email
      })
      
      toast.success('Request rejected')
      setRejectionReason('')
      setRequests(requests.filter(r => r.id !== requestId))
    } catch (error) {
      toast.error('Failed to reject request')
    } finally {
      setReviewingId(null)
    }
  }

  const getExperienceBadge = (level) => {
    const badges = {
      beginner: 'bg-green-100 text-green-800',
      intermediate: 'bg-blue-100 text-blue-800',
      advanced: 'bg-purple-100 text-purple-800',
      expert: 'bg-orange-100 text-orange-800'
    }
    return badges[level] || 'bg-gray-100 text-gray-800'
  }

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    }
    return badges[status] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-6">
      {/* Password Verification Dialog */}
      {showPasswordVerify && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 rounded-lg">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">🔐 Verify Admin Password</h2>
            <p className="text-gray-600 mb-4 text-sm">
              Please confirm your admin password to approve this tutor application and send login credentials.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Admin Password</label>
                <input
                  type="password"
                  placeholder="Enter your admin password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && verifyAndApprove()}
                  disabled={verifying}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  autoFocus
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800">
                  💡 <strong>What happens next:</strong> The tutor will receive an automated email containing their login credentials and login URL, and will also see them in the notification section of their profile.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => {
                  setShowPasswordVerify(false)
                  setPendingApproval(null)
                  setAdminPassword('')
                }}
                disabled={verifying}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={verifyAndApprove}
                disabled={verifying}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {verifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Verify & Approve
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tutor Requests</h1>
          <p className="text-gray-600 mt-1">Review and approve users who want to become tutors</p>
        </div>
        <Button
          onClick={fetchRequests}
          disabled={loading}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {['pending', 'approved', 'rejected', 'all'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg font-medium transition capitalize ${
              filter === status
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <p className="text-gray-600">No tutor requests found</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {requests.map((request) => (
            <div key={request.id} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="grid gap-4">
                {/* Header row */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">{request.userName}</h3>
                    <p className="text-sm text-gray-500">{request.userEmail}</p>
                  </div>
                  <div className="flex gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getExperienceBadge(request.experienceLevel)}`}>
                      {request.experienceLevel}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(request.status)}`}>
                      {request.status}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-3 text-sm">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Subject Expertise</h4>
                    <p className="text-gray-700">{request.subjectExpertise}</p>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Motivation</h4>
                    <p className="text-gray-700">{request.motivation}</p>
                  </div>

                  {request.certifications && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">Certifications</h4>
                      <p className="text-gray-700">{request.certifications}</p>
                    </div>
                  )}

                  <div className="flex gap-4 text-xs text-gray-500 pt-2 border-t">
                    <span>📅 Requested: {new Date(request.requestedAt).toLocaleDateString()}</span>
                    {request.reviewedAt && (
                      <span>✓ Reviewed: {new Date(request.reviewedAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {request.status === 'pending' && (
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      onClick={() => instantApprove(request.id, request.userEmail, request.userName)}
                      disabled={reviewingId === request.id}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      {reviewingId === request.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Approving...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Approve & Send Login Info
                        </>
                      )}
                    </Button>

                    <div className="flex-1 flex gap-1">
                      <input
                        type="text"
                        placeholder="Reason for rejection..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                      <Button
                        onClick={() => rejectRequest(request.id)}
                        disabled={reviewingId === request.id}
                        variant="outline"
                        className="text-red-600 hover:bg-red-50"
                      >
                        {reviewingId === request.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <X className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {request.status === 'rejected' && request.rejectionReason && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-xs font-medium text-red-900 mb-1">Rejection Reason:</p>
                    <p className="text-sm text-red-800">{request.rejectionReason}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
