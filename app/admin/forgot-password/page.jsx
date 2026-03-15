"use client"
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Loader2, Mail, ArrowLeft, CheckCircle, Shield, Lock, AlertCircle } from 'lucide-react'

export default function ForgotPasswordPage() {
    const searchParams = useSearchParams()
    const router = useRouter()
    
    const prefilledEmail = searchParams.get('email') || ''
    const isTutorSetup = !!prefilledEmail // If email is provided, it's for new tutor password setup
    
    const [email, setEmail] = useState(prefilledEmail)
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [sent, setSent] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState('')

    // For existing admins - send reset link via email
    const handleEmailSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            await axios.post('/api/admin/auth/forgot-password', { email })
            setSent(true)
        } catch (err) {
            setError(err.response?.data?.error || 'Something went wrong. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    // For new tutors - set password directly
    const handlePasswordSet = async (e) => {
        e.preventDefault()
        setError('')

        // Validation
        if (!newPassword.trim()) {
            setError('Password is required')
            return
        }
        if (newPassword.length < 8) {
            setError('Password must be at least 8 characters')
            return
        }
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match')
            return
        }

        setLoading(true)
        try {
            const response = await axios.post('/api/admin/auth/set-password', {
                email,
                password: newPassword
            })
            
            if (response.data.success) {
                setSuccess(true)
                // Redirect to login after 3 seconds
                setTimeout(() => {
                    router.push('/admin/login')
                }, 3000)
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to set password')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
            <div className="w-full max-w-md">
                {/* Success State */}
                {success ? (
                    <>
                        {/* Header */}
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                                <CheckCircle className="h-8 w-8 text-green-500" />
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                Password Set Successfully! 🎉
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400 mt-2">
                                Your tutor account password has been updated.
                            </p>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 space-y-6">
                            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                                <p className="text-sm text-green-700 dark:text-green-300">
                                    You can now log in to your tutor dashboard using:
                                </p>
                                <p className="text-sm text-green-700 dark:text-green-300 font-semibold mt-2">
                                    Email: <code className="bg-white dark:bg-gray-700 px-2 py-1 rounded">{email}</code>
                                </p>
                            </div>

                            <div className="space-y-3">
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Redirecting to login in 3 seconds...
                                </p>
                                <Link
                                    href="/admin/login"
                                    className="block w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-center font-semibold transition-colors"
                                >
                                    Go to Login Now
                                </Link>
                            </div>

                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                                <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">Next Steps:</h4>
                                <ol className="text-sm text-blue-800 dark:text-blue-300 space-y-1 ml-4 list-decimal">
                                    <li>Log in with your email and new password</li>
                                    <li>Go to "Create Course" section</li>
                                    <li>Start creating your first course!</li>
                                </ol>
                            </div>
                        </div>
                    </>
                ) : isTutorSetup ? (
                    // TUTOR PASSWORD SETUP FLOW
                    <>
                        {/* Header */}
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-4">
                                <Lock className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                Set Your Tutor Password
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400 mt-2">
                                Create a secure password for your tutor account
                            </p>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
                            <form onSubmit={handlePasswordSet} className="space-y-6">
                                {error && (
                                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm flex gap-2">
                                        <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                                        {error}
                                    </div>
                                )}

                                {/* Email Display */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Tutor Email
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        disabled
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                                    />
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        Use this email to log in
                                    </p>
                                </div>

                                {/* New Password */}
                                <div>
                                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        New Password
                                    </label>
                                    <input
                                        id="password"
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        placeholder="••••••••"
                                        required
                                        disabled={loading}
                                    />
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        Minimum 8 characters
                                    </p>
                                </div>

                                {/* Confirm Password */}
                                <div>
                                    <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Confirm Password
                                    </label>
                                    <input
                                        id="confirm"
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        placeholder="••••••••"
                                        required
                                        disabled={loading}
                                    />
                                </div>

                                <Button type="submit" className="w-full py-3" disabled={loading}>
                                    {loading ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Setting Password...
                                        </>
                                    ) : (
                                        <>
                                            <Lock className="h-4 w-4 mr-2" />
                                            Set Password
                                        </>
                                    )}
                                </Button>
                            </form>

                            {/* Requirements */}
                            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">Password Requirements:</h4>
                                <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-1 ml-4 list-disc">
                                    <li>At least 8 characters long</li>
                                    <li>Must match in both fields</li>
                                    <li>Use a mix of letters, numbers, and symbols for better security</li>
                                </ul>
                            </div>
                        </div>
                    </>
                ) : sent ? (
                    // EMAIL SENT STATE (for existing admins)
                    <>
                        {/* Header */}
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                                <CheckCircle className="h-8 w-8 text-green-500" />
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                Check Your Email
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400 mt-2">
                                We sent a password reset link to your email
                            </p>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
                            <div className="space-y-6">
                                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                                    <p className="text-sm text-green-700 dark:text-green-300">
                                        If an account exists for <strong>{email}</strong>, you will receive a password reset email shortly.
                                    </p>
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400 space-y-2">
                                    <p>• Check your inbox and spam folder</p>
                                    <p>• The link expires in <strong>1 hour</strong></p>
                                    <p>• Didn't receive it? Try again below</p>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => { setSent(false); setEmail(''); }}
                                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
                                    >
                                        Try Again
                                    </button>
                                    <Link
                                        href="/admin/login"
                                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm text-center"
                                    >
                                        Back to Login
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    // EMAIL REQUEST STATE (for existing admins)
                    <>
                        {/* Header */}
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-4">
                                <Mail className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                Forgot Password
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400 mt-2">
                                Enter your email and we'll send you a reset link
                            </p>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
                            <form onSubmit={handleEmailSubmit} className="space-y-6">
                                {error && (
                                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                                        {error}
                                    </div>
                                )}

                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Email Address
                                    </label>
                                    <input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        placeholder="your@email.com"
                                        required
                                        disabled={loading}
                                    />
                                </div>

                                <Button type="submit" className="w-full py-3" disabled={loading}>
                                    {loading ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <Mail className="h-4 w-4 mr-2" />
                                            Send Reset Link
                                        </>
                                    )}
                                </Button>
                            </form>
                        </div>
                    </>
                )}

                <div className="text-center mt-6">
                    <Link
                        href="/admin/login"
                        className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Login
                    </Link>
                </div>
            </div>
        </div>
    )
}
