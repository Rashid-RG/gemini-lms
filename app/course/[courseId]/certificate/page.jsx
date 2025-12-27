"use client"
// snyk:skip=javascript/DOMXSS - Certificate data from trusted backend database
import React, { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Award, Download, Share2, CheckCircle, Calendar, Trophy, Loader, FileDown } from 'lucide-react'
import { toast } from 'sonner'
import QRCode from 'qrcode'

function CertificatePage() {
    const router = useRouter();
    const { courseId } = useParams()
    const { user } = useUser()
    const [certificate, setCertificate] = useState(null)
    const [course, setCourse] = useState(null)
    const [loading, setLoading] = useState(true)
    const [downloading, setDownloading] = useState(false)
    const certificateRef = useRef(null)

    useEffect(() => {
        if (user && courseId) {
            fetchCertificate()
        }
    }, [user, courseId])

    const fetchCertificate = async () => {
        try {
            setLoading(true)
            
            // First try to get existing certificate
            const res = await axios.get(
                `/api/generate-certificate?courseId=${courseId}&studentEmail=${user?.primaryEmailAddress?.emailAddress}`
            )
            setCertificate(res.data.result)
            
            // Fetch course details
            const courseRes = await axios.get(`/api/courses?courseId=${courseId}`)
            setCourse(courseRes.data.result)
        } catch (getError) {
            console.log('Get certificate error:', getError.response?.status, getError.response?.data)
            
            // If 404, certificate doesn't exist yet - try to auto-generate
            if (getError.response?.status === 404) {
                // Try to fetch course details anyway
                try {
                    const courseRes = await axios.get(`/api/courses?courseId=${courseId}`)
                    setCourse(courseRes.data.result)
                } catch (e) {
                    console.error('Error fetching course:', e)
                }
                
                // Auto-generate certificate
                await generateCertificate()
            } else {
                const errorMsg = getError.response?.data?.error || 'Failed to fetch certificate'
                toast.error('Error', { description: errorMsg })
            }
        } finally {
            setLoading(false)
        }
    }

    const generateCertificate = async () => {
        try {
            setLoading(true)
            console.log('Auto-generating certificate for:', courseId, user?.primaryEmailAddress?.emailAddress)
            
            const generateRes = await axios.post('/api/generate-certificate', {
                courseId,
                studentEmail: user?.primaryEmailAddress?.emailAddress,
                studentName: user?.fullName || user?.firstName || 'Student'
            })
            
            console.log('Generate response:', generateRes.data)
            setCertificate(generateRes.data.result)
            
            if (!generateRes.data.alreadyExists) {
                toast.success('🎉 Certificate Generated!', {
                    description: 'Congratulations on completing the course!',
                    position: 'top-center'
                })
            }
        } catch (error) {
            console.error('Error generating certificate:', error.response?.data || error)
            const errorMsg = error.response?.data?.error || 'Complete all course requirements to earn your certificate.'
            toast.error('Certificate Not Available', {
                description: errorMsg,
                position: 'top-center'
            })
        } finally {
            setLoading(false)
        }
    }

    const generateCanvasImage = async () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        
        canvas.width = 1200
        canvas.height = 900
        
        // Background gradient
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
        gradient.addColorStop(0, '#4F46E5')
        gradient.addColorStop(1, '#7C3AED')
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        
        // White certificate area
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(50, 50, canvas.width - 100, canvas.height - 100)
        
        // Border
        ctx.strokeStyle = '#D97706'
        ctx.lineWidth = 8
        ctx.strokeRect(70, 70, canvas.width - 140, canvas.height - 140)
        
        // Inner border
        ctx.strokeStyle = '#4F46E5'
        ctx.lineWidth = 2
        ctx.strokeRect(80, 80, canvas.width - 160, canvas.height - 160)
        
        // Logo area (top left) - GEMINI LMS with text
        ctx.font = 'bold 28px Arial'
        ctx.fillStyle = '#4F46E5'
        ctx.textAlign = 'left'
        ctx.fillText('GEMINI LMS', 120, 130)
        ctx.font = '14px Arial'
        ctx.fillStyle = '#6B7280'
        ctx.fillText('Official Learning Platform', 120, 150)
        
        // Logo background circle
        ctx.fillStyle = '#E0E7FF'
        ctx.beginPath()
        ctx.arc(100, 115, 18, 0, Math.PI * 2)
        ctx.fill()
        ctx.font = 'bold 20px Arial'
        ctx.fillStyle = '#4F46E5'
        ctx.textAlign = 'center'
        ctx.fillText('G', 100, 122)
        
        // Title
        ctx.fillStyle = '#1F2937'
        ctx.font = 'bold 60px Arial'
        ctx.textAlign = 'center'
        ctx.fillText('CERTIFICATE OF COMPLETION', canvas.width / 2, 220)
        
        // Subtitle
        ctx.font = '28px Arial'
        ctx.fillStyle = '#6B7280'
        ctx.fillText('This is to certify that', canvas.width / 2, 300)
        
        // Student name
        ctx.font = 'bold 48px Arial'
        ctx.fillStyle = '#4F46E5'
        ctx.fillText(certificate.studentName, canvas.width / 2, 380)
        
        // Line under name
        ctx.strokeStyle = '#D97706'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(300, 400)
        ctx.lineTo(900, 400)
        ctx.stroke()
        
        // Description
        ctx.font = '26px Arial'
        ctx.fillStyle = '#6B7280'
        ctx.fillText('has successfully completed the course', canvas.width / 2, 470)
        
        // Course name
        ctx.font = 'bold 36px Arial'
        ctx.fillStyle = '#1F2937'
        const courseName = certificate.courseName.length > 40 
            ? certificate.courseName.substring(0, 40) + '...' 
            : certificate.courseName
        ctx.fillText(courseName, canvas.width / 2, 540)
        
        // Score
        ctx.font = '28px Arial'
        ctx.fillStyle = '#059669'
        ctx.fillText(`Final Score: ${certificate.finalScore}%`, canvas.width / 2, 590)
        
        // Date
        ctx.font = '24px Arial'
        ctx.fillStyle = '#6B7280'
        const date = new Date(certificate.completedAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
        ctx.fillText(`Completed on ${date}`, canvas.width / 2, 650)
        
        // Certificate ID with verification badge
        ctx.font = 'bold 18px Arial'
        ctx.fillStyle = '#059669'
        ctx.fillText('✓ VERIFIED', canvas.width / 2, 700)
        ctx.font = '16px Arial'
        ctx.fillStyle = '#6B7280'
        ctx.fillText(`Certificate ID: ${certificate.certificateId}`, canvas.width / 2, 725)
        
        // Signature section
        ctx.strokeStyle = '#1F2937'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(850, 810)
        ctx.lineTo(1080, 810)
        ctx.stroke()
        
        // Signature name
        ctx.font = 'italic bold 22px Arial'
        ctx.fillStyle = '#4F46E5'
        ctx.textAlign = 'center'
        ctx.fillText('Sajeefa MSF', 965, 800)
        
        ctx.font = '16px Arial'
        ctx.fillStyle = '#6B7280'
        ctx.fillText('Founder, GEMINI LMS', 965, 835)
        
        // Generate QR code
        try {
            const sanitizedCertId = encodeURIComponent(certificate.certificateId)
            const verifyUrl = `${window.location.origin}/verify-certificate/${sanitizedCertId}`
            const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
                errorCorrectionLevel: 'H',
                type: 'image/png',
                quality: 0.95,
                margin: 1,
                width: 200
            })
            
            // Draw QR code on canvas - wait for image to load
            return await new Promise((resolve) => {
                const qrImage = new Image()
                qrImage.onload = () => {
                    ctx.drawImage(qrImage, 85, 740, 90, 90)
                    
                    ctx.font = '12px Arial'
                    ctx.fillStyle = '#9CA3AF'
                    ctx.textAlign = 'center'
                    ctx.fillText('Scan to verify', 130, 835)
                    
                    resolve(canvas)
                }
                qrImage.src = qrDataUrl
            })
        } catch (err) {
            console.error('QR code generation error:', err)
            // Fallback: draw QR placeholder
            ctx.strokeStyle = '#D1D5DB'
            ctx.lineWidth = 2
            ctx.strokeRect(85, 740, 90, 90)
            
            ctx.font = '12px Arial'
            ctx.fillStyle = '#9CA3AF'
            ctx.textAlign = 'center'
            ctx.fillText('Scan to verify', 130, 835)
            
            return canvas
        }
        
        return canvas
    }

    const handleDownloadPNG = async () => {
        try {
            setDownloading(true)
            const canvas = await generateCanvasImage()
            
            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.href = url
                link.download = `Certificate_${certificate.certificateId}.png`
                link.click()
                URL.revokeObjectURL(url)
                setDownloading(false)
                
                toast.success('PNG Downloaded! 📥', {
                    description: 'Your certificate has been saved as PNG.',
                    position: 'top-center'
                })
            })
        } catch (error) {
            setDownloading(false)
            console.error('PNG Download error:', error)
            toast.error('Download Failed', {
                description: 'Failed to download PNG. Please try again.',
                position: 'top-center'
            })
        }
    }

    const handleDownloadPDF = async () => {
        try {
            setDownloading(true)
            const canvas = await generateCanvasImage()
            const imgData = canvas.toDataURL('image/png')
            
            // Dynamically import html2pdf
            const html2pdf = (await import('html2pdf.js')).default
            
            const element = document.createElement('div')
            const img = document.createElement('img')
            img.src = imgData
            img.style.width = '100%'
            img.style.height = '100%'
            element.appendChild(img)
            
            const opt = {
                margin: 0,
                filename: `Certificate_${certificate.certificateId}.pdf`,
                image: { type: 'png', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { orientation: 'landscape', unit: 'mm', format: [297, 210] }
            }
            
            html2pdf().set(opt).from(element).save()
            setDownloading(false)
            
            toast.success('PDF Downloaded! 📥', {
                description: 'Your certificate has been saved as PDF.',
                position: 'top-center'
            })
        } catch (error) {
            setDownloading(false)
            console.error('PDF Download error:', error)
            toast.error('Download Failed', {
                description: 'Failed to download PDF. Please try again.',
                position: 'top-center'
            })
        }
    }

    const handleShare = async () => {
        const shareData = {
            title: 'Course Completion Certificate',
            text: `I've completed ${certificate.courseName} with a score of ${certificate.finalScore}%! 🎉`,
            url: window.location.href
        }

        try {
            if (navigator.share) {
                await navigator.share(shareData)
                toast.success('Shared Successfully! 🎉', {
                    position: 'top-center'
                })
            } else {
                // Fallback: copy to clipboard
                await navigator.clipboard.writeText(
                    `${shareData.text}\nCertificate ID: ${certificate.certificateId}`
                )
                toast.success('Copied to Clipboard! 📋', {
                    description: 'Share link has been copied.',
                    position: 'top-center'
                })
            }
        } catch (error) {
            console.error('Share error:', error)
        }
    }

    if (loading) {
        return (
            <>
                <div className='flex items-center justify-center min-h-screen'>
                    <div className='text-center'>
                        <Loader className='w-12 h-12 text-blue-600 animate-spin mx-auto mb-4' />
                        <p className='text-slate-600'>Loading your certificate...</p>
                    </div>
                </div>
            </>
        )
    }

    if (!certificate) {
        return (
            <>
                <div className='min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4 md:p-8'>
                    <div className='max-w-5xl mx-auto'>
                        <div className='flex flex-col items-center justify-center min-h-[400px] bg-white rounded-xl border-2 border-dashed border-slate-300 p-8'>
                            <Trophy className='w-20 h-20 text-slate-300 mb-4' />
                            <h3 className='text-xl font-semibold text-slate-700 mb-2'>Certificate Not Generated Yet</h3>
                            <p className='text-slate-500 mb-6 text-center max-w-md'>
                                If you have completed <b>all chapters</b> and achieved <b>45%+ average on quizzes</b> and <b>45+ points on each assignment</b>, click the button below to generate your certificate.
                            </p>
                            <div className="flex gap-3">
                                <Button 
                                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                                    onClick={generateCertificate}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <Loader className="w-4 h-4 mr-2 animate-spin" />
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <Award className="w-4 h-4 mr-2" />
                                            Generate Certificate
                                        </>
                                    )}
                                </Button>
                                <Button variant="outline" onClick={() => router.push(`/course/${courseId}`)}>
                                    Go to Course
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </>
        )
    }

    return (
        <>
            <div className="max-w-4xl mx-auto mt-8">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24">
                        <Loader className="w-10 h-10 animate-spin text-blue-600 mb-4" />
                        <div className="text-lg text-gray-500">Loading certificate...</div>
                    </div>
                ) : certificate ? (
                    <>
                    <div 
                        ref={certificateRef}
                        className='bg-white rounded-2xl shadow-2xl p-8 md:p-12 mb-6 border-4 border-gradient-to-r from-blue-500 to-purple-600'
                        style={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            padding: '4px'
                        }}
                    >
                        <div className='bg-white rounded-xl p-8 md:p-12'>
                            {/* GEMINI LMS Header */}
                            <div className='flex items-center justify-between mb-6 pb-4 border-b-2 border-blue-100'>
                                <div className='flex items-center gap-3'>
                                    <div className='w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center'>
                                        <svg fill="none" height="48" viewBox="0 0 48 48" width="48" xmlns="http://www.w3.org/2000/svg" className='w-10 h-10'><rect fill="#444ce7" height="48" rx="12" width="48"/><path d="m10.5 10.5c7.6075 7.0803 19.3925 7.0803 27 0-7.0803 7.6075-7.0803 19.3925 0 27-7.6075-7.0803-19.3925-7.0803-27 0 7.0803-7.6075 7.0803-19.3925 0-27z" fill="#fff" opacity="0.5"/></svg>
                                    </div>
                                    <div>
                                        <h4 className='text-2xl font-bold text-blue-600'>GEMINI LMS</h4>
                                        <p className='text-xs text-slate-500'>Official Learning Platform</p>
                                    </div>
                                </div>
                                <div className='flex items-center gap-2 bg-green-50 px-3 py-1 rounded-full'>
                                    <CheckCircle className='w-5 h-5 text-green-600' />
                                    <span className='text-xs font-semibold text-green-700'>Verified</span>
                                </div>
                            </div>

                            {/* Certificate Content */}
                            <div className='text-center space-y-6'>
                                <div className='border-b-4 border-yellow-500 pb-4 mb-6'>
                                    <h2 className='text-4xl md:text-5xl font-bold text-slate-800 mb-2'>
                                        CERTIFICATE
                                    </h2>
                                    <h3 className='text-2xl font-semibold text-blue-600'>
                                        OF COMPLETION
                                    </h3>
                                </div>

                                <p className='text-lg text-slate-600'>
                                    This is to certify that
                                </p>

                                <h3 className='text-3xl md:text-4xl font-bold text-blue-600 border-b-2 border-yellow-500 pb-2 inline-block'>
                                    {certificate.studentName}
                                </h3>

                                <p className='text-lg text-slate-600'>
                                    has successfully completed the course
                                </p>

                                <h4 className='text-2xl md:text-3xl font-bold text-slate-800 px-4'>
                                    {certificate.courseName}
                                </h4>

                                <div className='flex items-center justify-center gap-8 pt-4'>
                                    <div className='text-center'>
                                        <Trophy className='w-8 h-8 text-yellow-600 mx-auto mb-2' />
                                        <p className='text-sm text-slate-600'>Final Score</p>
                                        <p className='text-2xl font-bold text-green-600'>
                                            {certificate.finalScore}%
                                        </p>
                                    </div>

                                    <div className='text-center'>
                                        <Calendar className='w-8 h-8 text-blue-600 mx-auto mb-2' />
                                        <p className='text-sm text-slate-600'>Completed On</p>
                                        <p className='text-lg font-semibold text-slate-800'>
                                            {new Date(certificate.completedAt).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </p>
                                    </div>
                                </div>

                                <div className='pt-6 border-t-2 border-slate-200 mt-8'>
                                    <p className='text-sm text-slate-500'>
                                        Certificate ID: <span className='font-mono font-semibold'>{certificate.certificateId}</span>
                                    </p>
                                </div>

                                {/* Signature Section */}
                                <div className='pt-8 mt-8 border-t-2 border-slate-200'>
                                    <div className='flex items-center justify-center gap-8'>
                                        <div className='text-center'>
                                            <div className='border-t-2 border-slate-800 w-48 mx-auto mb-2'></div>
                                            <p className='font-bold text-lg text-blue-600 italic'>Sajeefa MSF</p>
                                            <p className='text-sm text-slate-600'>Founder, GEMINI LMS</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Verification URL */}
                                <div className='pt-4 border-t border-slate-200 mt-4'>
                                    <p className='text-xs text-slate-500 mb-1'>Verify this certificate at:</p>
                                    <a 
                                        href={`${window.location.origin}/verify-certificate/${encodeURIComponent(certificate.certificateId)}`}
                                        target='_blank'
                                        rel='noopener noreferrer'
                                        className='text-xs text-blue-600 hover:text-blue-700 font-mono break-all'
                                    >
                                        {window.location.origin}/verify-certificate/{encodeURIComponent(certificate.certificateId)}
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Download and Share Buttons */}
                    <div className='flex flex-col md:flex-row gap-4 justify-center mt-8'>
                        <Button 
                            onClick={handleDownloadPNG}
                            disabled={downloading}
                            className='bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg'
                        >
                            {downloading ? (
                                <>
                                    <Loader className='w-5 h-5 mr-2 animate-spin' />
                                    Downloading...
                                </>
                            ) : (
                                <>
                                    <FileDown className='w-5 h-5 mr-2' />
                                    Download PNG
                                </>
                            )}
                        </Button>

                        <Button 
                            onClick={handleDownloadPDF}
                            disabled={downloading}
                            className='bg-purple-600 hover:bg-purple-700 text-white px-8 py-6 text-lg'
                        >
                            {downloading ? (
                                <>
                                    <Loader className='w-5 h-5 mr-2 animate-spin' />
                                    Downloading...
                                </>
                            ) : (
                                <>
                                    <FileDown className='w-5 h-5 mr-2' />
                                    Download PDF
                                </>
                            )}
                        </Button>

                        <Button 
                            onClick={handleShare}
                            className='border-2 border-blue-600 text-blue-600 hover:bg-blue-50 px-8 py-6 text-lg'
                        >
                            <Share2 className='w-5 h-5 mr-2' />
                            Share Achievement
                        </Button>
                    </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center py-24">
                        <Trophy className="w-12 h-12 text-blue-500 mb-4" />
                        <div className="text-2xl font-bold text-gray-700 mb-2">Certificate Locked</div>
                        <div className="text-lg text-gray-500 max-w-xl text-center mb-4">
                            Complete <b>all chapters</b>, achieve <b>45%+ quiz average</b>, and <b>45+ points on each assignment</b> to earn your certificate.
                        </div>
                        <Button className="mt-2" variant="outline" onClick={() => router.push(`/course/${courseId}`)}>
                            Go to Course
                        </Button>
                    </div>
                )}
            </div>
        </>
    )
}

export default CertificatePage
