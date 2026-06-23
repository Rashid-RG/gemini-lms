import nodemailer from 'nodemailer'
import React from 'react'
import { render } from '@react-email/render'

/**
 * Centralized Email Service
 * Handles all email sending with consistent formatting and error handling
 */
class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    })
    this.fromEmail = process.env.RESEND_FROM_EMAIL || process.env.SMTP_USER || 'noreply@geminilms.com'
    this.brandName = 'Gemini LMS'
  }

  /**
   * Send email with React component
   * @param {Object} options - Email options
   * @param {string} options.to - Recipient email
   * @param {string} options.subject - Email subject
   * @param {React.Component} options.component - React component to render
   * @param {string} options.from - Override sender email (optional)
   * @returns {Promise} Resend API response
   */
  async sendEmail({ to, subject, component: Component, from = this.fromEmail }) {
    try {
      if (!to) {
        throw new Error('Recipient email is required')
      }

      if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
        console.error('SMTP_USER or SMTP_PASSWORD is not configured')
        throw new Error('Email service not configured')
      }

      // Render React component to HTML string
      const html = await renderReactEmailComponent(Component)

      const result = await this.transporter.sendMail({
        from: `Gemini LMS <${from}>`,
        to: to,
        subject: subject,
        html: html
      })

      console.log(`Email sent to ${to}: ${result.messageId}`)
      return { data: { id: result.messageId } }
    } catch (error) {
      console.error('EmailService error:', {
        to,
        subject,
        error: error?.message
      })
      throw error
    }
  }

  /**
   * Send raw HTML email (for custom email template strings)
   * @param {Object} options - Email options
   * @param {string} options.to - Recipient email
   * @param {string} options.subject - Email subject
   * @param {string} options.html - Raw HTML string
   * @param {string} options.from - Override sender email (optional)
   * @returns {Promise} nodemailer sendMail response
   */
  async sendHtmlEmail({ to, subject, html, from = this.fromEmail }) {
    try {
      if (!to) {
        throw new Error('Recipient email is required')
      }

      if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
        console.error('SMTP_USER or SMTP_PASSWORD is not configured')
        throw new Error('Email service not configured')
      }

      const result = await this.transporter.sendMail({
        from: `Gemini LMS <${from}>`,
        to: to,
        subject: subject,
        html: html
      })

      console.log(`HTML Email sent to ${to}: ${result.messageId}`)
      return { data: { id: result.messageId } }
    } catch (error) {
      console.error('EmailService sendHtmlEmail error:', {
        to,
        subject,
        error: error?.message
      })
      throw error
    }
  }

  /**
   * Send welcome email to new user
   */
  async sendWelcomeEmail(email, firstName) {
    const { WelcomeEmail } = await import('@/components/emails/StandardTemplates')
    return this.sendEmail({
      to: email,
      subject: 'Welcome to Gemini LMS! 🎓',
      component: <WelcomeEmail firstName={firstName} />
    })
  }

  /**
   * Send course enrollment confirmation
   */
  async sendCourseEnrollmentEmail(email, firstName, courseName, instructorName) {
    const { CourseEnrollmentEmail } = await import('@/components/emails/StandardTemplates')
    return this.sendEmail({
      to: email,
      subject: `Welcome to ${courseName}! 🎓`,
      component: (
        <CourseEnrollmentEmail 
          firstName={firstName}
          courseName={courseName}
          instructorName={instructorName}
        />
      )
    })
  }

  /**
   * Send certificate earned email
   */
  async sendCertificateEmail(email, firstName, courseName, certificateUrl) {
    const { CertificateEarnedEmail } = await import('@/components/emails/StandardTemplates')
    return this.sendEmail({
      to: email,
      subject: `🏆 Certificate Earned for ${courseName}!`,
      component: (
        <CertificateEarnedEmail 
          firstName={firstName}
          courseName={courseName}
          certificateUrl={certificateUrl}
        />
      )
    })
  }

  /**
   * Send payment confirmation email
   */
  async sendPaymentConfirmationEmail(email, firstName, amount, transactionId, purchaseType = 'credit-pack') {
    const { PaymentConfirmationEmail } = await import('@/components/emails/StandardTemplates')
    return this.sendEmail({
      to: email,
      subject: 'Payment Confirmation - Thank You! 💳',
      component: (
        <PaymentConfirmationEmail 
          firstName={firstName}
          amount={amount}
          transactionId={transactionId}
          purchaseType={purchaseType}
          purchaseDescription={purchaseType === 'subscription' ? 'Premium Membership' : 'Course Credits'}
        />
      )
    })
  }

  /**
   * Send weekly progress reminder
   */
  async sendProgressReminderEmail(email, studentName, courseName, stats) {
    const { ProgressReminderEmail } = await import('@/components/emails/ProgressReminderEmail')
    return this.sendEmail({
      to: email,
      subject: `📊 Your Weekly Progress Summary - ${courseName}`,
      component: (
        <ProgressReminderEmail 
          studentName={studentName}
          courseName={courseName}
          overallMastery={stats.overallMastery}
          topicsMastered={stats.topicsMastered}
          topicsNeedingWork={stats.topicsNeedingWork}
          weakTopics={stats.weakTopics}
          nextActionTopic={stats.nextActionTopic}
        />
      )
    })
  }

  /**
   * Send assignment submission confirmation
   */
  async sendAssignmentSubmissionEmail(email, firstName, courseName, assignmentTitle) {
    const { AssignmentSubmissionEmail } = await import('@/components/emails/StandardTemplates')
    return this.sendEmail({
      to: email,
      subject: `📝 Assignment Submitted - ${assignmentTitle}`,
      component: (
        <AssignmentSubmissionEmail 
          firstName={firstName}
          courseName={courseName}
          assignmentTitle={assignmentTitle}
        />
      )
    })
  }

  /**
   * Send subscription cancellation email
   */
  async sendSubscriptionCancellationEmail(email, firstName, refundAmount, reason) {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
          body { 
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
            line-height: 1.6; 
            color: #334155; 
            background-color: #f8fafc;
            padding: 40px 20px;
            margin: 0;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background-color: #ffffff;
            border-radius: 16px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.02), 0 8px 10px -6px rgba(0, 0, 0, 0.03);
            border: 1px solid #f1f5f9;
            overflow: hidden;
          }
          .header { 
            background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #311042 100%); 
            color: white; 
            padding: 35px 24px; 
            text-align: center; 
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 700;
            letter-spacing: -0.5px;
          }
          .header p {
            margin: 8px 0 0 0;
            font-size: 14px;
            color: #cbd5e1;
          }
          .content { padding: 40px 32px; }
          .footer { 
            background-color: #f8fafc; 
            padding: 30px 24px; 
            text-align: center; 
            border-top: 1px solid #f1f5f9; 
            font-size: 13px; 
            color: #64748b; 
          }
          .footer a {
            color: #4f46e5;
            text-decoration: none;
          }
          .section { 
            margin: 20px 0; 
            padding: 24px; 
            background-color: #f8fafc; 
            border: 1px solid #e2e8f0;
            border-left: 4px solid #4f46e5; 
            border-radius: 12px; 
            box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.01);
          }
          .section h3 {
            margin: 0 0 12px 0;
            font-size: 15px;
            font-weight: 700;
            color: #0f172a;
          }
          .amount { font-size: 26px; font-weight: 800; color: #10b981; letter-spacing: -0.5px; }
          .button { 
            display: inline-block; 
            padding: 14px 28px; 
            background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); 
            color: white !important; 
            text-decoration: none; 
            border-radius: 10px; 
            font-weight: 600;
            font-size: 14px;
            margin: 12px 0;
            box-shadow: 0 4px 12px rgba(79, 70, 229, 0.15);
          }
          ul {
            margin: 10px 0;
            padding-left: 20px;
          }
          li {
            margin-bottom: 8px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div style="font-size: 22px; font-weight: 700; letter-spacing: -0.5px; color: #ffffff; margin-bottom: 12px;">
              <span style="color: #a78bfa; font-weight: 800;">Gemini</span><span style="color: #ffffff; font-weight: 300;"> LMS</span>✨
            </div>
            <h1>Subscription Cancelled</h1>
            <p>We've processed your cancellation request</p>
          </div>
          <div class="content">
            <p style="font-size: 16px; margin: 0 0 20px 0;">Hi <strong>${firstName}</strong>,</p>
            <p style="font-size: 14px; margin: 0 0 20px 0;">Your premium membership has been successfully cancelled. Here are your transaction details:</p>
            
            <div class="section" style="border-left-color: #64748b;">
              <h3>Cancellation Details</h3>
              <p style="margin: 6px 0;"><strong>Cancellation Date:</strong> ${new Date().toLocaleDateString()}</p>
              <p style="margin: 6px 0;"><strong>Status:</strong> Premium membership removed</p>
              ${reason ? `<p style="margin: 6px 0;"><strong>Your Feedback:</strong> "${reason}"</p>` : ''}
            </div>

            <div class="section" style="border-left-color: #10b981; background-color: #f0fdf4; border-color: #bbf7d0;">
              <h3 style="color: #14532d;">Refund Information</h3>
              <p style="margin: 6px 0; color: #14532d;">Refund Amount: <span class="amount">Rs. ${refundAmount}</span></p>
              <p style="margin: 6px 0; color: #14532d;"><strong>Status:</strong> Full refund processed</p>
              <p style="margin: 10px 0 0 0; font-size: 13px; color: #15803d;">The refund will be credited to your original payment method within 3-5 business days.</p>
            </div>

            <div class="section" style="border-left-color: #3b82f6;">
              <h3>What's Next?</h3>
              <p style="margin: 0 0 10px 0;">Your course creation credits have been reset. You can still:</p>
              <ul style="color: #475569; font-size: 13px;">
                <li>View and access all your completed courses</li>
                <li>Purchase credit packs to generate new courses</li>
                <li>Upgrade back to premium membership at any time</li>
              </ul>
            </div>

            <div style="text-align: center; margin: 25px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://geminilms.com'}/dashboard" class="button">Go to Dashboard</a>
            </div>

            <p style="font-size: 14px; margin: 20px 0 0 0; color: #64748b;">
              If you have any questions, please feel free to <a href="mailto:support@geminilms.com" style="color: #4f46e5; text-decoration: none;">contact support</a>.
            </p>
            <p style="font-size: 14px; margin: 15px 0 0 0; color: #94a3b8;">
              We hope to see you again!<br />
              The Gemini LMS Team
            </p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Gemini LMS. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `

    return this.transporter.sendMail({
      from: `Gemini LMS <${this.fromEmail}>`,
      to: email,
      subject: 'Subscription Cancelled - Refund Processed',
      html: htmlContent
    })
  }

  /**
   * Send course pending review notification email to admins and tutors
   */
  async sendPendingReviewNotificationEmail(email, adminName, courseTopic, creatorEmail, courseId) {
    const { CoursePendingReviewEmail } = await import('@/components/emails/StandardTemplates')
    return this.sendEmail({
      to: email,
      subject: `⏳ Review Required: New Course Pending Approval - ${courseTopic}`,
      component: (
        <CoursePendingReviewEmail 
          adminName={adminName}
          courseTopic={courseTopic}
          creatorEmail={creatorEmail}
          courseId={courseId}
        />
      )
    })
  }
}

/**
 * Helper function to render React component to HTML string
 * Uses the @react-email/render library for maximum compatibility
 */
async function renderReactEmailComponent(Component) {
  try {
    const html = await render(Component)
    return html
  } catch (error) {
    console.error('Component rendering error:', error)
    return ''
  }
}

// Export singleton instance
export const emailService = new EmailService()

// Also export the class for testing
export default EmailService
