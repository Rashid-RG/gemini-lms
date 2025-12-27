"use client"
import React, { useState } from 'react'
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
    
  return (
    <CourseCountContext.Provider value={{
        totalCourse, setTotalCourse, 
        userCredits, setUserCredits,
        isMember, setIsMember
    }}>
    <div>
        {/* Mobile Menu Button */}
        <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className='md:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md'
        >
            {mobileMenuOpen ? <X className='w-6 h-6' /> : <Menu className='w-6 h-6' />}
        </button>

        {/* Mobile Sidebar Overlay */}
        {mobileMenuOpen && (
            <div 
                className='md:hidden fixed inset-0 bg-black/50 z-40'
                onClick={() => setMobileMenuOpen(false)}
            />
        )}

        {/* Sidebar - Desktop fixed, Mobile slide-in */}
        <div className={`
            md:w-64 md:block fixed z-50 bg-white
            ${mobileMenuOpen ? 'block w-64' : 'hidden'}
            transition-transform duration-300
        `}>
            <SideBar onNavigate={() => setMobileMenuOpen(false)} />
        </div>

        <div className='md:ml-64'>
            <DashboardHeader/>
            <div className='p-4 md:p-10 pt-16 md:pt-4'>
                <AnnouncementBanner />
                {children}
            </div>
        </div>
        </div>
     </CourseCountContext.Provider>
  )
}

export default DashboardLayout