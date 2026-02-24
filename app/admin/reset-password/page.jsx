"use client"
import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Loader2, Lock, Eye, EyeOff, CheckCircle, XCircle, ArrowLeft } from 'lucide-react'

export default function ResetPasswordPage() {
    const searchParams = useSearchParams()
    const token = searchParams.get('token')

    const [verifying, setVerifying] = useState(true)
    const [tokenValid, setTokenValid] = useState(false)
    const [userName, setUserName] = useState('')
    const [userEmail, setUserEmail] = useState('')

    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        verifyToken()
    }, [token])

    const verifyToken = async () => {
        if (!token) {
            setVerifying(false)
            return
        }
        try {
            const res = await axios.get(`/api/admin/auth/reset-password?token=${token}`)
            if (res.data.valid) {
                setTokenValid(true)
                setUserName(res.data.name || '')
                setUserEmail(res.data.email || '')
            }
        } catch {
            // Invalid token
        } finally {
            setVerifying(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

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
            const res = await axios.post('/api/admin/auth/reset-password', {
                token,
                newPassword,
            })
            if (res.data.success) {
                setSuccess(true)
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to reset password')
        } finally {
            setLoading(false)
        }
    }

    if (verifying) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{
                        backgroundColor: success ? 'rgb(220 252 231)' : !tokenValid ? 'rgb(254 226 226)' : 'rgb(237 233 254)'
                    }}>
                        {success ? (
                            <CheckCircle className="h-8 w-8 text-green-500" />
                        ) : !tokenValid ? (
                            <XCircle className="h-8 w-8 text-red-500" />
                        ) : (
                            <Lock className="h-8 w-8 text-primary" />
                        )}
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {success ? 'Password Reset!' : !tokenValid ? 'Invalid Link' : 'Set New Password'}
                    </h1>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
                    {success ? (
                        <div className="space-y-6 text-center">
                            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                                <p className="text-sm text-green-700 dark:text-green-300">
                                    Your password has been reset successfully.
                                </p>
                            </div>
                            <Link
                                href="/admin/login"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                            >
                                <Lock className="h-4 w-4" />
                                Go to Login
                            </Link>
                        </div>
                    ) : !tokenValid ? (
                        <div className="space-y-6 text-center">
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                                <p className="text-sm text-red-700 dark:text-red-300">
                                    {!token
                                        ? 'No reset token provided.'
                                        : 'This password reset link is invalid or has expired.'}
                                </p>
                            </div>
                            <Link
                                href="/admin/forgot-password"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                            >
                                Request New Link
                            </Link>
                        </div>
                    ) : (
                        <>
                            {userName && (
                                <div className="mb-6 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
                                    <p className="text-sm text-gray-600 dark:text-gray-300">
                                        Resetting password for <strong>{userName}</strong>
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">{userEmail}</p>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-5">
                                {error && (
                                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                                        {error}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        New Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                            placeholder="Min 8 characters"
                                            required
                                            minLength={8}
                                            disabled={loading}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                        >
                                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Confirm Password
                                    </label>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all ${
                                            confirmPassword && confirmPassword !== newPassword
                                                ? 'border-red-400'
                                                : confirmPassword && confirmPassword === newPassword
                                                ? 'border-green-400'
                                                : 'border-gray-300 dark:border-gray-600'
                                        }`}
                                        placeholder="Repeat password"
                                        required
                                        disabled={loading}
                                    />
                                    {confirmPassword && confirmPassword !== newPassword && (
                                        <p className="text-xs text-red-500 mt-1">Passwords don't match</p>
                                    )}
                                </div>

                                {/* Password strength indicator */}
                                {newPassword && (
                                    <div className="space-y-1">
                                        <div className="flex gap-1">
                                            {[1, 2, 3, 4].map(level => (
                                                <div
                                                    key={level}
                                                    className={`h-1.5 flex-1 rounded-full ${
                                                        getPasswordStrength(newPassword) >= level
                                                            ? level <= 1 ? 'bg-red-400'
                                                            : level <= 2 ? 'bg-orange-400'
                                                            : level <= 3 ? 'bg-yellow-400'
                                                            : 'bg-green-400'
                                                            : 'bg-gray-200 dark:bg-gray-600'
                                                    }`}
                                                />
                                            ))}
                                        </div>
                                        <p className="text-xs text-gray-500">
                                            {getPasswordStrengthLabel(newPassword)}
                                        </p>
                                    </div>
                                )}

                                <Button
                                    type="submit"
                                    className="w-full py-3"
                                    disabled={loading || !newPassword || newPassword !== confirmPassword}
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Resetting...
                                        </>
                                    ) : (
                                        'Reset Password'
                                    )}
                                </Button>
                            </form>
                        </>
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

function getPasswordStrength(password) {
    let score = 0
    if (password.length >= 8) score++
    if (/[A-Z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[^A-Za-z0-9]/.test(password)) score++
    return score
}

function getPasswordStrengthLabel(password) {
    const strength = getPasswordStrength(password)
    if (strength <= 1) return 'Weak — add uppercase, numbers, symbols'
    if (strength === 2) return 'Fair'
    if (strength === 3) return 'Good'
    return 'Strong ✓'
}
