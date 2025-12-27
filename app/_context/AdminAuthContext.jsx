"use client"
import React, { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'
import { useRouter, usePathname } from 'next/navigation'

const AdminAuthContext = createContext(null)

export function AdminAuthProvider({ children }) {
    const [admin, setAdmin] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const router = useRouter()
    const pathname = usePathname()

    // Check session on mount and route changes
    useEffect(() => {
        checkSession()
    }, [pathname])

    const checkSession = async () => {
        try {
            const response = await axios.get('/api/admin/auth/verify')
            if (response.data.authenticated) {
                setAdmin(response.data.admin)
            } else {
                setAdmin(null)
            }
        } catch (error) {
            setAdmin(null)
        } finally {
            setLoading(false)
        }
    }

    const login = async (email, password) => {
        try {
            setError(null)
            const response = await axios.post('/api/admin/auth/login', { email, password })
            if (response.data.success) {
                setAdmin(response.data.admin)
                return { success: true }
            }
            return { success: false, error: 'Login failed' }
        } catch (error) {
            const message = error.response?.data?.error || 'Login failed'
            setError(message)
            return { success: false, error: message }
        }
    }

    const logout = async () => {
        try {
            await axios.post('/api/admin/auth/logout')
        } catch (error) {
            console.error('Logout error:', error)
        } finally {
            setAdmin(null)
            router.push('/admin/login')
        }
    }

    const value = {
        admin,
        loading,
        error,
        isAuthenticated: !!admin,
        isSuperAdmin: admin?.role === 'super_admin',
        login,
        logout,
        refreshSession: checkSession
    }

    return (
        <AdminAuthContext.Provider value={value}>
            {children}
        </AdminAuthContext.Provider>
    )
}

export function useAdminAuth() {
    const context = useContext(AdminAuthContext)
    if (!context) {
        throw new Error('useAdminAuth must be used within an AdminAuthProvider')
    }
    return context
}

// HOC for protecting admin pages
export function withAdminAuth(Component) {
    return function ProtectedComponent(props) {
        const { isAuthenticated, loading } = useAdminAuth()
        const router = useRouter()

        useEffect(() => {
            if (!loading && !isAuthenticated) {
                router.push('/admin/login')
            }
        }, [loading, isAuthenticated, router])

        if (loading) {
            return (
                <div className="min-h-screen flex items-center justify-center">
                    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
            )
        }

        if (!isAuthenticated) {
            return null
        }

        return <Component {...props} />
    }
}
