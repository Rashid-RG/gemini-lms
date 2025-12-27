"use client"
import React, { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { AdminAuthProvider, useAdminAuth } from '@/app/_context/AdminAuthContext'
import Link from 'next/link'
import { 
    LayoutDashboard, 
    Users, 
    FileText, 
    CreditCard, 
    MessageSquare, 
    LogOut, 
    Shield,
    ChevronRight,
    Loader2,
    Settings,
    Key,
    CheckSquare,
    BookOpen,
    Megaphone,
    BarChart3,
    Mail,
    History,
    DollarSign,
    Menu,
    X
} from 'lucide-react'

function AdminLayoutContent({ children }) {
    const { admin, loading, isAuthenticated, logout } = useAdminAuth()
    const router = useRouter()
    const pathname = usePathname()
    const [sidebarOpen, setSidebarOpen] = useState(false)

    // Public admin routes that don't require auth
    const publicRoutes = ['/admin/login', '/admin/setup']
    const isPublicRoute = publicRoutes.includes(pathname)

    // Close sidebar when route changes (mobile)
    useEffect(() => {
        setSidebarOpen(false)
    }, [pathname])

    useEffect(() => {
        if (!loading && !isAuthenticated && !isPublicRoute) {
            router.push('/admin/login')
        }
    }, [loading, isAuthenticated, isPublicRoute, router])

    // Show loading for protected routes
    if (loading && !isPublicRoute) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    // Render public routes without layout
    if (isPublicRoute) {
        return children
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
        return null
    }

    const navItems = [
        { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
        { href: '/admin/payments', label: 'Payments', icon: DollarSign },
        { href: '/admin/announcements', label: 'Announcements', icon: Megaphone },
        { href: '/admin/users', label: 'Users', icon: Users },
        { href: '/admin/courses', label: 'Courses', icon: BookOpen },
        { href: '/admin/email-students', label: 'Email Students', icon: Mail },
        { href: '/admin/credits', label: 'Credits', icon: CreditCard },
        { href: '/admin/all-submissions', label: 'Submissions', icon: FileText },
        { href: '/admin/review-requests', label: 'Reviews', icon: CheckSquare },
        { href: '/admin/assignment-unlocks', label: 'Unlock Requests', icon: Key },
        { href: '/admin/support', label: 'Support Tickets', icon: MessageSquare },
        { href: '/admin/activity-log', label: 'Activity Log', icon: History },
    ]

    // Super admin only items
    if (admin?.role === 'super_admin') {
        navItems.push({ href: '/admin/settings', label: 'Settings', icon: Settings })
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`fixed left-0 top-0 h-full w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-50 flex flex-col transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
                sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}>
                {/* Logo */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Shield className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <h1 className="font-bold text-gray-900 dark:text-white">Admin Panel</h1>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{admin?.role}</p>
                            </div>
                        </div>
                        {/* Close button for mobile */}
                        <button 
                            onClick={() => setSidebarOpen(false)}
                            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                            <X className="h-5 w-5 text-gray-500" />
                        </button>
                    </div>
                </div>

                {/* Navigation - scrollable */}
                <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                                    isActive
                                        ? 'bg-primary text-white'
                                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                            >
                                <item.icon className="h-5 w-5 flex-shrink-0" />
                                <span className="truncate">{item.label}</span>
                            </Link>
                        )
                    })}
                </nav>

                {/* User Info & Logout - fixed at bottom */}
                <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <div className="mb-3 px-4">
                        <p className="font-medium text-gray-900 dark:text-white truncate">{admin?.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{admin?.email}</p>
                    </div>
                    <button
                        onClick={logout}
                        className="flex items-center gap-3 w-full px-4 py-3 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                    >
                        <LogOut className="h-5 w-5" />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="lg:ml-64 min-h-screen">
                {/* Header with mobile menu button */}
                <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4">
                    <div className="flex items-center gap-4">
                        {/* Mobile menu button */}
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                            <Menu className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                        </button>
                        
                        {/* Breadcrumb */}
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                            <Link href="/admin/dashboard" className="hover:text-primary">Admin</Link>
                            {pathname !== '/admin/dashboard' && (
                                <>
                                    <ChevronRight className="h-4 w-4 mx-2" />
                                    <span className="text-gray-900 dark:text-white capitalize truncate">
                                        {pathname.split('/').pop()?.replace(/-/g, ' ')}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Page Content */}
                <div className="p-4 sm:p-6">
                    {children}
                </div>
            </main>
        </div>
    )
}

export default function AdminLayout({ children }) {
    return (
        <AdminAuthProvider>
            <AdminLayoutContent>{children}</AdminLayoutContent>
        </AdminAuthProvider>
    )
}
