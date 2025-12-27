import React from 'react'
import DashboardHeader from '../dashboard/_components/DashboardHeader'

function CourseViewLayout({children}) {
  return (
    <div>
           <DashboardHeader/>
        <div className='w-full px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 mt-10 max-w-screen-2xl mx-auto'>
            {children}
        </div>
    </div>
  )
}

export default CourseViewLayout