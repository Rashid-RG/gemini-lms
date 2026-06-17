"use client"
import React, { useState, useEffect } from 'react'
import SideBar from './_components/SideBar'
import DashboardHeader from './_components/DashboardHeader'
import { CourseCountContext } from '../_context/CourseCountContext'
import AnnouncementBanner from '@/components/AnnouncementBanner'
import { Menu, X } from 'lucide-react'

function DashboardLayout({children}) {
    const [totalCourse,setTotalCourse]=useState(0);
    const [userCredits, setUserCredits] = useState(5); // Default 5 credits
    const [isMember, setIsMember] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('sidebarCollapsed');
        if (saved !== null) {
            setIsSidebarCollapsed(saved === 'true');
        }
    }, []);
    
  return (
    <CourseCountContext.Provider value={{
        totalCourse, setTotalCourse, 
        userCredits, setUserCredits,
        isMember, setIsMember
    }}>
    <div className="min-h-screen bg-slate-50/50">
        {/* Mobile Sidebar Overlay with backdrop-blur */}
        {mobileMenuOpen && (
            <div 
                className='md:hidden fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-40 transition-opacity duration-300'
                onClick={() => setMobileMenuOpen(false)}
            />
        )}

        {/* Sidebar - Desktop fixed, Mobile slide-in */}
        <div className={`
            fixed top-0 bottom-0 left-0 z-50 bg-white border-r border-slate-100 w-64
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
            <main className='flex-1 p-4 md:p-8 pt-6'>
                <AnnouncementBanner />
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {children}
                </div>
            </main>
        </div>
    </div>
     </CourseCountContext.Provider>
  )
}

export default DashboardLayout