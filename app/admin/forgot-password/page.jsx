"use client"
import React, { useState } from 'react'
import Link from 'next/link'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Loader2, Mail, ArrowLeft, CheckCircle, Shield } from 'lucide-react'

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [sent, setSent] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e) => {
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

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                        {sent ? (
                            <CheckCircle className="h-8 w-8 text-green-500" />
                        ) : (
                            <Mail className="h-8 w-8 text-primary" />
                        )}
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {sent ? 'Check Your Email' : 'Forgot Password'}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                        {sent
                            ? 'We sent a password reset link to your email'
                            : 'Enter your email and we\'ll send you a reset link'}
                    </p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
                    {sent ? (
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
                                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm text-center"
                                >
                                    Back to Login
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
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
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
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
                    )}
                </div>

                <div className="text-center mt-6">
                    <Link
                        href="/admin/login"
                        className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-primary transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Login
                    </Link>
                </div>
            </div>
        </div>
    )
}
