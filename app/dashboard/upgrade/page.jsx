"use client"
import { Button } from '@/components/ui/button'
import React, { useState, useRef, useContext } from 'react'
import { useUser } from '@clerk/nextjs'
import { Sparkles, Zap, Loader2, CheckCircle, CreditCard } from 'lucide-react'
import axios from 'axios'
import { CourseCountContext } from '@/app/_context/CourseCountContext'

function Upgrade() {
    const { user, isLoaded } = useUser()
    const { isMember } = useContext(CourseCountContext)
    const [loading, setLoading] = useState(null)
    const [error, setError] = useState('')
    const formRef = useRef(null)
    const [paymentData, setPaymentData] = useState(null)
    const [checkoutUrl, setCheckoutUrl] = useState('')

    const handlePurchase = async (planId) => {
        if (!user) {
            setError('Please sign in to purchase')
            return
        }

        try {
            setLoading(planId)
            setError('')

            const response = await axios.post('/api/payments/payhere/initiate', {
                planId,
                userEmail: user.primaryEmailAddress?.emailAddress,
                userName: user.fullName || user.firstName || 'User',
                userPhone: user.phoneNumbers?.[0]?.phoneNumber || ''
            })

            if (response.data.success) {
                setPaymentData(response.data.paymentData)
                setCheckoutUrl(response.data.checkoutUrl)
                
                // Store order details for verification on success page
                localStorage.setItem('lastOrderId', response.data.paymentData.order_id)
                localStorage.setItem('lastPlanId', planId)
                
                // Submit form after state updates
                setTimeout(() => {
                    if (formRef.current) {
                        formRef.current.submit()
                    }
                }, 100)
            }
        } catch (err) {
            console.error('Payment error:', err)
            setError(err.response?.data?.error || 'Failed to initiate payment')
            setLoading(null)
        }
    }

    if (!isLoaded) {
        return (
            <div className="p-6 flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

  return (
    <div className="p-6">
    <h2 className='font-bold text-3xl text-gray-800'>Upgrade Your Plan</h2>
    <p className='text-gray-600 mt-1'>Choose a plan to generate more courses for your learning journey</p>

    {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 max-w-4xl mx-auto">
            {error}
        </div>
    )}
  
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:items-stretch md:gap-8">


  <div className="rounded-2xl border-2 border-gray-200 p-6 shadow-sm sm:px-8 lg:p-12 bg-white">
    <div className="text-center">
      <h2 className="text-xl font-bold text-gray-900">
        Free Plan
      </h2>

      <p className="mt-2 sm:mt-4">
        <strong className="text-4xl font-bold text-gray-900 sm:text-5xl">Rs. 0</strong>
        <span className="text-sm font-medium text-gray-500">/month</span>
      </p>
    </div>

    <ul className="mt-6 space-y-3">
      <li className="flex items-center gap-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          className="size-5 text-green-600"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>

        <span className="text-gray-700">5 Course Credits</span>
      </li>

      <li className="flex items-center gap-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          className="size-5 text-green-600"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>

        <span className="text-gray-700">AI-Generated Notes & Flashcards</span>
      </li>

      <li className="flex items-center gap-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          className="size-5 text-green-600"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>

        <span className="text-gray-700">Quiz & Assignments</span>
      </li>

      <li className="flex items-center gap-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          className="size-5 text-green-600"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>

        <span className="text-gray-700">Email Support</span>
      </li>
    </ul>

    {!isMember ? (
        <Button variant="outline" className="w-full mt-8 text-gray-600 border-gray-300" disabled>
            Current Plan
        </Button>
    ) : (
        <Button variant="outline" className="w-full mt-8 text-gray-400 border-gray-200" disabled>
            Free Plan
        </Button>
    )}
  </div>

  {/* Premium Plan */}
  <div className="rounded-2xl border-2 border-primary p-6 shadow-lg sm:px-8 lg:p-12 bg-gradient-to-br from-primary/5 to-purple-50 relative">
    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
      <span className="bg-primary text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
        <Sparkles className="w-3 h-3" /> POPULAR
      </span>
    </div>
    
    <div className="text-center">
      <h2 className="text-xl font-bold text-gray-900 flex items-center justify-center gap-2">
        <Zap className="w-5 h-5 text-primary" />
        Premium Plan
      </h2>

      <p className="mt-2 sm:mt-4">
        <strong className="text-4xl font-bold text-primary sm:text-5xl">Rs. 1,500</strong>
        <span className="text-sm font-medium text-gray-500">/month</span>
      </p>
      <p className="text-xs text-gray-500 mt-1">or Rs. 15,000/year (save Rs. 3,000)</p>
    </div>

    <ul className="mt-6 space-y-3">
      <li className="flex items-center gap-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          className="size-5 text-primary"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>

        <span className="text-gray-700 font-medium">Unlimited Course Generation</span>
      </li>

      <li className="flex items-center gap-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          className="size-5 text-primary"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>

        <span className="text-gray-700">Unlimited Flashcards & Quizzes</span>
      </li>

      <li className="flex items-center gap-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          className="size-5 text-primary"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>

        <span className="text-gray-700">Priority AI Processing</span>
      </li>

      <li className="flex items-center gap-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          className="size-5 text-primary"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>

        <span className="text-gray-700">24/7 Priority Support</span>
      </li>

      <li className="flex items-center gap-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          className="size-5 text-primary"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>

        <span className="text-gray-700">Certificate Downloads</span>
      </li>
    </ul>

    {isMember ? (
        <>
            <Button className="w-full mt-8 bg-green-600 hover:bg-green-700 text-white font-semibold py-3" disabled>
                <CheckCircle className="w-4 h-4 mr-2" />
                Current Plan
            </Button>
            <p className="text-center text-sm text-gray-500 mt-2">You&apos;re enjoying all premium features!</p>
        </>
    ) : (
        <>
            <Button className="w-full mt-8 bg-primary hover:bg-primary/90 text-white font-semibold py-3" disabled={loading} onClick={() => handlePurchase('premium_monthly')}>
              {loading === 'premium_monthly' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Pay Rs. 1,500/month
                </>
              )}
            </Button>
            <Button variant="outline" className="w-full mt-2 border-primary text-primary hover:bg-primary/10" disabled={loading} onClick={() => handlePurchase('premium_yearly')}>
              {loading === 'premium_yearly' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Pay Rs. 15,000/year (Save Rs. 3,000)'
              )}
            </Button>
        </>
    )}
    
    <p className="text-center text-xs text-gray-500 mt-3">
      🔒 Secure payment via PayHere
    </p>
  </div>
</div>

{/* Additional Credit Packs */}
<div className="mt-12">
  <h3 className="text-xl font-bold text-gray-800 text-center mb-6">Or Buy Credit Packs</h3>
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
    <div onClick={() => !loading && handlePurchase('credits_5')} className={`border rounded-xl p-4 text-center hover:border-primary hover:shadow-md transition cursor-pointer ${loading === 'credits_5' ? 'opacity-70' : ''}`}>
      <p className="text-2xl font-bold text-gray-800">5 Credits</p>
      <p className="text-primary font-bold text-xl mt-1">Rs. 500</p>
      <p className="text-xs text-gray-500">Rs. 100/course</p>
      {loading === 'credits_5' && <Loader2 className="w-5 h-5 animate-spin mx-auto mt-2 text-primary" />}
    </div>
    <div onClick={() => !loading && handlePurchase('credits_15')} className={`border-2 border-primary rounded-xl p-4 text-center shadow-md relative cursor-pointer hover:shadow-lg transition ${loading === 'credits_15' ? 'opacity-70' : ''}`}>
      <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">Best Value</span>
      <p className="text-2xl font-bold text-gray-800">15 Credits</p>
      <p className="text-primary font-bold text-xl mt-1">Rs. 1,200</p>
      <p className="text-xs text-gray-500">Rs. 80/course</p>
      {loading === 'credits_15' && <Loader2 className="w-5 h-5 animate-spin mx-auto mt-2 text-primary" />}
    </div>
    <div onClick={() => !loading && handlePurchase('credits_30')} className={`border rounded-xl p-4 text-center hover:border-primary hover:shadow-md transition cursor-pointer ${loading === 'credits_30' ? 'opacity-70' : ''}`}>
      <p className="text-2xl font-bold text-gray-800">30 Credits</p>
      <p className="text-primary font-bold text-xl mt-1">Rs. 2,100</p>
      <p className="text-xs text-gray-500">Rs. 70/course</p>
      {loading === 'credits_30' && <Loader2 className="w-5 h-5 animate-spin mx-auto mt-2 text-primary" />}
    </div>
  </div>
</div>

<div className="mt-8 text-center">
    <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
        <span className="flex items-center gap-1">
            <CheckCircle className="w-4 h-4 text-green-500" />
            Instant Activation
        </span>
        <span className="flex items-center gap-1">
            <CheckCircle className="w-4 h-4 text-green-500" />
            Secure Payment
        </span>
        <span className="flex items-center gap-1">
            <CheckCircle className="w-4 h-4 text-green-500" />
            24/7 Support
        </span>
    </div>
</div>
</div>

{/* Hidden PayHere Form */}
{paymentData && (
    <form 
        ref={formRef}
        method="POST" 
        action={checkoutUrl}
        style={{ display: 'none' }}
    >
        {Object.entries(paymentData).map(([key, value]) => (
            <input key={key} type="hidden" name={key} value={value} />
        ))}
    </form>
)}
</div>
  )
}

export default Upgrade