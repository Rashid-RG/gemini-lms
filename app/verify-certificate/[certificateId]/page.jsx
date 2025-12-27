"use client"
import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import axios from 'axios'
import { CheckCircle, XCircle, Award, Calendar, Trophy, Loader } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

function VerifyCertificatePage() {
    const { certificateId } = useParams()
    const [certificate, setCertificate] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        if (certificateId) {
            verifyCertificate()
        }
    }, [certificateId])

    const verifyCertificate = async () => {
        try {
            setLoading(true)
            const res = await axios.get(`/api/verify-certificate?certificateId=${certificateId}`)
            setCertificate(res.data.result)
        } catch (error) {
            console.error('Verification error:', error)
            setError(error.response?.data?.error || 'Certificate not found')
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className='flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-50'>
                <div className='text-center'>
                    <Loader className='w-12 h-12 text-blue-600 animate-spin mx-auto mb-4' />
                    <p className='text-slate-600'>Verifying certificate...</p>
                </div>
            </div>
        )
    }

    if (error || !certificate) {
        return (
            <div className='flex items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-orange-50 p-4'>
                <div className='max-w-md text-center bg-white rounded-2xl shadow-xl p-8'>
                    <XCircle className='w-20 h-20 text-red-500 mx-auto mb-4' />
                    <h2 className='text-2xl font-bold text-slate-800 mb-2'>Verification Failed</h2>
                    <p className='text-slate-600 mb-6'>
                        {error || 'This certificate could not be verified. It may be invalid or expired.'}
                    </p>
                    <p className='text-sm text-slate-500 mb-4'>
                        Certificate ID: <span className='font-mono font-semibold'>{certificateId}</span>
                    </p>
                    <Link href='/dashboard'>
                        <Button>Go to Dashboard</Button>
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className='min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 p-4 md:p-8'>
            <div className='max-w-4xl mx-auto'>
                {/* Verification Success Banner */}
                <div className='bg-white rounded-2xl shadow-2xl overflow-hidden mb-6'>
                    <div className='bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-center'>
                        <CheckCircle className='w-16 h-16 text-white mx-auto mb-3' />
                        <h1 className='text-3xl font-bold text-white mb-2'>Certificate Verified ✓</h1>
                        <p className='text-green-50'>This is an authentic certificate issued by Gemini LMS</p>
                    </div>

                    {/* Certificate Details */}
                    <div className='p-8 md:p-12'>
                        <div className='grid md:grid-cols-2 gap-6 mb-8'>
                            <div className='bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border-2 border-blue-200'>
                                <div className='flex items-center gap-3 mb-3'>
                                    <Award className='w-6 h-6 text-blue-600' />
                                    <h3 className='font-semibold text-slate-800'>Certificate Holder</h3>
                                </div>
                                <p className='text-2xl font-bold text-blue-600'>{certificate.studentName}</p>
                                <p className='text-sm text-slate-600 mt-1'>{certificate.studentEmail}</p>
                            </div>

                            <div className='bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border-2 border-purple-200'>
                                <div className='flex items-center gap-3 mb-3'>
                                    <Trophy className='w-6 h-6 text-purple-600' />
                                    <h3 className='font-semibold text-slate-800'>Course Completed</h3>
                                </div>
                                <p className='text-xl font-bold text-purple-600'>{certificate.courseName}</p>
                                <p className='text-sm text-slate-600 mt-1'>Final Score: {certificate.finalScore}%</p>
                            </div>
                        </div>

                        <div className='grid md:grid-cols-3 gap-4 mb-8'>
                            <div className='bg-slate-50 rounded-lg p-4 text-center'>
                                <Calendar className='w-5 h-5 text-slate-600 mx-auto mb-2' />
                                <p className='text-xs text-slate-600 mb-1'>Issue Date</p>
                                <p className='font-semibold text-slate-800'>
                                    {new Date(certificate.issueDate).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric'
                                    })}
                                </p>
                            </div>

                            <div className='bg-slate-50 rounded-lg p-4 text-center'>
                                <CheckCircle className='w-5 h-5 text-green-600 mx-auto mb-2' />
                                <p className='text-xs text-slate-600 mb-1'>Status</p>
                                <p className='font-semibold text-green-600'>Verified</p>
                            </div>

                            <div className='bg-slate-50 rounded-lg p-4 text-center'>
                                <Award className='w-5 h-5 text-blue-600 mx-auto mb-2' />
                                <p className='text-xs text-slate-600 mb-1'>Certificate ID</p>
                                <p className='font-mono font-semibold text-blue-600 text-sm'>
                                    {certificate.certificateId}
                                </p>
                            </div>
                        </div>

                        {/* Verification Info */}
                        <div className='bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl p-6 border border-slate-200'>
                            <h4 className='font-semibold text-slate-800 mb-3 flex items-center gap-2'>
                                <CheckCircle className='w-5 h-5 text-green-600' />
                                Verification Details
                            </h4>
                            <div className='space-y-2 text-sm text-slate-600'>
                                <p>✓ Certificate is authentic and has been issued by Gemini LMS</p>
                                <p>✓ Student identity verified</p>
                                <p>✓ Course completion confirmed</p>
                                <p>✓ No signs of tampering detected</p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className='flex flex-col sm:flex-row gap-4 justify-center mt-8'>
                            <Link href={`/course/${certificate.courseId}/certificate`}>
                                <Button className='bg-blue-600 hover:bg-blue-700'>
                                    View Full Certificate
                                </Button>
                            </Link>
                            <Link href='/dashboard'>
                                <Button variant='outline'>
                                    Go to Dashboard
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Footer Note */}
                <div className='text-center text-sm text-slate-600 bg-white rounded-lg p-4 shadow'>
                    <p>This certificate was verified on {new Date().toLocaleString()}</p>
                    <p className='mt-1'>© {new Date().getFullYear()} Gemini LMS. All rights reserved.</p>
                </div>
            </div>
        </div>
    )
}

export default VerifyCertificatePage
