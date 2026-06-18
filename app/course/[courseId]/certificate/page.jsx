"use client"
// snyk:skip=javascript/DOMXSS - Certificate data from trusted backend database
import React, { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Award, Download, Share2, CheckCircle, Calendar, Trophy, Loader, FileDown, ShieldCheck } from 'lucide-react'
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
    const [sigError, setSigError] = useState(false)
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
        
        // Background gradient border
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
        gradient.addColorStop(0, '#1e1b4b') // Deep Midnight Navy
        gradient.addColorStop(0.5, '#312e81') 
        gradient.addColorStop(1, '#4f46e5') 
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        
        // Cream Ivory certificate inner area
        ctx.fillStyle = '#faf8f3'
        ctx.fillRect(50, 50, canvas.width - 100, canvas.height - 100)
        
        // Outer gold border (thick)
        ctx.strokeStyle = '#d97706' // Gold/Amber
        ctx.lineWidth = 6
        ctx.strokeRect(68, 68, canvas.width - 136, canvas.height - 136)
        
        // Inner navy border (thin)
        ctx.strokeStyle = '#1e1b4b'
        ctx.lineWidth = 1.5
        ctx.strokeRect(78, 78, canvas.width - 156, canvas.height - 156)
        
        // Inner gold line (double line effect)
        ctx.strokeStyle = '#d97706'
        ctx.lineWidth = 1
        ctx.strokeRect(84, 84, canvas.width - 168, canvas.height - 168)
        
        // Corner decorative scrolls (Academic/Classical Flourishes)
        const drawCornerOrnament = (x, y, rotation) => {
            ctx.save()
            ctx.translate(x, y)
            ctx.rotate(rotation)
            ctx.strokeStyle = '#d97706'
            ctx.lineWidth = 1.8
            
            ctx.beginPath()
            // Main curved vine
            ctx.moveTo(0, 40)
            ctx.quadraticCurveTo(40, 40, 40, 0)
            ctx.stroke()
            
            // Outer scroll ring
            ctx.beginPath()
            ctx.arc(14, 14, 8, Math.PI, Math.PI * 1.5)
            ctx.stroke()
            
            // Inner scroll ring
            ctx.beginPath()
            ctx.arc(28, 28, 14, Math.PI, Math.PI * 1.5)
            ctx.stroke()
            
            ctx.restore()
        }
        drawCornerOrnament(88, 88, 0)
        drawCornerOrnament(1112, 88, Math.PI / 2)
        drawCornerOrnament(1112, 812, Math.PI)
        drawCornerOrnament(88, 812, Math.PI * 1.5)
        
        // Faint central watermark crest
        ctx.save()
        ctx.globalAlpha = 0.03
        ctx.strokeStyle = '#d97706'
        ctx.fillStyle = '#d97706'
        ctx.lineWidth = 3
        ctx.translate(600, 430)
        
        // Shield
        ctx.beginPath()
        ctx.moveTo(0, -90)
        ctx.quadraticCurveTo(70, -90, 90, -20)
        ctx.quadraticCurveTo(90, 50, 0, 110)
        ctx.quadraticCurveTo(-90, 50, -90, -20)
        ctx.quadraticCurveTo(-70, -90, 0, -90)
        ctx.stroke()
        
        // Inner details
        ctx.beginPath()
        ctx.arc(0, 0, 36, 0, Math.PI * 2)
        ctx.stroke()
        
        // Laurel Leaves
        for (let side = -1; side <= 1; side += 2) {
            for (let i = 0; i < 7; i++) {
                const angle = -Math.PI / 2 + side * (0.2 + i * 0.25)
                const lx = Math.cos(angle) * 110
                const ly = Math.sin(angle) * 110
                
                ctx.save()
                ctx.translate(lx, ly)
                ctx.rotate(angle + (side * Math.PI / 4))
                ctx.beginPath()
                ctx.ellipse(0, 0, 18, 7, 0, 0, Math.PI * 2)
                ctx.fill()
                ctx.restore()
            }
        }
        ctx.restore()
        
        // Logo area (top left)
        ctx.font = 'bold 24px "Cinzel", "Georgia", serif'
        ctx.fillStyle = '#1e1b4b'
        ctx.textAlign = 'left'
        ctx.fillText('GEMINI LMS', 142, 130)
        ctx.font = 'bold 10px "Montserrat", sans-serif'
        ctx.fillStyle = '#d97706'
        ctx.fillText('VERIFIED LEARNING HUB', 142, 148)
        
        // Logo background circle
        ctx.fillStyle = '#1e1b4b'
        ctx.beginPath()
        ctx.arc(110, 132, 18, 0, Math.PI * 2)
        ctx.fill()
        
        ctx.font = '900 20px "Cinzel", "Georgia", serif'
        ctx.fillStyle = '#faf9f5'
        ctx.textAlign = 'center'
        ctx.fillText('G', 110, 139)
        
        // Title
        ctx.fillStyle = '#1e1b4b'
        ctx.font = 'bold 42px "Cinzel", "Georgia", serif'
        ctx.textAlign = 'center'
        ctx.fillText('CERTIFICATE OF COMPLETION', canvas.width / 2, 230)
        
        // Subtitle
        ctx.font = 'italic 22px "Great Vibes", "Georgia", serif'
        ctx.fillStyle = '#475569'
        ctx.fillText('This certificate is proudly presented to', canvas.width / 2, 305)
        
        // Student name (formal calligraphy styling)
        ctx.font = 'bold 46px "Cinzel", "Georgia", serif'
        ctx.fillStyle = '#1e1b4b'
        ctx.fillText(certificate.studentName, canvas.width / 2, 380)
        
        // Calligraphy Line under name
        ctx.strokeStyle = '#d97706'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(350, 405)
        ctx.lineTo(850, 405)
        ctx.stroke()
        
        // Elegant dots on name divider
        ctx.fillStyle = '#d97706'
        ctx.beginPath()
        ctx.arc(600, 405, 4, 0, Math.PI * 2)
        ctx.arc(580, 405, 2.5, 0, Math.PI * 2)
        ctx.arc(620, 405, 2.5, 0, Math.PI * 2)
        ctx.fill()
        
        // Description
        ctx.font = 'italic 22px "Great Vibes", "Georgia", serif'
        ctx.fillStyle = '#475569'
        ctx.fillText('in recognition of their outstanding dedication and successful completion of the course', canvas.width / 2, 455)
        
        // Course name
        ctx.font = 'bold 32px "Cinzel", "Georgia", serif'
        ctx.fillStyle = '#1e1b4b'
        const courseName = certificate.courseName.length > 50 
            ? certificate.courseName.substring(0, 50) + '...' 
            : certificate.courseName
        ctx.fillText(courseName, canvas.width / 2, 515)
        
        // Score
        ctx.font = '600 18px "Montserrat", sans-serif'
        ctx.fillStyle = '#16a34a'
        ctx.fillText(`Final Evaluation Index: ${certificate.finalScore}% (Academic Merit)`, canvas.width / 2, 570)
        
        // Date
        ctx.font = '500 16px "Montserrat", sans-serif'
        ctx.fillStyle = '#64748b'
        const date = new Date(certificate.completedAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
        ctx.fillText(`Awarded on ${date}`, canvas.width / 2, 625)
        
        // Verified label pill
        ctx.save()
        ctx.beginPath()
        ctx.moveTo(520, 660)
        ctx.lineTo(680, 660)
        ctx.arc(680, 672, 12, Math.PI * 1.5, Math.PI * 0.5)
        ctx.lineTo(520, 684)
        ctx.arc(520, 672, 12, Math.PI * 0.5, Math.PI * 1.5)
        ctx.closePath()
        ctx.fillStyle = '#dcfce7'
        ctx.fill()
        ctx.lineWidth = 1.5
        ctx.strokeStyle = '#22c55e'
        ctx.stroke()
        
        ctx.fillStyle = '#15803d'
        ctx.font = 'bold 11px "Montserrat", sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('✓ VERIFIED GRADUATE', 600, 676)
        ctx.restore()
        
        ctx.font = '500 12px "Montserrat", sans-serif'
        ctx.fillStyle = '#64748b'
        ctx.fillText(`Certificate ID: ${certificate.certificateId}`, canvas.width / 2, 705)
        
        // Preload founder signature image (no pixel manipulation needed)
        const sigImg = await new Promise((resolve) => {
            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.onload = () => resolve(img)
            img.onerror = () => {
                console.error('Failed to load founder signature image')
                resolve(null)
            }
            img.src = '/founder-signature.png'
        })

        // Draw Signature using multiply blending (same as CSS mix-blend-multiply)
        // White becomes invisible, dark ink is fully preserved
        if (sigImg) {
            // Draw a cream background patch behind the signature area so multiply works
            ctx.fillStyle = '#faf8f3'
            ctx.fillRect(855, 650, 230, 100)
            // Apply multiply blend
            ctx.save()
            ctx.globalCompositeOperation = 'multiply'
            ctx.drawImage(sigImg, 855, 648, 230, 100)
            ctx.restore()
        } else {
            ctx.font = 'italic bold 28px "Georgia", serif'
            ctx.fillStyle = '#1e1b4b'
            ctx.textAlign = 'center'
            ctx.fillText('M.S.F. Sajeefa', 975, 720)
        }

        // Signature underline
        ctx.strokeStyle = '#1e1b4b'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(860, 755)
        ctx.lineTo(1090, 755)
        ctx.stroke()
        
        // Founder Name — bold, clear, dark navy
        ctx.font = 'bold 18px "Cinzel", "Georgia", serif'
        ctx.fillStyle = '#1e1b4b'
        ctx.textAlign = 'center'
        ctx.fillText('M.S.F. Sajeefa', 975, 778)
        
        // Founder title — gold, clearly visible
        ctx.font = 'bold 13px "Montserrat", sans-serif'
        ctx.fillStyle = '#d97706'
        ctx.textAlign = 'center'
        ctx.fillText('FOUNDER OF GEMINI LMS', 975, 800)
        
        // Academic Foil Seal (Center Bottom)
        ctx.save()
        ctx.translate(600, 765)
        
        // Outer Embossed Gold Edge
        const goldEdge = ctx.createLinearGradient(-40, -40, 40, 40)
        goldEdge.addColorStop(0, '#fde68a') // amber-200
        goldEdge.addColorStop(0.5, '#eab308') // yellow-500
        goldEdge.addColorStop(1, '#b45309') // amber-700
        
        // Draw Serrated Edges
        ctx.fillStyle = goldEdge
        for (let i = 0; i < 40; i++) {
            ctx.save()
            ctx.rotate((Math.PI / 20) * i)
            ctx.beginPath()
            ctx.moveTo(0, -48)
            ctx.lineTo(4, -42)
            ctx.lineTo(-4, -42)
            ctx.closePath()
            ctx.fill()
            ctx.restore()
        }
        
        // Inner Gold Base
        ctx.beginPath()
        ctx.arc(0, 0, 43, 0, Math.PI * 2)
        ctx.fillStyle = goldEdge
        ctx.fill()
        
        // Inner Silver/Platinum Circle
        const silverBase = ctx.createLinearGradient(-35, -35, 35, 35)
        silverBase.addColorStop(0, '#f1f5f9') // slate-100
        silverBase.addColorStop(0.5, '#cbd5e1') // slate-300
        silverBase.addColorStop(1, '#94a3b8') // slate-400
        
        ctx.beginPath()
        ctx.arc(0, 0, 38, 0, Math.PI * 2)
        ctx.fillStyle = silverBase
        ctx.fill()
        
        // Subtle Holographic Sheen (very faint)
        const faintIridescent = ctx.createLinearGradient(-35, 35, 35, -35)
        faintIridescent.addColorStop(0, 'rgba(236, 72, 153, 0.15)') // pink
        faintIridescent.addColorStop(0.5, 'rgba(56, 189, 248, 0.15)') // sky
        faintIridescent.addColorStop(1, 'rgba(250, 204, 21, 0.1)') // yellow
        ctx.beginPath()
        ctx.arc(0, 0, 38, 0, Math.PI * 2)
        ctx.fillStyle = faintIridescent
        ctx.fill()
        
        // Fine Embossed Rings
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.8)' // slate-400
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(0, 0, 34, 0, Math.PI * 2)
        ctx.stroke()
        
        ctx.strokeStyle = 'rgba(100, 116, 139, 0.5)' // slate-500
        ctx.setLineDash([3, 3])
        ctx.beginPath()
        ctx.arc(0, 0, 32, 0, Math.PI * 2)
        ctx.stroke()
        ctx.setLineDash([])
        
        // Inner Content Text
        ctx.font = '900 10px "Cinzel", "Georgia", serif'
        ctx.fillStyle = '#1e293b' // slate-800
        ctx.textAlign = 'center'
        ctx.fillText('ACADEMIC', 0, 10)
        
        ctx.font = 'bold 6.5px "Montserrat", sans-serif'
        ctx.fillStyle = '#475569' // slate-600
        ctx.fillText('EXCELLENCE', 0, 20)
        
        // Small Shield Crest
        ctx.fillStyle = '#334155' // slate-700
        ctx.beginPath()
        ctx.moveTo(0, -26)
        ctx.lineTo(7, -22)
        ctx.lineTo(7, -12)
        ctx.quadraticCurveTo(7, -8, 0, -2)
        ctx.quadraticCurveTo(-7, -8, -7, -12)
        ctx.lineTo(-7, -22)
        ctx.closePath()
        ctx.fill()
        
        // Star inside shield
        ctx.fillStyle = '#f8fafc' // slate-50
        ctx.beginPath()
        ctx.moveTo(0, -20)
        ctx.lineTo(1.2, -17)
        ctx.lineTo(4, -17)
        ctx.lineTo(2, -14.5)
        ctx.lineTo(3, -11)
        ctx.lineTo(0, -13)
        ctx.lineTo(-3, -11)
        ctx.lineTo(-2, -14.5)
        ctx.lineTo(-4, -17)
        ctx.lineTo(-1.2, -17)
        ctx.closePath()
        ctx.fill()
        
        ctx.restore()
        
        // Generate QR code — moved up and slightly larger
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
            
            return await new Promise((resolve) => {
                const qrImage = new Image()
                qrImage.onload = () => {
                    ctx.drawImage(qrImage, 88, 680, 88, 88)
                    
                    ctx.font = 'bold 10px "Montserrat", sans-serif'
                    ctx.fillStyle = '#64748b'
                    ctx.textAlign = 'center'
                    ctx.fillText('Scan to verify', 132, 785)
                    
                    resolve(canvas)
                }
                qrImage.src = qrDataUrl
            })
        } catch (err) {
            console.error('QR code generation error:', err)
            ctx.strokeStyle = '#cbd5e1'
            ctx.lineWidth = 1.5
            ctx.strokeRect(88, 680, 88, 88)
            
            ctx.font = 'bold 10px "Montserrat", sans-serif'
            ctx.fillStyle = '#64748b'
            ctx.textAlign = 'center'
            ctx.fillText('Scan to verify', 132, 785)
            
            return canvas
        }
    }

    const handleDownloadPNG = async () => {
        try {
            setDownloading(true)
            await document.fonts.ready
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
            await document.fonts.ready
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
            {/* Google Fonts for Premium Academic Styling */}
            <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700;800;900&family=Great+Vibes&family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet" />
            <style dangerouslySetInnerHTML={{ __html: `
                .font-cinzel { font-family: 'Cinzel', serif; }
                .font-great-vibes { font-family: 'Great Vibes', cursive; }
                .font-montserrat { font-family: 'Montserrat', sans-serif; }
            `}} />

            <div className="max-w-4xl mx-auto mt-8 p-4">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-650 mx-auto mb-4"></div>
                        <div className="text-lg text-gray-500">Loading certificate...</div>
                    </div>
                ) : certificate ? (
                    <>
                    {/* Outer gradient container simulating premium background frame */}
                    <div 
                        ref={certificateRef}
                        className="p-1 bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-900 rounded-3xl shadow-2xl mb-6 relative overflow-hidden"
                    >
                        <div className="bg-[#faf8f3] rounded-[22px] p-6 md:p-12 border-[6px] border-amber-500 border-double relative overflow-hidden">
                            {/* Inner border lines */}
                            <div className="absolute inset-2 border border-indigo-950/20 rounded-[14px] pointer-events-none" />
                            <div className="absolute inset-3.5 border border-amber-500/30 rounded-[12px] pointer-events-none" />
                            
                            {/* Corner Ornaments */}
                            <div className="absolute top-4 left-4 w-12 h-12 text-amber-500/80 pointer-events-none z-10">
                                <svg className="w-full h-full fill-none stroke-current" strokeWidth="1.5" viewBox="0 0 40 40">
                                    <path d="M 4,4 L 36,4 M 4,4 L 4,36 M 12,12 A 8,8 0 0 1 20,4 M 12,12 A 8,8 0 0 0 4,20" />
                                </svg>
                            </div>
                            <div className="absolute top-4 right-4 w-12 h-12 text-amber-500/80 pointer-events-none z-10 rotate-90">
                                <svg className="w-full h-full fill-none stroke-current" strokeWidth="1.5" viewBox="0 0 40 40">
                                    <path d="M 4,4 L 36,4 M 4,4 L 4,36 M 12,12 A 8,8 0 0 1 20,4 M 12,12 A 8,8 0 0 0 4,20" />
                                </svg>
                            </div>
                            <div className="absolute bottom-4 left-4 w-12 h-12 text-amber-500/80 pointer-events-none z-10 -rotate-90">
                                <svg className="w-full h-full fill-none stroke-current" strokeWidth="1.5" viewBox="0 0 40 40">
                                    <path d="M 4,4 L 36,4 M 4,4 L 4,36 M 12,12 A 8,8 0 0 1 20,4 M 12,12 A 8,8 0 0 0 4,20" />
                                </svg>
                            </div>
                            <div className="absolute bottom-4 right-4 w-12 h-12 text-amber-500/80 pointer-events-none z-10 rotate-180">
                                <svg className="w-full h-full fill-none stroke-current" strokeWidth="1.5" viewBox="0 0 40 40">
                                    <path d="M 4,4 L 36,4 M 4,4 L 4,36 M 12,12 A 8,8 0 0 1 20,4 M 12,12 A 8,8 0 0 0 4,20" />
                                </svg>
                            </div>

                            {/* Academic Crest Background Watermark */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none z-0">
                                <svg className="w-96 h-96 text-amber-600 fill-none stroke-current" viewBox="0 0 100 100" strokeWidth="2">
                                    <path d="M50 10 Q70 10 85 35 Q85 65 50 90 Q15 65 15 35 Q30 10 50 10 Z" />
                                    <circle cx="50" cy="45" r="15" />
                                    <path d="M30 40 Q25 45 28 50 M32 46 Q27 51 30 56 M35 52 Q30 57 33 62" strokeLinecap="round" />
                                    <path d="M70 40 Q75 45 72 50 M68 46 Q73 51 70 56 M65 52 Q70 57 67 62" strokeLinecap="round" />
                                </svg>
                            </div>
                            
                            {/* GEMINI LMS Header */}
                            <div className="flex items-center justify-between mb-8 pb-4 border-b border-indigo-950/10 relative z-10">
                                <div className="flex items-center gap-3">
                                    <div className="w-11 h-11 bg-[#1e1b4b] rounded-lg flex items-center justify-center text-[#faf9f5] font-cinzel font-black text-xl shadow-md border border-amber-500/20">
                                        G
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-black tracking-tight text-indigo-950 font-cinzel">GEMINI LMS</h4>
                                        <p className="text-[10px] font-bold text-amber-600 tracking-widest uppercase font-montserrat">Verified Learning Hub</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full text-emerald-600 shadow-sm">
                                    <CheckCircle className="w-4 h-4" />
                                    <span className="text-[10px] font-black tracking-wider uppercase font-montserrat">Verified</span>
                                </div>
                            </div>

                            {/* Certificate Content */}
                            <div className="text-center space-y-6 relative z-10">
                                <div className="space-y-1">
                                    <h2 className="text-3xl md:text-4.5xl font-extrabold text-indigo-950 font-cinzel tracking-wide">
                                        CERTIFICATE
                                    </h2>
                                    <h3 className="text-lg md:text-xl font-bold text-amber-600 tracking-widest uppercase font-montserrat">
                                        OF COMPLETION
                                    </h3>
                                </div>

                                <p className="text-xl md:text-2xl italic text-slate-500 font-great-vibes">
                                    This certificate is proudly presented to
                                </p>

                                <h3 className="text-3xl md:text-4.5xl font-bold text-indigo-950 font-cinzel border-b border-amber-500 pb-2 inline-block px-4">
                                    {certificate.studentName}
                                </h3>

                                <p className="text-lg md:text-xl italic text-slate-500 font-great-vibes max-w-xl mx-auto leading-relaxed">
                                    in recognition of their outstanding dedication and successful completion of the course
                                </p>

                                <h4 className="text-2xl md:text-3xl font-extrabold text-indigo-950 font-cinzel max-w-2xl mx-auto leading-snug">
                                    {certificate.courseName}
                                </h4>

                                <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 pt-4">
                                    <div className="text-center">
                                        <Trophy className="w-7 h-7 text-amber-500 mx-auto mb-1.5" />
                                        <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider font-montserrat">Final score</p>
                                        <p className="text-xl font-extrabold text-emerald-600 font-montserrat">
                                            {certificate.finalScore}%
                                        </p>
                                    </div>

                                    <div className="text-center">
                                        <Calendar className="w-7 h-7 text-indigo-600 mx-auto mb-1.5" />
                                        <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider font-montserrat">Issued Date</p>
                                        <p className="text-sm font-bold text-slate-700 font-montserrat">
                                            {new Date(certificate.completedAt).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </p>
                                    </div>
                                </div>

                                {/* Academic Gold/Silver Foil Seal */}
                                <div className="relative w-28 h-28 mx-auto flex items-center justify-center my-6 z-10 group cursor-default">
                                    {/* Outer embossed metallic edge */}
                                    <div className="absolute w-28 h-28 rounded-full bg-gradient-to-br from-amber-200 via-yellow-500 to-amber-700 shadow-[0_4px_15px_rgba(0,0,0,0.2)] flex items-center justify-center overflow-hidden z-10">
                                        
                                        {/* Serrated texture simulation */}
                                        <div className="absolute inset-0 bg-[repeating-conic-gradient(transparent_0deg,rgba(0,0,0,0.1)_5deg,transparent_10deg)] mix-blend-overlay" />
                                        
                                        {/* Inner silver metallic circle */}
                                        <div className="relative w-[92px] h-[92px] rounded-full bg-gradient-to-br from-slate-100 via-slate-300 to-slate-400 border border-slate-400/50 flex flex-col items-center justify-center shadow-inner z-20 overflow-hidden">
                                            
                                            {/* Subtle holographic sheen over silver */}
                                            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-cyan-100/40 to-pink-100/40 opacity-70 mix-blend-color-burn" />
                                            
                                            {/* Fine embossed inner ring */}
                                            <div className="absolute inset-1.5 rounded-full border border-slate-400/60" />
                                            <div className="absolute inset-2.5 rounded-full border border-dashed border-slate-500/40" />
                                            
                                            <div className="relative z-30 flex flex-col items-center">
                                                <ShieldCheck className="w-6 h-6 text-slate-700 mb-0.5 drop-shadow-sm" />
                                                <span className="text-[9px] font-black tracking-widest text-slate-800 font-cinzel uppercase mt-0.5">Academic</span>
                                                <span className="text-[6px] font-bold text-slate-600 font-montserrat uppercase mt-0.5">Excellence</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-indigo-950/10">
                                    <p className="text-xs text-slate-450 font-medium font-montserrat">
                                        Certificate ID: <span className="font-mono font-bold text-slate-600">{certificate.certificateId}</span>
                                    </p>
                                </div>

                                {/* Signature & Verification Footer */}
                                <div className="flex flex-col items-center gap-3 pt-6 border-t border-indigo-950/10 mt-6">
                                    {/* Signature Image */}
                                    <div className="h-16 flex items-end justify-center relative w-48">
                                        {!sigError ? (
                                            <img 
                                                src="/founder-signature.png" 
                                                className="h-16 object-contain mix-blend-multiply transition-opacity duration-300"
                                                alt="Founder Signature"
                                                onError={() => setSigError(true)}
                                            />
                                        ) : (
                                            <p className="font-great-vibes font-bold text-3xl text-indigo-950">M.S.F. Sajeefa</p>
                                        )}
                                    </div>
                                    <div className="w-48 border-t-2 border-indigo-950/20"></div>
                                    <p className="text-sm font-bold text-indigo-950 tracking-wide font-cinzel">M.S.F. Sajeefa</p>
                                    <p className="text-[10px] font-semibold text-amber-600 tracking-widest uppercase font-montserrat">Founder of GEMINI LMS</p>

                                    {/* Verify link */}
                                    <div className="mt-3 text-center">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 font-montserrat">Verify Authenticity</p>
                                        <a 
                                            href={`${window.location.origin}/verify-certificate/${encodeURIComponent(certificate.certificateId)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[10px] text-indigo-600 hover:text-indigo-700 hover:underline font-mono break-all"
                                        >
                                            {window.location.host}/verify-certificate/{certificate.certificateId.substring(0, 8)}...
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8 pb-12">
                        <Button 
                            onClick={handleDownloadPNG}
                            disabled={downloading}
                            className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-xl h-12 px-8 shadow-md transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                        >
                            {downloading ? <Loader className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                            Download PNG
                        </Button>

                        <Button 
                            onClick={handleDownloadPDF}
                            disabled={downloading}
                            className="bg-gradient-to-r from-purple-600 to-pink-650 hover:from-purple-500 hover:to-pink-600 text-white font-bold rounded-xl h-12 px-8 shadow-md transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                        >
                            {downloading ? <Loader className="w-5 h-5 animate-spin" /> : <FileDown className="w-5 h-5" />}
                            Download PDF
                        </Button>

                        <Button 
                            onClick={handleShare}
                            className="border-2 border-indigo-200 bg-indigo-50/20 hover:bg-indigo-50/50 text-indigo-700 font-bold rounded-xl h-12 px-8 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                        >
                            <Share2 className="w-5 h-5" />
                            Share Achievement
                        </Button>
                    </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center py-24 bg-white/70 dark:bg-slate-900/70 border border-slate-200/60 dark:border-slate-800/60 backdrop-blur-xl rounded-3xl">
                        <Trophy className="w-12 h-12 text-indigo-500 mb-4 animate-pulse" />
                        <div className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Certificate Locked</div>
                        <div className="text-lg text-slate-500 dark:text-slate-400 max-w-xl text-center mb-6 px-4">
                            Complete <b>all chapters</b>, achieve <b>45%+ quiz average</b>, and <b>45+ points on each assignment</b> to earn your certificate.
                        </div>
                        <Button className="bg-indigo-650 hover:bg-indigo-700 font-bold rounded-xl h-10 px-5 transition-all hover:scale-105 active:scale-95" variant="outline" onClick={() => router.push(`/course/${courseId}`)}>
                            Go to Course
                        </Button>
                    </div>
                )}
            </div>
        </>
    )
}

export default CertificatePage
