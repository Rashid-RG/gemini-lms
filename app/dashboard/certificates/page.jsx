"use client"
import React, { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import axios from 'axios'
import { Award, Calendar, Trophy, ExternalLink, Loader } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

function CertificatesPage() {
    const { user } = useUser()
    const [certificates, setCertificates] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (user) {
            fetchCertificates()
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user])

    const fetchCertificates = async () => {
        try {
            setLoading(true)
            const res = await axios.get(
                `/api/certificates?studentEmail=${user?.primaryEmailAddress?.emailAddress}`
            )
            setCertificates(res.data.result || [])
        } catch (error) {
            console.error('Error fetching certificates:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className='p-10'>
                <h2 className='text-3xl font-bold mb-2'>My Certificates</h2>
                <p className='text-slate-600 mb-8'>View and download your earned certificates</p>
                <div className='flex items-center justify-center min-h-[400px]'>
                    <Loader className='w-12 h-12 text-blue-600 animate-spin' />
                </div>
            </div>
        )
    }

    return (
        <div className='p-10'>
            <div className='mb-8'>
                <h2 className='text-3xl font-bold mb-2'>My Certificates</h2>
                <p className='text-slate-600'>View and download your earned certificates</p>
            </div>

            {certificates.length === 0 ? (
                <div className='flex flex-col items-center justify-center min-h-[400px] bg-slate-50 rounded-xl border-2 border-dashed border-slate-300'>
                    <Trophy className='w-20 h-20 text-slate-300 mb-4' />
                    <h3 className='text-xl font-semibold text-slate-700 mb-2'>No Certificates Yet</h3>
                    <p className='text-slate-500 mb-6 text-center max-w-md'>
                        Complete courses to earn certificates. Finish all chapters, quizzes, and assignments to unlock your certificate.
                    </p>
                    <div className='flex gap-3'>
                        <Link href='/dashboard'>
                            <Button>Browse My Courses</Button>
                        </Link>
                        <Link href='/dashboard/explore'>
                            <Button variant='outline'>Explore Courses</Button>
                        </Link>
                    </div>
                </div>
            ) : (
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                    {certificates.map((cert, index) => (
                        <div 
                            key={cert.id}
                            className='bg-white rounded-xl shadow-md hover:shadow-xl transition-all border-2 border-slate-100 overflow-hidden'
                        >
                            {/* Certificate Header */}
                            <div className='bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white'>
                                <div className='flex items-center justify-between mb-3'>
                                    <Award className='w-10 h-10' />
                                    <span className='text-xs bg-white/20 px-3 py-1 rounded-full'>
                                        Verified
                                    </span>
                                </div>
                                <h3 className='font-bold text-lg line-clamp-2'>
                                    {cert.courseName}
                                </h3>
                            </div>

                            {/* Certificate Body */}
                            <div className='p-6'>
                                <div className='space-y-3 mb-6'>
                                    <div className='flex items-center gap-2 text-sm text-slate-600'>
                                        <Calendar className='w-4 h-4' />
                                        <span>
                                            {new Date(cert.completedAt).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </span>
                                    </div>
                                    <div className='flex items-center gap-2 text-sm text-slate-600'>
                                        <Trophy className='w-4 h-4' />
                                        <span>Final Score: <strong className='text-green-600'>{cert.finalScore}%</strong></span>
                                    </div>
                                </div>

                                <div className='bg-slate-50 rounded-lg p-3 mb-4'>
                                    <p className='text-xs text-slate-500 mb-1'>Certificate ID</p>
                                    <p className='font-mono text-sm font-semibold text-slate-800'>
                                        {cert.certificateId}
                                    </p>
                                </div>

                                {/* Actions */}
                                <div className='flex gap-2'>
                                    <Link href={`/course/${cert.courseId}/certificate`} className='flex-1'>
                                        <Button className='w-full' size='sm'>
                                            <ExternalLink className='w-4 h-4 mr-2' />
                                            View
                                        </Button>
                                    </Link>
                                    <Link href={`/verify-certificate/${cert.certificateId}`} target='_blank'>
                                        <Button variant='outline' size='sm'>
                                            Verify
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default CertificatesPage
