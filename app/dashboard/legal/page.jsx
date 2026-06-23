"use client"
import React, { useState } from 'react'
import { FileText, ShieldCheck, BadgeDollarSign, Sparkles, Mail, ExternalLink } from 'lucide-react'
import { TermsContent, PrivacyContent, RefundContent, OWNER_NAME, LAST_UPDATED, CONTACT_EMAIL } from '@/app/_components/legal/LegalContent'

const TABS = [
    { key: 'terms', label: 'Terms & Conditions', icon: FileText, href: '/terms' },
    { key: 'privacy', label: 'Privacy Policy', icon: ShieldCheck, href: '/privacy' },
    { key: 'refund', label: 'Refund Policy', icon: BadgeDollarSign, href: '/refund' },
]

export default function LegalPage() {
    const [activeTab, setActiveTab] = useState('terms')
    const activeMeta = TABS.find(t => t.key === activeTab)
    const ActiveIcon = activeMeta?.icon ?? FileText

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 p-7 mb-8 shadow-lg shadow-indigo-200/60 dark:shadow-none">
                <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
                <div className="absolute -bottom-12 -left-8 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
                <div className="relative flex items-start gap-3">
                    <div className="hidden sm:flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/30">
                        <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-white tracking-tight">Legal & Policies</h1>
                        <p className="text-sm text-indigo-50/90 mt-1">
                            Gemini LMS is owned and operated by <span className="font-bold text-white">{OWNER_NAME}</span>.
                        </p>
                        <p className="text-xs text-indigo-100/80 mt-1">Last updated: {LAST_UPDATED}</p>
                    </div>
                </div>
            </div>

            <div className="flex gap-2 mb-6 overflow-x-auto">
                {TABS.map(tab => {
                    const isActive = activeTab === tab.key
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-200 ${
                                isActive
                                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-200/70'
                                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white hover:border-indigo-200'
                            }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    )
                })}
            </div>

            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-7 shadow-sm">
                <div className="flex items-center justify-between gap-3 mb-6 pb-5 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40">
                            <ActiveIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <h2 className="text-lg font-black text-slate-900 dark:text-white">{activeMeta?.label}</h2>
                    </div>
                    <a
                        href={activeMeta?.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline whitespace-nowrap"
                    >
                        View public page <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                </div>

                {activeTab === 'terms' && <TermsContent />}
                {activeTab === 'privacy' && <PrivacyContent />}
                {activeTab === 'refund' && <RefundContent />}

                <div className="mt-8 pt-5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 text-xs text-slate-400">
                    <Mail className="w-3.5 h-3.5" />
                    Questions about these policies? Contact <a href={`mailto:${CONTACT_EMAIL}`} className="text-indigo-600 hover:underline font-medium">{CONTACT_EMAIL}</a>.
                </div>
            </div>
        </div>
    )
}
