import React from 'react'
import { BadgeDollarSign } from 'lucide-react'
import LegalPageShell from '../_components/legal/LegalPageShell'
import { RefundContent } from '../_components/legal/LegalContent'

export const metadata = {
    title: 'Refund Policy | Gemini LMS',
    description: 'Refund Policy for Gemini LMS subscriptions, processed via PayHere.',
}

export default function RefundPage() {
    return (
        <LegalPageShell icon={BadgeDollarSign} title="Refund Policy">
            <RefundContent />
        </LegalPageShell>
    )
}
