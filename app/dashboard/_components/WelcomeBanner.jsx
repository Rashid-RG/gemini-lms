"use client"
import { useUser } from '@clerk/nextjs'
import Image from 'next/image'
import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { BookOpen } from 'lucide-react'
import BecomeTutorModal from '@/components/BecomeTutorModal'
import TutorApprovalCard from '@/components/TutorApprovalCard'
import axios from 'axios'

function WelcomeBanner({ studentIdentifier }) {
    const { user } = useUser()
    const [showTutorModal, setShowTutorModal] = useState(false)
    const [tutorStatus, setTutorStatus] = useState(null)
    const [loading, setLoading] = useState(true)
    const studentEmail = user?.primaryEmailAddress?.emailAddress

    useEffect(() => {
        if (!studentEmail) {
            setLoading(false)
            return
        }
        
        const checkTutorStatus = async () => {
            try {
                const response = await axios.get(`/api/user/tutor-request?email=${studentEmail}`)
                setTutorStatus(response.data.result?.status || null)
            } catch (error) {
                console.log('Not a tutor applicant')
            } finally {
                setLoading(false)
            }
        }

        checkTutorStatus()
    }, [studentEmail])

    const shouldShowButton = tutorStatus === null
    const isPending = tutorStatus === 'pending'
    const isApproved = tutorStatus === 'approved'

  return (
    <>
      {isApproved && (
        <div className='mb-6'>
          <TutorApprovalCard tutorEmail={studentEmail} />
        </div>
      )}

      <div className='w-full rounded-lg bg-blue-500 p-5 text-white sm:p-6'>
        <div className='flex flex-col gap-5 md:flex-row md:items-center md:gap-6'>
        <Image src={'/laptop.png'} alt='laptop' width={100} height={100} className='mx-auto md:mx-0' />
        <div className='flex-1 text-center md:text-left'>
            <h2 className='text-2xl font-bold sm:text-3xl'>Hello, {user?.fullName}</h2>
            <p className=''>Welcome Back, Its time to get back and start learning new course</p>
            {studentIdentifier && (
                <div className='mt-4 flex w-full items-center justify-center rounded-xl border border-white/20 bg-white/15 px-4 py-3 md:inline-flex md:w-auto md:justify-start'>
                    <div>
                        <p className='text-[11px] uppercase tracking-[0.18em] text-blue-100'>Student ID</p>
                        <p className='break-all text-base font-bold text-white sm:text-lg'>{studentIdentifier}</p>
                    </div>
                </div>
            )}
        </div>
        
        {!loading && (
            <div className='flex shrink-0 justify-center md:justify-end'>
                {isPending && (
                    <div className='px-4 py-2 bg-white/20 rounded-lg border border-white/30'>
                        <p className='text-sm font-medium'>📋 Tutor Request Pending</p>
                        <p className='text-xs opacity-90'>Admins will review soon</p>
                    </div>
                )}
                {shouldShowButton && (
                    <Button
                        onClick={() => setShowTutorModal(true)}
                        className='bg-white text-blue-600 hover:bg-white/90 font-semibold flex items-center gap-2'
                    >
                        <BookOpen className='w-4 h-4' />
                        Become a Tutor
                    </Button>
                )}
            </div>
        )}
        </div>

        <BecomeTutorModal
            isOpen={showTutorModal}
            onClose={() => setShowTutorModal(false)}
            userEmail={studentEmail}
            userName={user?.fullName}
            onSuccess={() => {
                setTutorStatus('pending')
                setShowTutorModal(false)
            }}
        />
    </div>
    </>
  )
}

export default WelcomeBanner