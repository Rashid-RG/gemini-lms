"use client"
import React, { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import axios from 'axios'
import { Award, Calendar, Trophy, ExternalLink, Info } from 'lucide-react'
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
            <div className="p-6 max-w-7xl mx-auto min-h-[60vh] flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="text-sm font-semibold text-slate-500 tracking-wide animate-pulse">Loading your certificates...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 dark:bg-slate-900/80 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm backdrop-blur-xl">
                <div className="flex items-center gap-3.5">
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl shadow-inner">
                        <Award className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white bg-gradient-to-r from-slate-900 to-indigo-950 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">My Certificates</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">View, share, and verify your earned course completion certificates</p>
                    </div>
                </div>
            </div>

            {/* Eligibility Criteria Alert Box */}
            <div className="flex gap-4 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/10 text-slate-700 dark:text-slate-350 shadow-sm backdrop-blur-xl">
                <Info className="h-6 w-6 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5 animate-pulse" />
                <div className="space-y-1">
                    <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">Certificate Eligibility Criteria</h4>
                    <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                        To earn an official verified certificate for a course, you must meet the following criteria:
                    </p>
                    <ul className="list-disc pl-5 mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                        <li><strong className="text-slate-800 dark:text-slate-300">100% Course Progress:</strong> Complete all chapters, study materials, and note activities in the course layout.</li>
                        <li><strong className="text-slate-800 dark:text-slate-300">Graded Quizzes:</strong> Complete at least 1 quiz with a minimum average score of <span className="font-bold text-emerald-600 dark:text-emerald-400">45%</span>.</li>
                        <li><strong className="text-slate-800 dark:text-slate-300">Graded Assignments (if applicable):</strong> Submit at least one assignment, and every graded assignment must score at least <span className="font-bold text-emerald-600 dark:text-emerald-400">45 points</span>.</li>
                        <li><strong className="text-slate-800 dark:text-slate-300">Automatic Issue:</strong> Once met, go to your course page to generate and claim your certificate. It will then appear here permanently.</li>
                    </ul>
                </div>
            </div>

            {certificates.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[400px] bg-white/60 dark:bg-slate-900/60 rounded-3xl border border-slate-200/60 dark:border-slate-800/60 backdrop-blur-xl p-8 shadow-sm">
                    <div className="p-4 bg-indigo-50 dark:bg-indigo-950/50 rounded-2xl mb-4 text-indigo-650 dark:text-indigo-400 shadow-inner">
                        <Trophy className="w-12 h-12 animate-pulse" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">No Certificates Yet</h3>
                    <p className="text-slate-500 dark:text-slate-400 mb-6 text-center max-w-md text-sm leading-relaxed">
                        Complete courses to earn certificates. Finish all chapters, quizzes, and assignments to unlock your official verified certificate!
                    </p>
                    <div className="flex flex-wrap justify-center gap-3">
                        <Link href="/dashboard">
                            <Button className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-xl shadow-md transition-all hover:scale-105 active:scale-95 px-5 h-10">
                                Browse My Courses
                            </Button>
                        </Link>
                        <Link href="/dashboard/explore">
                            <Button variant="outline" className="border-slate-200 hover:bg-slate-50 dark:hover:bg-slate-950/40 font-bold rounded-xl transition-all hover:scale-105 active:scale-95 px-5 h-10">
                                Explore Courses
                            </Button>
                        </Link>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {certificates.map((cert) => (
                        <div 
                            key={cert.id}
                            className="relative overflow-hidden group rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5"
                        >
                            {/* Card Accent Top Line */}
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-violet-600" />
                            
                            {/* Certificate Header */}
                            <div className="p-6 pb-4 bg-slate-50/50 dark:bg-slate-950/20 border-b border-slate-100 dark:border-slate-850">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl text-indigo-600 dark:text-indigo-400">
                                        <Award className="w-5 h-5" />
                                    </div>
                                    <span className="text-[10px] font-black tracking-wider uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full shadow-sm">
                                        Verified Certificate
                                    </span>
                                </div>
                                <h3 className="font-extrabold text-base text-slate-850 dark:text-slate-100 group-hover:text-indigo-650 dark:group-hover:text-indigo-400 transition-colors line-clamp-2 leading-snug">
                                    {cert.courseName}
                                </h3>
                            </div>

                            {/* Certificate Body */}
                            <div className="p-6 space-y-5">
                                <div className="space-y-2.5">
                                    <div className="flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                                        <Calendar className="w-4 h-4 text-slate-405" />
                                        <span>
                                            Completed: <strong>
                                                {new Date(cert.completedAt).toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}
                                            </strong>
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                                        <Trophy className="w-4 h-4 text-slate-405" />
                                        <span>Final Exam Score: <strong className="text-emerald-600 dark:text-emerald-400">{cert.finalScore}%</strong></span>
                                    </div>
                                </div>

                                <div className="bg-slate-50 dark:bg-slate-950/40 rounded-xl p-3 border border-slate-150/40 dark:border-slate-800/40">
                                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-0.5">Verification ID</p>
                                    <p className="font-mono text-xs font-bold text-slate-650 dark:text-slate-350 select-all truncate">
                                        {cert.certificateId}
                                    </p>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                                    <Link href={`/course/${cert.courseId}/certificate`} className="flex-1">
                                        <Button className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-xl h-10 shadow-sm transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-1.5" size="sm">
                                            <ExternalLink className="w-4 h-4" />
                                            View Certificate
                                        </Button>
                                    </Link>
                                    <Link href={`/verify-certificate/${cert.certificateId}`} target="_blank">
                                        <Button variant="outline" className="border-slate-200 hover:bg-slate-50 dark:hover:bg-slate-950/40 font-bold rounded-xl h-10 transition-all hover:scale-[1.02] active:scale-95 px-4" size="sm">
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
