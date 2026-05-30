/**
 * IMPLEMENTATION EXAMPLES
 * 
 * This file shows how to integrate the new professional email templates
 * into your existing API endpoints and Inngest functions.
 * 
 * Copy and adapt these patterns to your codebase.
 */

// ============================================================================
// EXAMPLE 1: Update Payment Webhook Endpoint
// ============================================================================

// File: /app/api/payment/webhook/route.js

import { NextResponse } from 'next/server'
import { db } from '@/configs/db'
import { PAYMENT_RECORD_TABLE, USER_TABLE } from '@/configs/schema'
import { eq } from 'drizzle-orm'
import { emailService } from '@/lib/emailService' // NEW
import inngest from '@/inngest/client'

export async function POST(req) {
  try {
    const body = await req.json()
    const { merchant_id, order_id, status, amount, transaction_id } = body

    // Verify payment and update database
    const payment = await db
      .update(PAYMENT_RECORD_TABLE)
      .set({ status: 'completed' })
      .where(eq(PAYMENT_RECORD_TABLE.paymentId, transaction_id))
      .returning()

    // Get user details
    const user = await db
      .select()
      .from(USER_TABLE)
      .where(eq(USER_TABLE.id, payment[0].userId))

    // BEFORE: Plain text email
    // const html = `<html><p>Payment confirmed for ${amount}</p></html>`
    // const res = await resend.emails.send({...})

    // AFTER: Professional template using emailService
    await emailService.sendPaymentConfirmationEmail(
      user[0].email,
      user[0].firstName || 'User',
      amount,
      transaction_id,
      payment[0].paymentType // 'credit-pack' or 'subscription'
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// ============================================================================
// EXAMPLE 2: Update Certificate Generation Endpoint
// ============================================================================

// File: /app/api/generate-certificate/route.js

import { NextResponse } from 'next/server'
import { db } from '@/configs/db'
import { STUDY_MATERIAL_TABLE, USER_TABLE } from '@/configs/schema'
import { eq } from 'drizzle-orm'
import { emailService } from '@/lib/emailService' // NEW

export async function POST(req) {
  try {
    const { courseId, userId } = await req.json()

    // Generate certificate logic...
    const certificateId = 'CERT-' + Math.random().toString(36).substr(2, 9)
    const certificateUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-certificate/${certificateId}`

    // Get user and course info
    const user = await db
      .select()
      .from(USER_TABLE)
      .where(eq(USER_TABLE.id, userId))

    const course = await db
      .select()
      .from(STUDY_MATERIAL_TABLE)
      .where(eq(STUDY_MATERIAL_TABLE.id, courseId))

    // Send certificate email using new template
    await emailService.sendCertificateEmail(
      user[0].email,
      user[0].firstName || 'User',
      course[0].courseName,
      certificateUrl
    )

    return NextResponse.json({
      success: true,
      certificateUrl,
      certificateId
    })
  } catch (error) {
    console.error('Certificate error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// ============================================================================
// EXAMPLE 3: Update Inngest Function - Weekly Progress Reminders
// ============================================================================

// File: /inngest/functions.js - SendWeeklyProgressReminders function

import { inngest } from '@/inngest/client'
import { db } from '@/configs/db'
import { USER_TABLE, STUDY_MATERIAL_TABLE } from '@/configs/schema'
import { emailService } from '@/lib/emailService' // NEW

export const SendWeeklyProgressReminders = inngest.createFunction(
  { id: 'send-weekly-reminders' },
  { cron: '0 9 * * 1' }, // Every Monday at 9 AM
  async ({ step }) => {
    // Get users with progress reminders enabled
    const users = await step.run('fetch-users', async () => {
      return await db
        .select()
        .from(USER_TABLE)
        .where(eq(USER_TABLE.progressReminders, true))
    })

    let sent = 0
    const failures = []

    for (const user of users) {
      try {
        // Get user's enrolled courses
        const courses = await step.run(`fetch-courses-${user.id}`, async () => {
          return await db
            .select()
            .from(STUDY_MATERIAL_TABLE)
            .where(eq(STUDY_MATERIAL_TABLE.userId, user.id))
        })

        // Send reminder for each course
        for (const course of courses) {
          // Calculate stats (simplified example)
          const stats = {
            overallMastery: 75,
            topicsMastered: 8,
            topicsNeedingWork: 3,
            weakTopics: [
              {
                topicName: 'Advanced Topics',
                score: 45,
                recommendedDifficulty: 'Medium'
              }
            ],
            nextActionTopic: {
              topicName: 'Callbacks & Promises',
              recommendedDifficulty: 'Medium',
              suggestion: 'Review promise chaining to improve your skills'
            }
          }

          // BEFORE: Inline HTML email rendering
          // const html = `<html>...</html>`
          // const res = await resend.emails.send({...})

          // AFTER: Use professional template service
          await step.run(`send-email-${user.id}-${course.id}`, async () => {
            return await emailService.sendProgressReminderEmail(
              user.email,
              user.firstName || 'Student',
              course.courseName,
              stats
            )
          })

          sent++
        }
      } catch (err) {
        console.error('Progress reminder error:', {
          userId: user.id,
          error: err?.message
        })
        failures.push({
          userId: user.id,
          error: err?.message
        })
      }
    }

    return { sent, attempted: users.length, failures }
  }
)

// ============================================================================
// EXAMPLE 4: Update User Creation - Send Welcome Email
// ============================================================================

// File: /inngest/functions.js - CreateNewUser function

export const CreateNewUser = inngest.createFunction(
  { id: 'create-new-user' },
  { event: 'user.create' },
  async ({ event, step }) => {
    const { email, firstName, userId } = event.data

    try {
      // Create user in database...
      const result = await step.run('create-db-user', async () => {
        return await db.insert(USER_TABLE).values({
          id: userId,
          email,
          firstName,
          createdAt: new Date()
        })
      })

      // BEFORE: No welcome email
      // (User created but no onboarding email sent)

      // AFTER: Send professional welcome email
      await step.run('send-welcome-email', async () => {
        return await emailService.sendWelcomeEmail(email, firstName)
      })

      console.log('New user created and welcome email sent:', email)
      return { success: true }
    } catch (err) {
      console.error('CreateNewUser error:', err)
      throw err
    }
  }
)

// ============================================================================
// EXAMPLE 5: Update Course Enrollment Endpoint
// ============================================================================

// File: /app/api/enroll/route.js

import { NextResponse } from 'next/server'
import { db } from '@/configs/db'
import { ENROLLMENT_TABLE, USER_TABLE, STUDY_MATERIAL_TABLE } from '@/configs/schema'
import { emailService } from '@/lib/emailService' // NEW

export async function POST(req) {
  try {
    const { userId, courseId } = await req.json()

    // Create enrollment record
    await db.insert(ENROLLMENT_TABLE).values({
      userId,
      courseId,
      enrolledAt: new Date()
    })

    // Get user details
    const user = await db
      .select()
      .from(USER_TABLE)
      .where(eq(USER_TABLE.id, userId))

    // Get course details
    const course = await db
      .select()
      .from(STUDY_MATERIAL_TABLE)
      .where(eq(STUDY_MATERIAL_TABLE.id, courseId))

    // Send enrollment confirmation email
    await emailService.sendCourseEnrollmentEmail(
      user[0].email,
      user[0].firstName || 'Student',
      course[0].courseName,
      course[0].instructorName || 'Instructor'
    )

    return NextResponse.json({
      success: true,
      message: 'Enrollment successful. Check your email for details.'
    })
  } catch (error) {
    console.error('Enrollment error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// ============================================================================
// EXAMPLE 6: Add Test Endpoint for Email Templates
// ============================================================================

// File: /app/api/test-email/route.js (For development only)

import { NextResponse } from 'next/server'
import { emailService } from '@/lib/emailService'

export async function GET(req) {
  try {
    const { template, email = 'test@example.com' } = req.nextUrl.searchParams

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
        'https://example.com/cert.pdf'
      ),
      payment: () => emailService.sendPaymentConfirmationEmail(
        email,
        'Test User',
        '2,999',
        'TXN-123456',
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
          weakTopics: [],
          nextActionTopic: null
        }
      )
    }

    if (!templates[template]) {
      return NextResponse.json(
        { error: 'Invalid template. Available: ' + Object.keys(templates).join(', ') },
        { status: 400 }
      )
    }

    await templates[template]()

    return NextResponse.json({
      success: true,
      message: `${template} email sent to ${email}`
    })
  } catch (error) {
    console.error('Test email error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// ============================================================================
// USAGE IN DEVELOPMENT
// ============================================================================

/*
Test emails without sending real emails:

1. http://localhost:3000/api/test-email?template=welcome&email=test@example.com
2. http://localhost:3000/api/test-email?template=payment&email=user@example.com
3. http://localhost:3000/api/test-email?template=certificate

Check Resend dashboard for sent emails and test rendering across email clients.
*/
