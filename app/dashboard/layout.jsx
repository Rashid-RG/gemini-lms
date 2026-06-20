"use client"
import React, { useState, useEffect } from 'react'
import SideBar from './_components/SideBar'
import DashboardHeader from './_components/DashboardHeader'
import { CourseCountContext } from '../_context/CourseCountContext'
import AnnouncementBanner from '@/components/AnnouncementBanner'
import { Menu, X } from 'lucide-react'
import BottomNav from './_components/BottomNav'
import { useUser, useClerk } from '@clerk/nextjs'

function DashboardLayout({children}) {
    const { user, isLoaded } = useUser();
    const { signOut } = useClerk();
    const [totalCourse,setTotalCourse]=useState(0);
    const [userCredits, setUserCredits] = useState(5); // Default 5 credits
    const [isMember, setIsMember] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    const userEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase();
    const adminEmails = React.useMemo(() => 
        (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
            .split(',')
            .map(e => e.trim().toLowerCase())
            .filter(Boolean), 
        []
    );
    const isRestrictedAdmin = isLoaded && userEmail && (adminEmails.includes(userEmail) || userEmail === 'admin@demo.com');

    useEffect(() => {
        const saved = localStorage.getItem('sidebarCollapsed');
        if (saved !== null) {
            setIsSidebarCollapsed(saved === 'true');
        }
    }, []);

    if (isRestrictedAdmin) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                backgroundColor: '#f8fafc',
                fontFamily: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                padding: '20px'
            }}>
                <div style={{
                    maxWidth: '480px',
                    width: '100%',
                    backgroundColor: '#ffffff',
                    borderRadius: '16px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                    border: '1px solid #f1f5f9',
                    padding: '40px 32px',
                    textAlign: 'center'
                }}>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '64px',
                        height: '64px',
                        backgroundColor: '#fee2e2',
                        borderRadius: '50%',
                        color: '#ef4444',
                        fontSize: '28px',
                        marginBottom: '24px'
                    }}>
                        🔒
                    </div>
                    <h1 style={{
                        fontSize: '22px',
                        fontWeight: '700',
                        color: '#0f172a',
                        margin: '0 0 12px 0',
                        letterSpacing: '-0.5px'
                    }}>
                        Admin Account Detected
                    </h1>
                    <p style={{
                        fontSize: '14px',
                        color: '#64748b',
                        lineHeight: '1.6',
                        margin: '0 0 32px 0'
                    }}>
                        The email address <strong>{userEmail}</strong> is configured as an Administrator or Superadmin. To preserve database consistency, admin accounts are restricted from logging in as standard students.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <a href="/admin/login" style={{
                            display: 'block',
                            padding: '14px 24px',
                            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                            color: '#ffffff',
                            textDecoration: 'none',
                            fontWeight: '600',
                            fontSize: '14px',
                            borderRadius: '10px',
                            boxShadow: '0 4px 12px rgba(79, 70, 229, 0.15)'
                        }}>
                            Go to Admin Portal
                        </a>
                        <button 
                            onClick={() => signOut(() => window.location.href = '/sign-in')}
                            style={{
                                padding: '14px 24px',
                                backgroundColor: '#f1f5f9',
                                color: '#475569',
                                border: '1px solid #e2e8f0',
                                fontWeight: '600',
                                fontSize: '14px',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            Sign Out / Switch Account
                        </button>
                    </div>
                </div>
            </div>
        )
    }
    
  return (
    <CourseCountContext.Provider value={{
        totalCourse, setTotalCourse, 
        userCredits, setUserCredits,
        isMember, setIsMember
    }}>
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 transition-colors duration-300">
        {/* Mobile Sidebar Overlay with backdrop-blur */}
        {mobileMenuOpen && (
            <div 
                className='md:hidden fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-40 transition-opacity duration-300'
                onClick={() => setMobileMenuOpen(false)}
            />
        )}

        {/* Sidebar - Desktop fixed, Mobile slide-in */}
        <div className={`
            fixed top-0 bottom-0 left-0 z-50 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 w-64
            transition-transform duration-300 ease-in-out
            ${mobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
            ${isSidebarCollapsed ? 'md:-translate-x-full' : 'md:translate-x-0'}
        `}>
            <SideBar 
                onNavigate={() => setMobileMenuOpen(false)} 
                onCollapseToggle={() => {
                    const next = !isSidebarCollapsed;
                    setIsSidebarCollapsed(next);
                    localStorage.setItem('sidebarCollapsed', String(next));
                }}
            />
        </div>

        {/* Main Content Pane */}
        <div className={`
            flex flex-col min-h-screen transition-all duration-300 ease-in-out
            ${isSidebarCollapsed ? 'md:ml-0' : 'md:ml-64'}
        `}>
            <DashboardHeader 
                onMenuClick={() => {
                    if (typeof window !== 'undefined' && window.innerWidth < 768) {
                        setMobileMenuOpen(true);
                    } else {
                        const next = !isSidebarCollapsed;
                        setIsSidebarCollapsed(next);
                        localStorage.setItem('sidebarCollapsed', String(next));
                    }
                }} 
                isSidebarCollapsed={isSidebarCollapsed}
            />
            <main className='flex-1 p-4 md:p-8 pt-6 pb-20 md:pb-8'>
                <AnnouncementBanner />
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {children}
                </div>
            </main>
        </div>
        
        {/* Mobile Bottom Navigation */}
        <BottomNav />
    </div>
     </CourseCountContext.Provider>
  )
}

export default DashboardLayout