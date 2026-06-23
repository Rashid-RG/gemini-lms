import React from 'react'
import { FileText } from 'lucide-react'
import LegalPageShell from '../_components/legal/LegalPageShell'
import { TermsContent } from '../_components/legal/LegalContent'

export const metadata = {
    title: 'Terms & Conditions | Gemini LMS',
    description: 'Terms and Conditions for using Gemini LMS.',
}

export default function TermsPage() {
    return (
        <LegalPageShell icon={FileText} title="Terms & Conditions">
            <TermsContent />
        </LegalPageShell>
    )
}
