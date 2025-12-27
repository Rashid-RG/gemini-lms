"use client"
import React, { useState } from 'react'
import SideBar from './_components/SideBar'
import DashboardHeader from './_components/DashboardHeader'
import { CourseCountContext } from '../_context/CourseCountContext'
import AnnouncementBanner from '@/components/AnnouncementBanner'

function DashboardLayout({children}) {
    const [totalCourse,setTotalCourse]=useState(0);
    const [userCredits, setUserCredits] = useState(5); // Default 5 credits
    const [isMember, setIsMember] = useState(false);
    
  return (
    <CourseCountContext.Provider value={{
        totalCourse, setTotalCourse, 
        userCredits, setUserCredits,
        isMember, setIsMember
    }}>
    <div>
        <div className='md:w-64 hidden md:block fixed'>
            <SideBar/>
        </div>
        <div className='md:ml-64'>
            <DashboardHeader/>
            <div className='p-10'>
                <AnnouncementBanner />
                {children}
            </div>
        </div>
        </div>
     </CourseCountContext.Provider>
  )
}

export default DashboardLayout