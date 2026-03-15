"use client"
import { UserProfile, useUser } from '@clerk/nextjs'
import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { BookOpen, Loader2, AlertCircle, CheckCircle, Clock, XCircle, RefreshCw } from 'lucide-react'
import BecomeTutorModal from '@/components/BecomeTutorModal'
import TutorApprovalCard from '@/components/TutorApprovalCard'
import axios from 'axios'

function Profile() {
  const { isLoaded, user } = useUser()
  const [showTutorModal, setShowTutorModal] = useState(false)
  const [tutorStatus, setTutorStatus] = useState(null)
  const [tutorData, setTutorData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const studentEmail = user?.primaryEmailAddress?.emailAddress

  // Check tutor status - can be called on mount or manually
  const checkTutorStatus = async () => {
    if (!studentEmail) return

    try {
      const response = await axios.get(`/api/user/tutor-request?email=${studentEmail}&t=${Date.now()}`)
      const data = response.data.result
      setTutorStatus(data?.status || null)
      setTutorData(data)
    } catch (error) {
      console.log('Not a tutor applicant')
      setTutorStatus(null)
      setTutorData(null)
    }
  }

  useEffect(() => {
    if (!studentEmail || !isLoaded) {
      setLoading(false)
      return
    }

    checkTutorStatus().finally(() => setLoading(false))
  }, [studentEmail, isLoaded])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await checkTutorStatus()
    } finally {
      setRefreshing(false)
    }
  }

  const shouldShowButton = tutorStatus === null
  const isPending = tutorStatus === 'pending'
  const isApproved = tutorStatus === 'approved'
  const isRejected = tutorStatus === 'rejected'

  if (!isLoaded) {
    return (
      <div className="p-6 text-slate-600">Loading profile...</div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Refresh Button - Always visible when tutor status exists */}
      {(tutorStatus || loading) && (
        <div className="flex justify-end">
          <Button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            variant="outline"
            size="sm"
            className="text-xs"
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh Status'}
          </Button>
        </div>
      )}

      {/* Approval Notification */}
      {isApproved && (
        <TutorApprovalCard tutorEmail={studentEmail} />
      )}

      {/* Rejection Notification */}
      {isRejected && (
        <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-900 mb-2">Application Not Approved</h3>
              <p className="text-red-800 mb-3">
                Thank you for your interest in becoming a tutor. Unfortunately, your application was not approved at this time.
              </p>
              {tutorData?.rejectionReason && (
                <div className="bg-white rounded p-3 mb-4 border border-red-200">
                  <p className="text-sm font-medium text-red-700 mb-1">Reason:</p>
                  <p className="text-sm text-red-700">{tutorData.rejectionReason}</p>
                </div>
              )}
              <p className="text-sm text-red-700 mb-4">
                We encourage you to address the feedback and apply again in the future. Your dedication to education is appreciated!
              </p>
              <Button
                onClick={() => setShowTutorModal(true)}
                variant="outline"
                className="border-red-500 text-red-600 hover:bg-red-50"
              >
                Apply Again
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Pending Notification */}
      {isPending && (
        <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <Clock className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1 animate-pulse" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Application Under Review</h3>
              <p className="text-blue-800">
                Your tutor application is currently being reviewed by our admin team. 
                You'll receive an email notification once a decision has been made. Thank you for your patience!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tutor Application CTA */}
      {shouldShowButton && (
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold mb-2">Become a Tutor</h3>
              <p className="opacity-90">Share your expertise and earn by creating courses for students worldwide</p>
            </div>
            <Button
              onClick={() => setShowTutorModal(true)}
              className='bg-white text-indigo-600 hover:bg-white/90 font-semibold flex items-center gap-2'
            >
              <BookOpen className='w-4 h-4' />
              Apply Now
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 text-lg font-semibold">
          {user?.firstName?.[0] || user?.username?.[0] || 'U'}
        </div>
        <div>
          <p className="text-lg font-semibold text-slate-900">{user?.fullName || user?.username || 'User'}</p>
          <p className="text-sm text-slate-600">{user?.primaryEmailAddress?.emailAddress}</p>
        </div>
      </div>

      <div className="border rounded-lg shadow-sm p-4 bg-white">
        <UserProfile routing="path" path="/dashboard/profile" />
      </div>

      <BecomeTutorModal
        isOpen={showTutorModal}
        onClose={() => setShowTutorModal(false)}
        userEmail={studentEmail}
        userName={user?.fullName}
        onSuccess={() => {
          setTutorStatus('pending')
          setShowTutorModal(false)
        }}
      />
    </div>
  )
}

export default Profile
