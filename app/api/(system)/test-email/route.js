import { NextResponse } from 'next/server'
import { emailService } from '@/lib/emailService'

/**
 * Test endpoint for email templates
 * Usage: /api/test-email?template=welcome&email=test@example.com
 * 
 * Available templates:
 * - welcome
 * - enrollment
 * - certificate
 * - payment
 * - progress
 * - assignment
 * - cancellation
 */

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const template = searchParams.get('template') || 'welcome'
    const email = searchParams.get('email') || 'test@example.com'
    const isDev = process.env.NODE_ENV === 'development'

    // Only allow test endpoint in development
    if (!isDev && !process.env.ALLOW_TEST_EMAIL) {
      return NextResponse.json(
        { error: 'Test endpoint only available in development' },
        { status: 403 }
      )
    }

    const templates = {
      welcome: () => emailService.sendWelcomeEmail(email, 'Test User'),
      
      enrollment: () => emailService.sendCourseEnrollmentEmail(
        email,
        'Test User',
        'Advanced JavaScript',
        'John Instructor'
      ),
      
      certificate: () => emailService.sendCertificateEmail(
        email,
        'Test User',
        'Advanced JavaScript',
        `${process.env.NEXT_PUBLIC_APP_URL}/verify-certificate/CERT-TEST123`
      ),
      
      payment: () => emailService.sendPaymentConfirmationEmail(
        email,
        'Test User',
        '2,999',
        'PAY-TEST-123456',
        'credit-pack'
      ),
      
      progress: () => emailService.sendProgressReminderEmail(
        email,
        'Test User',
        'JavaScript Basics',
        {
          overallMastery: 75,
          topicsMastered: 5,
          topicsNeedingWork: 2,
          weakTopics: [
            {
              topicName: 'Async/Await',
              score: 45,
              recommendedDifficulty: 'Medium'
            }
          ],
          nextActionTopic: {
            topicName: 'Promises',
            recommendedDifficulty: 'Medium'
          }
        }
      ),
      
      assignment: () => emailService.sendAssignmentSubmissionEmail(
        email,
        'Test User',
        'Web Development',
        'Build a Todo App'
      ),
      
      cancellation: () => emailService.sendSubscriptionCancellationEmail(
        email,
        'Test User',
        2999,
        'Testing'
      )
    }

    if (!templates[template]) {
      return NextResponse.json(
        {
          error: 'Invalid template',
          available: Object.keys(templates),
          usage: '/api/test-email?template=welcome&email=test@example.com'
        },
        { status: 400 }
      )
    }

    // Send test email
    const result = await templates[template]()

    return NextResponse.json({
      success: true,
      message: `${template} email sent to ${email}`,
      template,
      email,
      result: {
        id: result?.data?.id || result?.id,
        status: 'sent'
      }
    })
  } catch (error) {
    console.error('Test email error:', error)
    return NextResponse.json(
      {
        error: error?.message || 'Failed to send test email',
        details: process.env.NODE_ENV === 'development' ? error.toString() : 'See server logs'
      },
      { status: 500 }
    )
  }
}
