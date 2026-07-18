"use client"
import React, { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import axios from 'axios'
import { CheckCircle, XCircle, Award, Calendar, Trophy, Loader, Download, Share2, FileDown, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { getGradeLabel, getGradeDescription } from '@/lib/gradingSystem'
import { toast } from 'sonner'
import QRCode from 'qrcode'

function VerifyCertificatePage() {
    const { certificateId } = useParams()
    const [certificate, setCertificate] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [downloading, setDownloading] = useState(false)
    const [sigError, setSigError] = useState(false)
    const certificateRef = useRef(null)

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

    const generateCanvasImage = async () => {
        if (!certificate) return null;
        
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
        
        // Student name
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
        const grade = getGradeLabel(certificate.finalScore)
        const description = getGradeDescription(certificate.finalScore)
        ctx.font = '600 18px "Montserrat", sans-serif'
        ctx.fillStyle = '#16a34a'
        ctx.fillText(`Final Grade: ${grade} (${certificate.finalScore}%) — ${description}`, canvas.width / 2, 570)
        
        // Date
        ctx.font = '500 16px "Montserrat", sans-serif'
        ctx.fillStyle = '#64748b'
        const date = new Date(certificate.completedAt || certificate.issueDate).toLocaleDateString('en-US', {
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
        
        // Preload founder signature image
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

        // Draw Signature using multiply blending
        if (sigImg) {
            ctx.fillStyle = '#faf8f3'
            ctx.fillRect(855, 650, 230, 100)
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
        
        // Founder Name
        ctx.font = 'bold 18px "Cinzel", "Georgia", serif'
        ctx.fillStyle = '#1e1b4b'
        ctx.textAlign = 'center'
        ctx.fillText('M.S.F. Sajeefa', 975, 778)
        
        // Founder title
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
        
        // Subtle Holographic Sheen
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
            text: `Verifying completion of ${certificate.courseName} by ${certificate.studentName} with score of ${certificate.finalScore}%! 🎉`,
            url: window.location.href
        }

        try {
            if (navigator.share) {
                await navigator.share(shareData)
                toast.success('Shared Successfully! 🎉', {
                    position: 'top-center'
                })
            } else {
                await navigator.clipboard.writeText(window.location.href)
                toast.success('Copied Link to Clipboard! 📋', {
                    description: 'Verification link has been copied.',
                    position: 'top-center'
                })
            }
        } catch (error) {
            console.error('Sharing failed:', error)
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

                    <div className='p-4 md:p-8'>
                        {/* Gorgeous HTML Preview of the Certificate */}
                        <div 
                            ref={certificateRef}
                            className="p-1 bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-900 rounded-3xl shadow-2xl mb-6 relative overflow-hidden"
                        >
                            <div className="bg-[#faf8f3] rounded-[22px] p-6 md:p-12 border-[6px] border-amber-500 border-double relative overflow-hidden">
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

                                {/* Academic Crest Watermark */}
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

                                {/* Content */}
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
                                                {certificate.finalScore}% ({getGradeLabel(certificate.finalScore)})
                                            </p>
                                        </div>

                                        <div className="text-center">
                                            <Calendar className="w-7 h-7 text-indigo-600 mx-auto mb-1.5" />
                                            <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider font-montserrat">Issued Date</p>
                                            <p className="text-sm font-bold text-slate-700 font-montserrat">
                                                {new Date(certificate.completedAt || certificate.issueDate).toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Academic Gold/Silver Foil Seal */}
                                    <div className="relative w-28 h-28 mx-auto flex items-center justify-center my-6 z-10 group cursor-default">
                                        <div className="absolute w-28 h-28 rounded-full bg-gradient-to-br from-amber-200 via-yellow-500 to-amber-700 shadow-[0_4px_15px_rgba(0,0,0,0.2)] flex items-center justify-center overflow-hidden z-10">
                                            <div className="absolute inset-0 bg-[repeating-conic-gradient(transparent_0deg,rgba(0,0,0,0.1)_5deg,transparent_10deg)] mix-blend-overlay" />
                                            <div className="relative w-[92px] h-[92px] rounded-full bg-gradient-to-br from-slate-100 via-slate-300 to-slate-400 border border-slate-400/50 flex flex-col items-center justify-center shadow-inner z-20 overflow-hidden">
                                                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-cyan-100/40 to-pink-100/40 opacity-70 mix-blend-color-burn" />
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

                                    {/* Signature */}
                                    <div className="flex flex-col items-center gap-3 pt-6 border-t border-indigo-950/10 mt-6">
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
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Download and Share Buttons */}
                        <div className="flex flex-wrap gap-4 justify-center mb-8 border-b pb-8">
                            <Button 
                                onClick={handleDownloadPNG}
                                disabled={downloading}
                                className="bg-[#1e1b4b] hover:bg-[#2b2766] text-white font-bold rounded-xl h-11 px-6 flex items-center gap-2 transition-transform hover:scale-105 active:scale-95 shadow-md"
                            >
                                {downloading ? <Loader className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                Download PNG
                            </Button>

                            <Button 
                                onClick={handleDownloadPDF}
                                disabled={downloading}
                                className="bg-[#d97706] hover:bg-[#b45309] text-white font-bold rounded-xl h-11 px-6 flex items-center gap-2 transition-transform hover:scale-105 active:scale-95 shadow-md"
                            >
                                {downloading ? <Loader className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                                Download PDF
                            </Button>

                            <Button 
                                onClick={handleShare}
                                variant="outline"
                                className="border-slate-200 hover:bg-slate-50 font-bold rounded-xl h-11 px-6 flex items-center gap-2 transition-transform hover:scale-105 active:scale-95 shadow-sm"
                            >
                                <Share2 className="w-4 h-4" />
                                Share Verification Link
                            </Button>
                        </div>

                        {/* Technical Verification Details */}
                        <div className='bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl p-6 border border-slate-200 shadow-inner'>
                            <h4 className='font-semibold text-slate-800 mb-3 flex items-center gap-2'>
                                <CheckCircle className='w-5 h-5 text-green-600' />
                                Audit & Verification Details
                            </h4>
                            <div className='grid md:grid-cols-2 gap-4 text-sm text-slate-600'>
                                <div className='space-y-2'>
                                    <p>✓ <strong>Issuer:</strong> Gemini LMS Learning Hub</p>
                                    <p>✓ <strong>Recipient:</strong> {certificate.studentName} ({certificate.studentEmail})</p>
                                    <p>✓ <strong>Status:</strong> Valid and Active</p>
                                </div>
                                <div className='space-y-2'>
                                    <p>✓ <strong>Final score:</strong> {certificate.finalScore}% ({getGradeLabel(certificate.finalScore)} — {getGradeDescription(certificate.finalScore)})</p>
                                    <p>✓ <strong>Certificate ID:</strong> {certificate.certificateId}</p>
                                    <p>✓ <strong>Date Issued:</strong> {new Date(certificate.completedAt || certificate.issueDate).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Note */}
                <div className='text-center text-sm text-slate-500 bg-white/70 dark:bg-slate-900/70 border border-slate-200/50 rounded-xl p-4 shadow-sm backdrop-blur-md'>
                    <p>This certificate was verified on {new Date().toLocaleString()}</p>
                    <p className='mt-1'>© {new Date().getFullYear()} Gemini LMS. All rights reserved.</p>
                </div>
            </div>
        </div>
    )
}

export default VerifyCertificatePage
