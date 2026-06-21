"use client"
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Loader2, Shield, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useSignIn, useUser, useClerk } from '@clerk/nextjs'

export default function AdminLoginPage() {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [checking, setChecking] = useState(true)
    const [error, setError] = useState('')
    const [role, setRole] = useState('super_admin')
    const [callbackRunning, setCallbackRunning] = useState(false)

    // Clerk hooks for Google OAuth
    const { signIn, isLoaded: signInLoaded } = useSignIn()
    const { user, isLoaded: userLoaded } = useUser()
    const { signOut } = useClerk()

    // Check session on mount and when Clerk user loads
    useEffect(() => {
        const init = async () => {
            const authenticated = await checkSession()
            if (!authenticated && userLoaded && user) {
                await handleGoogleCallback()
            }
        }
        init()
    }, [userLoaded, user])

    const checkSession = async () => {
        try {
            const response = await axios.get('/api/admin/auth/verify')
            if (response.data.authenticated) {
                router.push('/admin/dashboard')
                return true
            }
        } catch (error) {
            // Not authenticated, stay on login page
        } finally {
            setChecking(false)
        }
        return false
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const response = await axios.post('/api/admin/auth/login', {
                email,
                password,
                role
            })

            if (response.data.success) {
                toast.success('Login successful!')
                router.push('/admin/dashboard')
            }
        } catch (error) {
            const message = error.response?.data?.error || 'Login failed'
            setError(message)
            toast.error(message)
        } finally {
            setLoading(false)
        }
    }

    const handleGoogleLogin = async () => {
        if (!signInLoaded) return
        setError('')
        setLoading(true)
        try {
            // Start Google OAuth flow
            await signIn.authenticateWithRedirect({
                strategy: 'oauth_google',
                redirectUrl: '/admin/login',
                redirectUrlComplete: '/admin/login',
            })
        } catch (err) {
            console.error('Failed to initiate Google OAuth:', err)
            setError('Failed to initiate Google sign-in')
            toast.error('Failed to initiate Google sign-in')
            setLoading(false)
        }
    }

    const handleGoogleCallback = async () => {
        if (callbackRunning) return
        setCallbackRunning(true)
        setLoading(true)
        setError('')
        try {
            const response = await axios.post('/api/admin/auth/google-login')
            if (response.data.success) {
                toast.success('Google login successful!')
                router.push('/admin/dashboard')
            }
        } catch (error) {
            const message = error.response?.data?.error || 'Access denied: Google account is not a registered admin'
            setError(message)
            toast.error(message)
            
            // Sign out of Clerk to prevent automatic re-authentication attempts
            try {
                await signOut()
            } catch (signOutErr) {
                console.error("Clerk sign-out error:", signOutErr)
            }
        } finally {
            setLoading(false)
            setCallbackRunning(false)
        }
    }

    if (checking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
            <div className="w-full max-w-md">
                {/* Logo/Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                        <Shield className="h-8 w-8 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Portal</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">Sign in to access the admin dashboard</p>
                </div>

                {/* Login Form */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                {error}
                            </div>
                        )}

                        {/* Role Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Login As (for Password authentication)
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { value: 'super_admin', label: 'Super Admin', icon: '🛡️' },
                                    { value: 'admin', label: 'Admin', icon: '🔑' },
                                    { value: 'tutor', label: 'Tutor', icon: '🎓' },
                                ].map((r) => (
                                    <button
                                        key={r.value}
                                        type="button"
                                        onClick={() => setRole(r.value)}
                                        disabled={loading}
                                        className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all ${
                                            role === r.value
                                                ? 'border-primary bg-primary/5 text-primary shadow-sm'
                                                : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
                                        }`}
                                    >
                                        <span className="text-lg">{r.icon}</span>
                                        <span className="text-xs font-medium">{r.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

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
                                placeholder="admin@example.com"
                                required
                                disabled={loading}
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                    placeholder="••••••••"
                                    required
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

                        <div className="flex justify-end">
                            <Link
                                href="/admin/forgot-password"
                                className="text-sm text-primary hover:underline"
                            >
                                Forgot password?
                            </Link>
                        </div>

                        <Button
                            type="submit"
                            className="w-full py-3"
                            disabled={loading}
                        >
                            {loading && !callbackRunning ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                'Sign In'
                            )}
                        </Button>

                        {/* Divider */}
                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">Or continue with</span>
                            </div>
                        </div>

                        {/* Google Login Button */}
                        <button
                            type="button"
                            onClick={handleGoogleLogin}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white hover:bg-gray-50 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-white font-medium shadow-sm transition-all focus:ring-2 focus:ring-primary focus:border-transparent"
                        >
                            {loading && callbackRunning ? (
                                <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                            ) : (
                                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                </svg>
                            )}
                            <span>{loading && callbackRunning ? 'Verifying admin account...' : 'Sign in with Google'}</span>
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
                    This is a secure admin-only area.
                </p>
            </div>
        </div>
    )
}
