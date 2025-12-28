"use client"
import React, { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle, Loader } from 'lucide-react'
import { toast } from 'sonner'

export default function CancelSubscription() {
  const { user } = useUser()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [subscriptionInfo, setSubscriptionInfo] = useState(null)
  const [reason, setReason] = useState('')
  const [confirmCancel, setConfirmCancel] = useState(false)

  useEffect(() => {
    if (user?.primaryEmailAddress?.emailAddress) {
      fetchSubscriptionInfo()
    }
  }, [user])

  const fetchSubscriptionInfo = async () => {
    try {
      const response = await axios.get('/api/subscription/cancel', {
        params: { email: user?.primaryEmailAddress?.emailAddress }
      })
      setSubscriptionInfo(response.data)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching subscription info:', error)
      toast.error('Failed to load subscription info')
      setLoading(false)
    }
  }

  const handleCancelSubscription = async () => {
    if (!confirmCancel) {
      toast.error('Please confirm cancellation')
      return
    }

    setCancelling(true)
    try {
      const response = await axios.post('/api/subscription/cancel', {
        userEmail: user?.primaryEmailAddress?.emailAddress,
        reason: reason || 'User requested cancellation'
      })

      toast.success('Subscription cancelled successfully! You will receive a refund confirmation email.')
      
      // Redirect after 2 seconds
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch (error) {
      console.error('Error cancelling subscription:', error)
      toast.error(error.response?.data?.error || 'Failed to cancel subscription')
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Loader className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!subscriptionInfo?.user?.isMember) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">No Active Subscription</h1>
            <p className="text-gray-600 mb-6">You don't have an active premium subscription to cancel.</p>
            <Button 
              onClick={() => router.push('/dashboard')}
              className="w-full"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-2xl mx-auto mt-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Cancel Subscription</h1>
          <p className="text-gray-600">We're sorry to see you go. Review your subscription details below.</p>
        </div>

        {/* Subscription Details */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4 text-primary">✨ Premium Member</h2>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-4 border-b">
              <span className="text-gray-600">Member Since:</span>
              <span className="font-semibold">{new Date(subscriptionInfo.user.joinedAt).toLocaleDateString()}</span>
            </div>

            {subscriptionInfo.lastPayment && (
              <>
                <div className="flex justify-between items-center pb-4 border-b">
                  <span className="text-gray-600">Plan:</span>
                  <span className="font-semibold capitalize">{subscriptionInfo.lastPayment.plan.replace(/_/g, ' ')}</span>
                </div>

                <div className="flex justify-between items-center pb-4 border-b">
                  <span className="text-gray-600">Payment Amount:</span>
                  <span className="font-semibold text-green-600">Rs. {subscriptionInfo.lastPayment.amount}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Refund Amount:</span>
                  <span className="font-semibold text-green-600">Rs. {subscriptionInfo.lastPayment.amount}</span>
                </div>
              </>
            )}
          </div>

          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              ✓ Full refund will be processed after cancellation
            </p>
          </div>
        </div>

        {/* Cancellation Reason */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Why are you cancelling? (Optional)</h3>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Your feedback helps us improve..."
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            rows="4"
          />
          <p className="text-xs text-gray-500 mt-2">This helps us understand how we can serve you better</p>
        </div>

        {/* Confirmation */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Confirm Cancellation</h3>
          
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmCancel}
              onChange={(e) => setConfirmCancel(e.target.checked)}
              className="w-5 h-5 text-primary rounded cursor-pointer"
            />
            <span className="text-gray-700">
              I understand that my premium membership and unlimited course creation will be cancelled
            </span>
          </label>

          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              ⚠️ After cancellation, you will have 0 course credits. You can purchase credit packs anytime.
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard')}
            className="flex-1"
            disabled={cancelling}
          >
            Keep Subscription
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancelSubscription}
            disabled={!confirmCancel || cancelling}
            className="flex-1"
          >
            {cancelling ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Cancelling...
              </>
            ) : (
              'Cancel Subscription'
            )}
          </Button>
        </div>

        {/* Support Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <p className="text-gray-700 mb-4">Having issues? Need help?</p>
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/support')}
            className="w-full"
          >
            Contact Support
          </Button>
        </div>
      </div>
    </div>
  )
}
