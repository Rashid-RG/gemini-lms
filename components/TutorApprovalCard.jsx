"use client"
import React, { useState, useEffect } from 'react'
import { Copy, Lock, MailOpen, LogIn, CheckCircle, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import axios from 'axios'

export default function TutorApprovalCard({ tutorEmail }) {
  const [tutorData, setTutorData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  
  // Get the base URL
  const baseUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
  
  const adminLoginUrl = `${baseUrl}/admin/login`

  // Fetch tutor data with password - with retry logic
  const fetchTutorData = async (retryCount = 0) => {
    try {
      const response = await axios.get(`/api/admin/tutor-account?email=${tutorEmail}&t=${Date.now()}`)
      if (response.data.result) {
        setTutorData(response.data.result)
        return true
      }
      return false
    } catch (error) {
      console.log('Error fetching tutor data:', error)
      // Retry up to 3 times with a delay (for timing issues during approval)
      if (retryCount < 3) {
        await new Promise(resolve => setTimeout(resolve, 500)) // Wait 500ms before retrying
        return fetchTutorData(retryCount + 1)
      }
      toast.error('Failed to load credentials')
      return false
    }
  }

  useEffect(() => {
    if (tutorEmail) {
      setLoading(true)
      fetchTutorData().finally(() => setLoading(false))
    }
  }, [tutorEmail])

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard!`)
  }
  
  if (loading) {
    return (
      <div className="bg-green-50 border-2 border-green-300 rounded-lg p-6 flex items-center justify-center h-32">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-green-300 border-t-green-600 rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-green-700">Loading credentials...</p>
        </div>
      </div>
    )
  }
  
  if (!tutorData || !tutorData.temporaryPassword) {
    return (
      <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6 shadow-lg">
        <div className="flex items-start gap-4">
          <div className="text-3xl">⚠️</div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-yellow-900 mb-2">Credentials Not Found</h3>
            <p className="text-yellow-800 mb-3">
              Your approval status shows approved, but we couldn't retrieve your login credentials. This might be a temporary issue.
            </p>
            <p className="text-sm text-yellow-700 mb-4">
              Please try again or contact support if the problem persists.
            </p>
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={async () => {
                  setLoading(true)
                  await fetchTutorData()
                  setLoading(false)
                }}
                className="bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                Try Again
              </Button>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                className="border-yellow-600 text-yellow-600 hover:bg-yellow-50"
              >
                Refresh Page
              </Button>
              <Button
                onClick={() => window.open('mailto:support@geminilms.com?subject=Tutor%20Credentials%20Issue', '_blank')}
                variant="outline"
                className="border-yellow-600 text-yellow-600 hover:bg-yellow-50"
              >
                Contact Support
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-6 shadow-lg">
      {/* Action buttons */}
      <div className="absolute top-4 right-4 flex gap-2">
        <button
          onClick={async () => {
            setRefreshing(true)
            await fetchTutorData()
            setRefreshing(false)
          }}
          disabled={refreshing}
          className="text-gray-500 hover:text-gray-700 transition disabled:opacity-50"
          title="Refresh credentials"
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0" />
        <div>
          <h3 className="text-2xl font-bold text-green-900">Congratulations! 🎉</h3>
          <p className="text-green-700">You're now an approved tutor. Here are your login credentials.</p>
        </div>
      </div>

      {/* Credentials Section */}
      <div className="space-y-4 bg-white rounded-lg p-4">
        
        {/* Email */}
        <div className="border-b pb-4">
          <div className="flex items-center gap-2 mb-2">
            <MailOpen className="w-5 h-5 text-blue-600" />
            <label className="font-semibold text-gray-900">Tutor Email</label>
          </div>
          <div className="flex items-center gap-2 bg-gray-50 p-3 rounded border border-gray-300">
            <code className="flex-1 text-gray-800 font-mono text-sm">{tutorEmail}</code>
            <button
              onClick={() => copyToClipboard(tutorEmail, 'Email')}
              className="text-blue-600 hover:text-blue-700 transition"
              title="Copy email"
            >
              <Copy className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-gray-600 mt-1">Use this email to log in to your tutor panel</p>
        </div>

        {/* Password */}
        <div className="border-b pb-4">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-5 h-5 text-blue-600" />
            <label className="font-semibold text-gray-900">Password</label>
          </div>
          <div className="flex items-center gap-2 bg-gray-50 p-3 rounded border border-gray-300">
            <code className="flex-1 text-gray-800 font-mono text-sm">
              {showPassword ? tutorData.temporaryPassword : '••••••••••••'}
            </code>
            <button
              onClick={() => copyToClipboard(tutorData.temporaryPassword, 'Password')}
              className="text-blue-600 hover:text-blue-700 transition"
              title="Copy password"
            >
              <Copy className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="text-gray-600 hover:text-gray-700 transition"
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
          <p className="text-xs text-gray-600 mt-1">
            You can change this password anytime in your profile settings.
          </p>
        </div>

        {/* Login Button */}
        <div>
          <p className="text-sm text-gray-700 mb-2">
            Ready to start? Click below to access your tutor dashboard:
          </p>
          <Button
            onClick={() => window.open(adminLoginUrl, '_blank')}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold"
          >
            <LogIn className="w-5 h-5 mr-2" />
            Open Tutor Login
          </Button>
        </div>
      </div>

      {/* Quick Start Instructions */}
      <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">📚 Quick Start Guide</h4>
        <ol className="text-sm text-blue-800 space-y-1 ml-4 list-decimal">
          <li>Copy your email and password above</li>
          <li>Click <strong>"Open Tutor Login"</strong> button</li>
          <li>Enter your email and password</li>
          <li>Go to "Create Course" in the sidebar</li>
          <li>Start creating and publishing courses!</li>
        </ol>
      </div>

      {/* Features Info */}
      <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
        <div className="bg-white rounded p-3 border border-green-200">
          <div className="text-2xl mb-1">📖</div>
          <p className="font-medium text-gray-900">Create Courses</p>
          <p className="text-xs text-gray-600">Build complete learning paths</p>
        </div>
        <div className="bg-white rounded p-3 border border-green-200">
          <div className="text-2xl mb-1">👥</div>
          <p className="font-medium text-gray-900">Manage Students</p>
          <p className="text-xs text-gray-600">Track student progress</p>
        </div>
        <div className="bg-white rounded p-3 border border-green-200">
          <div className="text-2xl mb-1">💰</div>
          <p className="font-medium text-gray-900">Earn Revenue</p>
          <p className="text-xs text-gray-600">Get paid for your courses</p>
        </div>
      </div>
    </div>
  )
}
