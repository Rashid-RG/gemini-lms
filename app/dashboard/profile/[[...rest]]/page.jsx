"use client"
import { UserProfile, useUser } from '@clerk/nextjs'
import { useSearchParams } from 'next/navigation'
import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { BookOpen, Loader2, AlertCircle, CheckCircle, Clock, XCircle, RefreshCw, Save, UserRound } from 'lucide-react'
import BecomeTutorModal from '@/components/BecomeTutorModal'
import TutorApprovalCard from '@/components/TutorApprovalCard'
import axios from 'axios'

function Profile() {
  const { isLoaded, user } = useUser()
  const searchParams = useSearchParams()
  const [showTutorModal, setShowTutorModal] = useState(false)
  const [tutorStatus, setTutorStatus] = useState(null)
  const [tutorData, setTutorData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMessage, setProfileMessage] = useState(null)
  const [focusStudentDetails, setFocusStudentDetails] = useState(false)
  const studentDetailsRef = useRef(null)
  const [studentDetails, setStudentDetails] = useState({
    name: '',
    studentIdentifier: '',
    phoneNumber: '',
    address: '',
    city: '',
    country: '',
    postalCode: '',
    dateOfBirth: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    guardianEmail: '',
    guardianRelationship: '',
  })
  const studentEmail = user?.primaryEmailAddress?.emailAddress
  const shouldFocusStudentDetails = searchParams.get('focus') === 'student-details'

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
      setProfileLoading(false)
      return
    }

    checkTutorStatus().finally(() => setLoading(false))
    loadStudentDetails().finally(() => setProfileLoading(false))
  }, [studentEmail, isLoaded])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!shouldFocusStudentDetails) return
    if (!isLoaded || loading || profileLoading) return

    let cancelled = false
    const timers = []

    const scrollTarget = () => {
      if (cancelled) return
      studentDetailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setFocusStudentDetails(true)
      timers.push(window.setTimeout(() => {
        if (!cancelled) {
          setFocusStudentDetails(false)
        }
      }, 2500))
    }

    timers.push(window.setTimeout(scrollTarget, 120))
    timers.push(window.setTimeout(scrollTarget, 450))
    timers.push(window.setTimeout(scrollTarget, 900))

    return () => {
      cancelled = true
      timers.forEach((timerId) => window.clearTimeout(timerId))
    }
  }, [isLoaded, loading, profileLoading, tutorStatus, shouldFocusStudentDetails])

  const loadStudentDetails = async () => {
    try {
      const response = await axios.get('/api/user/profile')
      const data = response.data?.result
      if (!data) return

      setStudentDetails({
        name: data.name || user?.fullName || '',
        studentIdentifier: data.studentIdentifier || '',
        phoneNumber: data.phoneNumber || '',
        address: data.address || '',
        city: data.city || '',
        country: data.country || '',
        postalCode: data.postalCode || '',
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth).toISOString().split('T')[0] : '',
        emergencyContactName: data.emergencyContactName || '',
        emergencyContactPhone: data.emergencyContactPhone || '',
        guardianEmail: data.guardianEmail || '',
        guardianRelationship: data.guardianRelationship || '',
      })
    } catch (error) {
      console.error('Failed to load student details:', error)
    }
  }

  const handleDetailChange = (event) => {
    const { name, value } = event.target
    setStudentDetails((prev) => ({ ...prev, [name]: value }))
  }

  const handleSaveDetails = async () => {
    try {
      setProfileSaving(true)
      setProfileMessage(null)
      const response = await axios.put('/api/user/profile', studentDetails)
      const data = response.data?.result
      if (data) {
        setStudentDetails((prev) => ({
          ...prev,
          name: data.name || prev.name,
          studentIdentifier: data.studentIdentifier || prev.studentIdentifier,
        }))
      }
      setProfileMessage({ type: 'success', text: 'Student details saved successfully.' })
    } catch (error) {
      console.error('Failed to save student details:', error)
      setProfileMessage({ type: 'error', text: error.response?.data?.error || 'Failed to save student details.' })
    } finally {
      setProfileSaving(false)
    }
  }

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

  const studentDetailsSection = (
    <div id="student-details" ref={studentDetailsRef} className={`rounded-2xl border bg-white p-6 shadow-sm scroll-mt-24 transition-all duration-500 ${focusStudentDetails ? 'border-sky-400 ring-4 ring-sky-100' : 'border-slate-200'}`}>
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <UserRound className="w-5 h-5 text-sky-600" />
            <h2 className="text-xl font-bold text-slate-900">Student Details</h2>
          </div>
          <p className="text-sm text-slate-600">Fill this information so admins can generate complete academic reports with your real details.</p>
        </div>
        <Button onClick={handleSaveDetails} disabled={profileSaving || profileLoading} className="flex items-center gap-2">
          {profileSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {profileSaving ? 'Saving...' : 'Save Details'}
        </Button>
      </div>

      {profileMessage && (
        <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${profileMessage.type === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {profileMessage.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
          <input name="name" value={studentDetails.name} onChange={handleDetailChange} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Student ID / Registration No</label>
          <input value={studentDetails.studentIdentifier} readOnly disabled className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500" placeholder="Auto-generated after registration" />
          <p className="mt-1 text-xs text-slate-500">This ID is generated automatically when your account is created.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input value={studentEmail || ''} disabled className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
          <input name="phoneNumber" value={studentDetails.phoneNumber} onChange={handleDetailChange} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
          <textarea name="address" value={studentDetails.address} onChange={handleDetailChange} rows={3} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
          <input name="city" value={studentDetails.city} onChange={handleDetailChange} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
          <input name="country" value={studentDetails.country} onChange={handleDetailChange} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Postal Code</label>
          <input name="postalCode" value={studentDetails.postalCode} onChange={handleDetailChange} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth</label>
          <input type="date" name="dateOfBirth" value={studentDetails.dateOfBirth} onChange={handleDetailChange} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Emergency Contact Name</label>
          <input name="emergencyContactName" value={studentDetails.emergencyContactName} onChange={handleDetailChange} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Emergency Contact Phone</label>
          <input name="emergencyContactPhone" value={studentDetails.emergencyContactPhone} onChange={handleDetailChange} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Guardian Email</label>
          <input name="guardianEmail" value={studentDetails.guardianEmail} onChange={handleDetailChange} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Guardian Relationship</label>
          <input name="guardianRelationship" value={studentDetails.guardianRelationship} onChange={handleDetailChange} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" placeholder="Parent, Mother, Father, Guardian..." />
        </div>
      </div>
    </div>
  )

  if (!isLoaded) {
    return (
      <div className="p-6 text-slate-600">Loading profile...</div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {studentDetailsSection}

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
