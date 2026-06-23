import React from 'react'

export const LAST_UPDATED = 'June 23, 2026'
export const OWNER_NAME = 'M.S.F. Sajeefa'
export const CONTACT_EMAIL = 'geminilmsadmin@gmail.com'

export function Section({ title, children }) {
    return (
        <div className="mb-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">{title}</h3>
            <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-2">
                {children}
            </div>
        </div>
    )
}

export function TermsContent() {
    return (
        <>
            <Section title="1. Acceptance of Terms">
                <p>By accessing or using Gemini LMS ("the Platform"), you agree to be bound by these Terms & Conditions. If you do not agree, please discontinue use of the Platform.</p>
            </Section>
            <Section title="2. Account Responsibilities">
                <p>You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. Notify us immediately of any unauthorized use.</p>
            </Section>
            <Section title="3. Acceptable Use">
                <p>You agree not to misuse the Platform, including but not limited to: attempting unauthorized access, distributing malicious content, sharing assessment answers to undermine academic integrity, or reverse engineering any part of the Platform or its AI features.</p>
            </Section>
            <Section title="4. Subscriptions & Pricing">
                <p>Certain features require a paid subscription (Premium/Professional tiers) or consumption of credits. Current pricing for all plans is published on the Upgrade page and is processed securely through PayHere. Prices are listed in the applicable currency at checkout and may be updated from time to time; changes apply only to future billing cycles.</p>
            </Section>
            <Section title="5. Intellectual Property">
                <p>All software, branding, and course-generation technology on the Platform are the proprietary property of {OWNER_NAME}. Course content you generate for personal academic use remains yours to use for non-commercial study purposes.</p>
            </Section>
            <Section title="6. Termination">
                <p>We reserve the right to suspend or terminate accounts that violate these Terms, engage in fraudulent activity, or misuse the Platform's AI or assessment features.</p>
            </Section>
            <Section title="7. Limitation of Liability">
                <p>The Platform is provided "as is". We are not liable for any indirect, incidental, or consequential damages arising from use of the Platform, including AI-generated content inaccuracies.</p>
            </Section>
            <Section title="8. Changes to Terms">
                <p>These Terms may be updated periodically. Continued use of the Platform after changes are posted constitutes acceptance of the revised Terms.</p>
            </Section>
        </>
    )
}

export function PrivacyContent() {
    return (
        <>
            <Section title="1. Information We Collect">
                <p>We collect account information (name, email, profile details you provide), academic activity (courses, quizzes, assignments, progress), and usage data (login times, device/browser information) to operate and improve the Platform.</p>
            </Section>
            <Section title="2. How We Use Your Information">
                <p>Your data is used to deliver core LMS functionality, generate personalized AI course content, track academic progress, process payments, send important account notifications, and improve platform performance.</p>
            </Section>
            <Section title="3. Payment Information">
                <p>Payments are processed securely by PayHere, our third-party payment gateway. We do not store your full card or bank account details on our servers — payment data is handled directly by PayHere under its own security and compliance standards.</p>
            </Section>
            <Section title="4. Data Sharing">
                <p>We do not sell your personal data. Information may be shared with trusted service providers (e.g. authentication, PayHere for payment processing, AI infrastructure providers) strictly to operate the Platform, and only under confidentiality obligations.</p>
            </Section>
            <Section title="5. Data Security">
                <p>We apply industry-standard safeguards, including encrypted transport, access controls, and secure authentication (via Clerk), to protect your information from unauthorized access, alteration, or disclosure.</p>
            </Section>
            <Section title="6. Data Retention">
                <p>We retain account and academic records for as long as your account remains active, or as needed to comply with legal, academic record-keeping, or dispute-resolution obligations.</p>
            </Section>
            <Section title="7. Your Rights">
                <p>You may request access to, correction of, or deletion of your personal data by contacting us at {CONTACT_EMAIL}, subject to academic record retention requirements.</p>
            </Section>
            <Section title="8. Cookies & Tracking">
                <p>The Platform uses essential cookies and similar technologies required for authentication and session management. We do not use third-party advertising trackers.</p>
            </Section>
            <Section title="9. Changes to This Policy">
                <p>We may revise this Privacy Policy from time to time. Material changes will be communicated through the Platform or via email.</p>
            </Section>
        </>
    )
}

export function RefundContent() {
    return (
        <>
            <Section title="1. Eligibility for Refunds">
                <p>Refund requests for Premium or Professional subscription purchases made via PayHere may be submitted within 7 days of the original transaction date, provided the subscription benefits (e.g. unlimited course generation, premium credits) have not been substantially used.</p>
            </Section>
            <Section title="2. Non-Refundable Items">
                <p>Consumed AI credits, generated course content, completed assessments, and any usage-based charges already rendered are non-refundable once delivered.</p>
            </Section>
            <Section title="3. How to Request a Refund">
                <p>Send a refund request to {CONTACT_EMAIL} with your account email and PayHere order/transaction reference. Requests are typically reviewed within 3-5 business days.</p>
            </Section>
            <Section title="4. Processing Refunds">
                <p>Approved refunds are issued to the original payment method through PayHere and may take 5-10 business days to reflect, depending on your bank or card issuer.</p>
            </Section>
            <Section title="5. Subscription Cancellations">
                <p>You may cancel an active subscription at any time from the Upgrade/Subscription page. Cancellation stops future renewal charges but does not automatically trigger a refund for the current billing period unless eligible under Section 1.</p>
            </Section>
            <Section title="6. Disputed or Fraudulent Charges">
                <p>If you believe a charge was made in error or without authorization, contact us immediately at {CONTACT_EMAIL} before initiating a dispute with PayHere or your bank, so we can investigate and resolve the issue directly.</p>
            </Section>
        </>
    )
}
