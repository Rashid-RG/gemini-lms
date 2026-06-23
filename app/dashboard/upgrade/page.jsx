"use client"
import { Button } from '@/components/ui/button'
import React, { useState, useEffect, useRef, useContext } from 'react'
import { useUser } from '@clerk/nextjs'
import { Sparkles, Zap, Loader2, CheckCircle, CreditCard, Receipt, Clock, RefreshCw, XCircle, Info, HelpCircle, Gift, Coins } from 'lucide-react'
import axios from 'axios'
import { CourseCountContext } from '@/app/_context/CourseCountContext'

// Safe date formatting helper to prevent SSR/client hydration mismatch
const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch {
        return '';
    }
};

function Upgrade() {
    const { user, isLoaded } = useUser()
    const { isMember } = useContext(CourseCountContext)
    const [loading, setLoading] = useState(null)
    const [error, setError] = useState('')
    const formRef = useRef(null)
    const [paymentData, setPaymentData] = useState(null)
    const [checkoutUrl, setCheckoutUrl] = useState('')

    // Payment History states
    const [paymentHistory, setPaymentHistory] = useState([])
    const [historyLoading, setHistoryLoading] = useState(true)

    const fetchPaymentHistory = async () => {
        if (!user || !user.primaryEmailAddress?.emailAddress) return
        try {
            setHistoryLoading(true)
            const email = user.primaryEmailAddress.emailAddress
            const response = await axios.get(`/api/payments/history?email=${encodeURIComponent(email)}`)
            if (response.data.success) {
                setPaymentHistory(response.data.result)
            }
        } catch (err) {
            console.error('Failed to load payment history:', err)
        } finally {
            setHistoryLoading(false)
        }
    }

    useEffect(() => {
        if (isLoaded && user) {
            fetchPaymentHistory()
        }
    }, [isLoaded, user])

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

{/* Help & Explanation: How System Credits Work */}
<div className="mt-16 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-950 dark:to-indigo-950/20 border border-indigo-100 dark:border-slate-800 rounded-3xl p-8 shadow-sm">
    <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-indigo-650 rounded-2xl text-white shadow-md shadow-indigo-200 dark:shadow-none">
            <HelpCircle className="w-6 h-6" />
        </div>
        <div className="text-left">
            <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">How Credits & Subscriptions Work</h3>
            <p className="text-xs text-gray-550 dark:text-gray-400 font-medium">All you need to know about our simple billing system</p>
        </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
        {/* Card 1 */}
        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-850 p-5 rounded-2xl shadow-xs flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 animate-pulse">
                <Coins className="w-5 h-5" />
            </div>
            <div>
                <h4 className="font-bold text-gray-800 dark:text-white text-sm">What is a System Credit?</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">
                    A credit represents <strong>1 full AI Course generation</strong>. When you create a course, the AI consumes 1 credit to draft outlines, write comprehensive study notes, generate flashcards, prepare interactive assignments, build quizzes, and fetch YouTube videos.
                </p>
            </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-850 p-5 rounded-2xl shadow-xs flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                <Gift className="w-5 h-5 animate-bounce" style={{ animationDuration: '3s' }} />
            </div>
            <div>
                <h4 className="font-bold text-gray-800 dark:text-white text-sm">5 Free Welcome Credits</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">
                    Every newly registered student is instantly gifted <strong>5 welcome credits</strong>. This allows you to explore our course generation engine and create 5 deep-dive courses absolutely free.
                </p>
            </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-850 p-5 rounded-2xl shadow-xs flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <RefreshCw className="w-5 h-5 animate-spin" style={{ animationDuration: '8s' }} />
            </div>
            <div>
                <h4 className="font-bold text-gray-800 dark:text-white text-sm">Zero Risk: Failed Course Refund</h4>
                <p className="text-xs text-gray-550 dark:text-gray-400 mt-1.5 leading-relaxed">
                    If AI generation is interrupted by rate limits or a server exception, deleting the failed course on your dashboard will <strong>automatically restore the 1 credit</strong> back to your balance. You only pay for successful generations!
                </p>
            </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 p-5 rounded-2xl shadow-xs flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
                <h4 className="font-bold text-gray-800 dark:text-white text-sm">Credit Packs vs. Subscriptions</h4>
                <p className="text-xs text-gray-500 dark:text-gray-450 mt-1.5 leading-relaxed">
                    <strong>Packs</strong> grant permanent, non-expiring credits for casual learning. <strong>Premium Subscriptions</strong> (Rs. 1,500/month) grant <strong>Unlimited generations</strong> (bypassing credit limits entirely) plus Priority AI and Certificate downloads.
                </p>
            </div>
        </div>
    </div>
</div>

{/* Payment History Section */}
<div className="mt-16 bg-white border border-gray-150 rounded-2xl p-6 shadow-sm">
    <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-gray-100">
        <Receipt className="w-5.5 h-5.5 text-primary animate-pulse" />
        <div className="text-left">
            <h3 className="text-xl font-bold text-gray-800">Billing & Payment History</h3>
            <p className="text-xs text-gray-550 mt-0.5">View your past subscription upgrades and credit purchases</p>
        </div>
    </div>

    {historyLoading ? (
        <div className="flex flex-col items-center justify-center py-10 space-y-3">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
            <p className="text-sm text-gray-400">Loading your transactions...</p>
        </div>
    ) : paymentHistory.length === 0 ? (
        <div className="text-center py-10 px-4 border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
            <Receipt className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <h4 className="font-semibold text-gray-700">No payment history found</h4>
            <p className="text-xs text-gray-500 max-w-xs mx-auto mt-1">Once you upgrade your account or purchase additional credits, your invoice details and transaction logs will be listed here.</p>
        </div>
    ) : (
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        <th className="py-3 px-4">Transaction ID</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Plan / Package</th>
                        <th className="py-3 px-4">Amount</th>
                        <th className="py-3 px-4">Credits</th>
                        <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-sm text-gray-700">
                    {paymentHistory.map((payment) => (
                        <tr key={payment.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="py-3.5 px-4 font-mono text-xs text-gray-500">
                                {payment.gatewayPaymentId || `TX-${payment.id.toString().padStart(6, '0')}`}
                            </td>
                            <td className="py-3.5 px-4 font-medium text-gray-600">
                                {formatDate(payment.createdAt)}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-gray-800 capitalize">
                                {payment.plan?.replace('credits_', '')?.replace('premium_', '') || 'Custom Package'}
                                <span className="text-[10px] ml-1.5 font-bold text-gray-400 uppercase tracking-wider">
                                    ({payment.planType})
                                </span>
                            </td>
                            <td className="py-3.5 px-4 font-extrabold text-primary">
                                {payment.currency?.toUpperCase() === 'LKR' ? 'Rs. ' : '$'}
                                {parseFloat(payment.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-gray-600">
                                {payment.creditsAdded > 0 ? `+${payment.creditsAdded}` : '—'}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                                    payment.status === 'completed' || payment.status === 'success'
                                        ? 'bg-green-50 text-green-700 border border-green-100'
                                        : payment.status === 'pending'
                                        ? 'bg-yellow-50 text-yellow-700 border border-yellow-100'
                                        : payment.status === 'refunded'
                                        ? 'bg-blue-50 text-blue-700 border border-blue-100'
                                        : 'bg-red-50 text-red-700 border border-red-100'
                                }`}>
                                    {(payment.status === 'completed' || payment.status === 'success') && <CheckCircle className="w-3.5 h-3.5" />}
                                    {payment.status === 'pending' && <Clock className="w-3.5 h-3.5 animate-pulse" />}
                                    {payment.status === 'refunded' && <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '4s' }} />}
                                    {payment.status === 'failed' && <XCircle className="w-3.5 h-3.5" />}
                                    <span className="capitalize">{payment.status || 'completed'}</span>
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )}
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