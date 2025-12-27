"use client"
import React, { useEffect, useState, useRef } from 'react'
import { CheckCircle, Sparkles, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUser } from '@clerk/nextjs'
import axios from 'axios'

export default function PaymentSuccess() {
    const { user, isLoaded } = useUser()
    const [mounted, setMounted] = useState(false)
    const [status, setStatus] = useState('loading') // loading, verified, error
    const [creditsAdded, setCreditsAdded] = useState(null)
    const [isMember, setIsMember] = useState(false)
    const [countdown, setCountdown] = useState(10)
    const hasVerified = useRef(false)
    const hasRedirected = useRef(false)

    // Mount effect - client-side only
    useEffect(() => {
        setMounted(true)
    }, [])

    // Verify payment effect
    useEffect(() => {
        if (!mounted || !isLoaded || !user || hasVerified.current) return

        hasVerified.current = true

        const verifyPayment = async () => {
            try {
                const urlParams = new URLSearchParams(window.location.search)
                const orderId = urlParams.get('order_id') || ''
                const planId = urlParams.get('plan') || localStorage.getItem('lastPlanId') || ''
                const userEmail = user.primaryEmailAddress?.emailAddress

                console.log('Verifying payment:', { orderId, planId, userEmail })

                if (!userEmail || !planId) {
                    console.error('Missing verification data')
                    setStatus('error')
                    return
                }

                const response = await axios.post('/api/payments/verify', {
                    orderId,
                    userEmail,
                    planId
                })

                console.log('Verify response:', response.data)

                if (response.data.success) {
                    setCreditsAdded(response.data.creditsAdded)
                    setIsMember(response.data.isMember || false)
                    setStatus('verified')
                    localStorage.removeItem('lastOrderId')
                    localStorage.removeItem('lastPlanId')
                    
                    // Confetti effect
                    try {
                        const confetti = await import('canvas-confetti')
                        confetti.default({
                            particleCount: 100,
                            spread: 70,
                            origin: { y: 0.6 }
                        })
                    } catch (e) {
                        console.log('Confetti not available')
                    }
                } else {
                    setStatus('error')
                }
            } catch (error) {
                console.error('Verification error:', error)
                setStatus('error')
            }
        }

        verifyPayment()
    }, [mounted, isLoaded, user])

    // Countdown and redirect effect - completely separate
    useEffect(() => {
        if (status !== 'verified') return

        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer)
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(timer)
    }, [status])

    // Redirect effect - only triggers when countdown hits 0
    useEffect(() => {
        if (countdown === 0 && status === 'verified' && !hasRedirected.current) {
            hasRedirected.current = true
            // Force full page reload to refresh sidebar data
            window.location.href = '/dashboard?refresh=' + Date.now()
        }
    }, [countdown, status])

    // Navigation handlers
    const goToDashboard = () => {
        window.location.href = '/dashboard?refresh=' + Date.now()
    }

    const goToCreate = () => {
        window.location.href = '/create'
    }

    // Prevent hydration mismatch - render nothing until mounted
    if (!mounted) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    // Loading state
    if (status === 'loading') {
        return (
            <div className="min-h-[80vh] flex items-center justify-center p-6">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-gray-600">Verifying your payment...</p>
                </div>
            </div>
        )
    }

    // Error state
    if (status === 'error') {
        return (
            <div className="min-h-[80vh] flex items-center justify-center p-6">
                <div className="max-w-md w-full text-center">
                    <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Sparkles className="w-10 h-10 text-yellow-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Received</h1>
                    <p className="text-gray-600 mb-6">
                        Your payment was successful! If credits don&apos;t appear immediately, please refresh.
                    </p>
                    <Button onClick={goToDashboard} className="w-full bg-primary hover:bg-primary/90">
                        Go to Dashboard
                    </Button>
                </div>
            </div>
        )
    }

    // Success state
    return (
        <div className="min-h-[80vh] flex items-center justify-center p-6">
            <div className="max-w-md w-full text-center">
                <div className="mb-6">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                        <CheckCircle className="w-10 h-10 text-green-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
                    <p className="text-gray-600">
                        Your account has been upgraded successfully.
                    </p>
                </div>

                <div className="bg-gradient-to-br from-primary/10 to-purple-50 rounded-2xl p-6 mb-6">
                    <Sparkles className="w-8 h-8 text-primary mx-auto mb-3" />
                    <p className="text-lg font-semibold text-gray-800">Account Upgraded!</p>
                    {creditsAdded !== null && (
                        <p className="text-2xl font-bold text-primary mt-2">
                            {isMember ? '✨ Premium Unlimited' : `+${creditsAdded} Credits`}
                        </p>
                    )}
                    <p className="text-sm text-gray-600 mt-1">
                        Start creating AI-powered courses now!
                    </p>
                </div>

                <div className="space-y-3">
                    <Button onClick={goToCreate} className="w-full bg-primary hover:bg-primary/90">
                        Create a Course <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                    <Button onClick={goToDashboard} variant="outline" className="w-full">
                        Go to Dashboard
                    </Button>
                </div>

                <p className="text-sm text-gray-500 mt-6">
                    Redirecting to dashboard in {countdown}s...
                </p>
            </div>
        </div>
    )
}
