import React from 'react'
import { ShieldCheck } from 'lucide-react'
import LegalPageShell from '../_components/legal/LegalPageShell'
import { PrivacyContent } from '../_components/legal/LegalContent'

export const metadata = {
    title: 'Privacy Policy | Gemini LMS',
    description: 'Privacy Policy for Gemini LMS.',
}

export default function PrivacyPage() {
    return (
        <LegalPageShell icon={ShieldCheck} title="Privacy Policy">
            <PrivacyContent />
        </LegalPageShell>
    )
}
