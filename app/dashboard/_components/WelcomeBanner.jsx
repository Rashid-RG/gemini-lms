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

      <div className='w-full rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-indigo-900 p-6 text-white shadow-xl relative overflow-hidden border border-slate-800 hover:shadow-indigo-950/20 transition-all duration-300'>
        {/* Decorative ambient glowing backdrop blurs */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className='relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:gap-8'>
        <div className="bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-md self-center md:self-auto shrink-0 shadow-inner">
            <Image src={'/laptop.png'} alt='laptop' width={80} height={80} className='mx-auto' />
        </div>
        <div className='flex-1 text-center md:text-left space-y-2'>
            <h2 className='text-2xl font-black tracking-tight sm:text-3xl bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent'>
                Hello, {user?.fullName}
            </h2>
            <p className='text-sm text-indigo-200/90 font-medium max-w-lg'>
                Welcome back! Ready to continue your learning journey and explore new courses?
            </p>
            {studentIdentifier && (
                <div className='mt-2 inline-flex rounded-2xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-2.5 backdrop-blur-md shadow-inner text-left'>
                    <div>
                        <p className='text-[10px] font-bold uppercase tracking-widest text-indigo-300'>Student Identifier</p>
                        <p className='break-all text-sm font-black text-white font-mono mt-0.5'>{studentIdentifier}</p>
                    </div>
                </div>
            )}
        </div>
        
        {!loading && (
            <div className='flex shrink-0 justify-center md:justify-end'>
                {isPending && (
                    <div className='px-4 py-3 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 text-center md:text-left shadow-lg'>
                        <p className='text-xs font-bold text-indigo-300'>📋 Tutor Request Pending</p>
                        <p className='text-[11px] text-slate-400 mt-0.5'>Admins are currently reviewing your request</p>
                    </div>
                )}
                {shouldShowButton && (
                    <Button
                        onClick={() => setShowTutorModal(true)}
                        className='bg-white hover:bg-slate-50 text-indigo-950 font-bold border border-slate-100 shadow-md flex items-center gap-2 rounded-2xl py-5 px-5 hover:scale-[1.02] active:scale-95 transition-all duration-200'
                    >
                        <BookOpen className='w-4.5 h-4.5 text-indigo-600' />
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