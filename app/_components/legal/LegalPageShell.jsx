import React from 'react'
import Link from 'next/link'
import { Mail, ArrowLeft } from 'lucide-react'
import { OWNER_NAME, LAST_UPDATED, CONTACT_EMAIL } from './LegalContent'

export default function LegalPageShell({ icon: Icon, title, children }) {
    return (
        <div className="min-h-screen bg-slate-50/50">
            <div className="max-w-3xl mx-auto px-4 py-10">
                <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700 mb-6">
                    <ArrowLeft className="w-4 h-4" /> Back to Gemini LMS
                </Link>

                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 p-7 mb-8 shadow-lg shadow-indigo-200/60">
                    <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
                    <div className="absolute -bottom-12 -left-8 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
                    <div className="relative flex items-start gap-3">
                        <div className="hidden sm:flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/30">
                            <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-white tracking-tight">{title}</h1>
                            <p className="text-sm text-indigo-50/90 mt-1">
                                Gemini LMS is owned and operated by <span className="font-bold text-white">{OWNER_NAME}</span>.
                            </p>
                            <p className="text-xs text-indigo-100/80 mt-1">Last updated: {LAST_UPDATED}</p>
                        </div>
                    </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
                    {children}

                    <div className="mt-8 pt-5 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-400">
                        <Mail className="w-3.5 h-3.5" />
                        Questions about this policy? Contact <a href={`mailto:${CONTACT_EMAIL}`} className="text-indigo-600 hover:underline font-medium">{CONTACT_EMAIL}</a>.
                    </div>
                </div>
            </div>
        </div>
    )
}
