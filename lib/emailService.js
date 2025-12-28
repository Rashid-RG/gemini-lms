import { Resend } from 'resend'
import React from 'react'

/**
 * Centralized Email Service
 * Handles all email sending with consistent formatting and error handling
 */
class EmailService {
  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY)
    this.fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@geminilms.com'
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

      if (!process.env.RESEND_API_KEY) {
        console.error('RESEND_API_KEY is not configured')
        throw new Error('Email service not configured')
      }

      // Render React component to HTML string
      // Note: In production, use a library like @react-email/render
      const html = renderReactEmailComponent(Component)

      const result = await this.resend.emails.send({
        from: from,
        to: to,
        subject: subject,
        html: html
      })

      if (result.error) {
        console.error('Email send failed:', result.error)
        throw new Error(result.error.message || 'Failed to send email')
      }

      console.log(`Email sent to ${to}: ${result.data?.id}`)
      return result
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
   * Send welcome email to new user
   */
  async sendWelcomeEmail(email, firstName) {
    const { WelcomeEmail } = await import('./StandardTemplates')
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
    const { CourseEnrollmentEmail } = await import('./StandardTemplates')
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
    const { CertificateEarnedEmail } = await import('./StandardTemplates')
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
    const { PaymentConfirmationEmail } = await import('./StandardTemplates')
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
    const { ProgressReminderEmail } = await import('./ProgressReminderEmail')
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
    const { AssignmentSubmissionEmail } = await import('./StandardTemplates')
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
          body { font-family: "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 0; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; }
          .content { padding: 30px 20px; background: white; }
          .footer { background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
          .section { margin: 20px 0; padding: 15px; background: #f9fafb; border-left: 4px solid #667eea; border-radius: 4px; }
          .amount { font-size: 24px; font-weight: bold; color: #27ae60; }
          .button { display: inline-block; padding: 10px 20px; background: #667eea; color: white; text-decoration: none; border-radius: 4px; margin-top: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Subscription Cancelled</h1>
            <p>We've processed your cancellation request</p>
          </div>
          <div class="content">
            <p>Hi <strong>${firstName}</strong>,</p>
            <p>Your premium membership has been successfully cancelled. Here are the details:</p>
            
            <div class="section">
              <h3>Cancellation Details</h3>
              <p><strong>Cancellation Date:</strong> ${new Date().toLocaleDateString()}</p>
              <p><strong>Status:</strong> Premium membership removed</p>
              ${reason ? `<p><strong>Your Feedback:</strong> "${reason}"</p>` : ''}
            </div>

            <div class="section">
              <h3>Refund Information</h3>
              <p>Refund Amount: <span class="amount">Rs. ${refundAmount}</span></p>
              <p><strong>Status:</strong> Full refund processed</p>
              <p>The refund will be credited to your original payment method within 3-5 business days.</p>
            </div>

            <div class="section">
              <h3>What's Next?</h3>
              <p>Your course creation credits have been reset. You can still:</p>
              <ul>
                <li>View and access your completed courses</li>
                <li>Purchase credit packs to create new courses</li>
                <li>Upgrade back to premium membership anytime</li>
              </ul>
            </div>

            <p>If you have questions, please <a href="mailto:support@geminilms.com">contact support</a>.</p>
            <p>We hope to see you again!</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Gemini LMS. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `

    return this.resend.emails.send({
      from: this.fromEmail,
      to: email,
      subject: 'Subscription Cancelled - Refund Processed',
      html: htmlContent
    })
  }
}

/**
 * Helper function to render React component to HTML string
 * In production, you should use @react-email/render library
 * This is a simplified version for basic rendering
 */
function renderReactEmailComponent(Component) {
  // For now, we'll return the component as JSX
  // In production, use ReactDOMServer.renderToStaticMarkup()
  // or @react-email/render for better email compatibility
  
  try {
    // Try to render if it's a function component
    if (typeof Component === 'function') {
      const rendered = Component({})
      if (rendered && typeof rendered === 'string') {
        return rendered
      }
    }
    
    // Fallback: convert to string representation
    return Component.toString ? Component.toString() : ''
  } catch (error) {
    console.error('Component rendering error:', error)
    return ''
  }
}

// Export singleton instance
export const emailService = new EmailService()

// Also export the class for testing
export default EmailService
