"use client"
import React, { useContext, useState, useEffect } from 'react'
import { CourseCountContext } from '@/app/_context/CourseCountContext'
import { Sparkles, AlertCircle, X, ChevronRight } from 'lucide-react'
import Link from 'next/link'

export default function LowCreditsBanner() {
    const { userCredits, isMember } = useContext(CourseCountContext);
    const [isDismissed, setIsDismissed] = useState(true); // Default to dismissed to prevent layout shift during mount
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const dismissed = sessionStorage.getItem('lowCreditsBannerDismissed');
        if (dismissed !== 'true') {
            setIsDismissed(false);
        }
    }, []);

    if (!mounted || isDismissed || isMember) return null;

    // Show warning only if user has 1 or 0 credits left
    if (userCredits > 1) return null;

    const handleDismiss = () => {
        setIsDismissed(true);
        sessionStorage.setItem('lowCreditsBannerDismissed', 'true');
    };

    return (
        <div className="relative overflow-hidden mb-6 p-4 md:p-5 rounded-2xl border border-amber-200/60 dark:border-amber-500/30 bg-gradient-to-r from-amber-50/90 via-orange-50/80 to-yellow-50/70 dark:from-amber-950/20 dark:via-orange-950/15 dark:to-yellow-950/10 backdrop-blur-md shadow-md animate-in fade-in slide-in-from-top-4 duration-500">
            {/* Background decorative glow */}
            <div className="absolute -right-10 -top-10 w-36 h-36 bg-amber-400/10 dark:bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -left-10 -bottom-10 w-24 h-24 bg-orange-400/10 dark:bg-orange-500/5 rounded-full blur-xl pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row items-center sm:items-start md:items-center gap-4 relative z-10">
                <div className="flex items-center justify-center p-3 rounded-xl bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 flex-shrink-0 animate-bounce" style={{ animationDuration: '3s' }}>
                    <AlertCircle className="w-6 h-6" />
                </div>
                
                <div className="flex-1 text-center sm:text-left min-w-0">
                    <h3 className="font-extrabold text-sm md:text-base text-amber-950 dark:text-amber-200 flex items-center justify-center sm:justify-start gap-1.5 leading-none">
                        <span>Running Low on Course Credits!</span>
                        <span className="inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-200/80 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
                            {userCredits} Left
                        </span>
                    </h3>
                    <p className="text-xs md:text-sm text-amber-900/85 dark:text-amber-350/90 mt-2 font-medium leading-relaxed max-w-2xl">
                        You only have {userCredits} course creation {userCredits === 1 ? 'credit' : 'credits'} left. Upgrade to premium for <strong className="font-extrabold text-indigo-700 dark:text-indigo-400">unlimited course generation</strong> and unlock certificate downloads.
                    </p>
                </div>
                
                <div className="flex items-center gap-3 w-full sm:w-auto justify-center sm:justify-end flex-shrink-0">
                    <Link href="/dashboard/upgrade" className="w-full sm:w-auto">
                        <button className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-extrabold text-xs tracking-wider uppercase rounded-xl shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] flex items-center justify-center gap-1">
                            <Sparkles className="w-4 h-4" />
                            <span>Upgrade Plan</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </Link>
                    
                    <button 
                        onClick={handleDismiss}
                        className="p-2 text-amber-800/60 dark:text-amber-400/60 hover:text-amber-900 dark:hover:text-amber-200 hover:bg-amber-100/40 dark:hover:bg-amber-900/20 rounded-xl transition-colors flex-shrink-0"
                        aria-label="Dismiss Notification"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    )
}
