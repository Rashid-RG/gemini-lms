import React from 'react'
import { EmailLayout, EmailSection, EmailButton, StatCard, StatsRow } from './EmailLayout'

/**
 * Welcome Email - Sent when user signs up
 */
export const WelcomeEmail = ({ 
  firstName = 'Student',
  enrollmentDate = new Date().toLocaleDateString()
}) => {
  return (
    <EmailLayout preheader="Welcome to Gemini LMS - Start Your Learning Journey">
      <div style={{ color: '#1f2937', lineHeight: '1.6' }}>
        <p style={{ fontSize: '16px', margin: '0 0 15px 0' }}>
          Hi <strong>{firstName}</strong>,
        </p>

        <p style={{ fontSize: '14px', margin: '0 0 15px 0' }}>
          Welcome to <strong>Gemini LMS</strong>! 🎉
        </p>

        <p style={{ fontSize: '14px', margin: '0 0 15px 0' }}>
          You're now part of our learning community. We're excited to help you achieve your educational goals with AI-powered personalized learning.
        </p>

        <EmailSection 
          title="What You Can Do Now" 
          icon="🚀"
          backgroundColor="#ecfdf5"
          borderColor="#10b981"
        >
          <ul style={{ margin: '10px 0', paddingLeft: '20px', color: '#1f2937', fontSize: '14px' }}>
            <li style={{ marginBottom: '8px' }}>Browse and enroll in courses designed for your level</li>
            <li style={{ marginBottom: '8px' }}>Generate personalized study materials with AI</li>
            <li style={{ marginBottom: '8px' }}>Track your learning progress in real-time</li>
            <li style={{ marginBottom: '8px' }}>Take quizzes and earn certificates</li>
          </ul>
        </EmailSection>

        <EmailSection 
          title="Getting Started Tips" 
          icon="💡"
          backgroundColor="#fef3c7"
          borderColor="#f59e0b"
        >
          <ol style={{ margin: '10px 0', paddingLeft: '20px', color: '#1f2937', fontSize: '14px' }}>
            <li style={{ marginBottom: '8px' }}>Complete your profile with your learning interests</li>
            <li style={{ marginBottom: '8px' }}>Choose a course that matches your goals</li>
            <li style={{ marginBottom: '8px' }}>Generate your first study material</li>
            <li style={{ marginBottom: '8px' }}>Enable progress reminders to stay consistent</li>
          </ol>
        </EmailSection>

        <div style={{ textAlign: 'center', margin: '25px 0' }}>
          <EmailButton 
            href={`${process.env.NEXT_PUBLIC_APP_URL}/dashboard`}
            text="Go to Dashboard"
          />
        </div>

        <EmailSection 
          title="Need Help?" 
          icon="❓"
          backgroundColor="#f0f9ff"
          borderColor="#0284c7"
        >
          <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#1f2937' }}>
            Our support team is here to help you succeed. Check out our:
          </p>
          <ul style={{ margin: '10px 0', paddingLeft: '20px', color: '#1f2937', fontSize: '14px' }}>
            <li style={{ marginBottom: '5px' }}>
              <a href={`${process.env.NEXT_PUBLIC_APP_URL}/help`} style={{ color: '#0284c7', textDecoration: 'none' }}>
                Help Center
              </a>
            </li>
            <li>
              <a href="mailto:support@geminilms.com" style={{ color: '#0284c7', textDecoration: 'none' }}>
                Contact Support
              </a>
            </li>
          </ul>
        </EmailSection>

        <p style={{ fontSize: '14px', margin: '15px 0 0 0', color: '#6b7280' }}>
          Happy learning!<br />
          The Gemini LMS Team
        </p>
      </div>
    </EmailLayout>
  )
}

/**
 * Course Enrollment Confirmation
 */
export const CourseEnrollmentEmail = ({ 
  firstName = 'Student',
  courseName = 'Your Course',
  instructorName = 'Instructor',
  startDate = new Date().toLocaleDateString()
}) => {
  return (
    <EmailLayout preheader={`Successfully enrolled in ${courseName}`}>
      <div style={{ color: '#1f2937', lineHeight: '1.6' }}>
        <p style={{ fontSize: '16px', margin: '0 0 15px 0' }}>
          Hi <strong>{firstName}</strong>,
        </p>

        <p style={{ fontSize: '14px', margin: '0 0 15px 0' }}>
          Congratulations! 🎓 You've successfully enrolled in <strong>{courseName}</strong>.
        </p>

        <EmailSection title="Course Details" icon="📚">
          <table style={{ width: '100%', fontSize: '14px', color: '#1f2937' }}>
            <tbody>
              <tr>
                <td style={{ padding: '8px 0', fontWeight: '500' }}>Course Name:</td>
                <td style={{ padding: '8px 0', textAlign: 'right' }}>{courseName}</td>
              </tr>
              <tr style={{ borderTop: '1px solid #e5e7eb' }}>
                <td style={{ padding: '8px 0', fontWeight: '500' }}>Instructor:</td>
                <td style={{ padding: '8px 0', textAlign: 'right' }}>{instructorName}</td>
              </tr>
              <tr style={{ borderTop: '1px solid #e5e7eb' }}>
                <td style={{ padding: '8px 0', fontWeight: '500' }}>Start Date:</td>
                <td style={{ padding: '8px 0', textAlign: 'right' }}>{startDate}</td>
              </tr>
            </tbody>
          </table>
        </EmailSection>

        <EmailSection 
          title="Next Steps" 
          icon="👉"
          backgroundColor="#ecfdf5"
          borderColor="#10b981"
        >
          <ol style={{ margin: '10px 0', paddingLeft: '20px', color: '#1f2937', fontSize: '14px' }}>
            <li style={{ marginBottom: '8px' }}>Access your course from the dashboard</li>
            <li style={{ marginBottom: '8px' }}>Review the course syllabus and schedule</li>
            <li style={{ marginBottom: '8px' }}>Generate personalized study materials</li>
            <li style={{ marginBottom: '8px' }}>Start learning at your own pace</li>
          </ol>
        </EmailSection>

        <div style={{ textAlign: 'center', margin: '25px 0' }}>
          <EmailButton 
            href={`${process.env.NEXT_PUBLIC_APP_URL}/course/start`}
            text="Access Course"
          />
        </div>

        <p style={{ fontSize: '14px', margin: '15px 0 0 0', color: '#6b7280' }}>
          Questions? Contact your instructor or reach out to support at <a href="mailto:support@geminilms.com" style={{ color: '#667eea', textDecoration: 'none' }}>support@geminilms.com</a>
        </p>
      </div>
    </EmailLayout>
  )
}

/**
 * Certificate Earned Email
 */
export const CertificateEarnedEmail = ({ 
  firstName = 'Student',
  courseName = 'Your Course',
  completionDate = new Date().toLocaleDateString(),
  certificateUrl = '#'
}) => {
  return (
    <EmailLayout preheader={`You've earned a certificate for ${courseName}!`}>
      <div style={{ color: '#1f2937', lineHeight: '1.6' }}>
        <p style={{ fontSize: '16px', margin: '0 0 15px 0' }}>
          Congratulations, <strong>{firstName}</strong>! 🏆
        </p>

        <p style={{ fontSize: '14px', margin: '0 0 15px 0' }}>
          You have successfully completed <strong>{courseName}</strong> and earned your certificate of completion!
        </p>

        <EmailSection 
          title="Achievement Unlocked" 
          icon="⭐"
          backgroundColor="#fef3c7"
          borderColor="#f59e0b"
        >
          <p style={{ margin: '10px 0', fontSize: '14px', color: '#1f2937' }}>
            This is a major milestone in your learning journey. Your dedication and hard work have paid off!
          </p>
          <div style={{ marginTop: '15px', padding: '12px', backgroundColor: '#fffbeb', borderRadius: '4px', fontSize: '13px', color: '#92400e' }}>
            <strong>Completion Date:</strong> {completionDate}
          </div>
        </EmailSection>

        <EmailSection 
          title="What's Next?" 
          icon="🚀"
          backgroundColor="#ecfdf5"
          borderColor="#10b981"
        >
          <ul style={{ margin: '10px 0', paddingLeft: '20px', color: '#1f2937', fontSize: '14px' }}>
            <li style={{ marginBottom: '8px' }}>Download and share your certificate</li>
            <li style={{ marginBottom: '8px' }}>Add it to your LinkedIn profile</li>
            <li style={{ marginBottom: '8px' }}>Explore more courses to continue learning</li>
            <li>Challenge yourself with advanced courses</li>
          </ul>
        </EmailSection>

        <div style={{ textAlign: 'center', margin: '25px 0' }}>
          <EmailButton 
            href={certificateUrl}
            text="View Your Certificate"
          />
          <br />
          <EmailButton 
            href={`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/certificates`}
            text="View All Certificates"
            variant="secondary"
          />
        </div>

        <p style={{ fontSize: '14px', margin: '15px 0 0 0', color: '#6b7280' }}>
          Keep learning and growing! Explore more courses on your dashboard.
        </p>
      </div>
    </EmailLayout>
  )
}

/**
 * Payment Confirmation Email
 */
export const PaymentConfirmationEmail = ({ 
  firstName = 'Student',
  amount = '0',
  currency = 'PKR',
  transactionId = 'TXN-000',
  purchaseType = 'credit-pack', // or 'subscription'
  purchaseDescription = 'Credits Package',
  purchaseDate = new Date().toLocaleDateString()
}) => {
  return (
    <EmailLayout preheader="Payment Confirmation - Thank You!">
      <div style={{ color: '#1f2937', lineHeight: '1.6' }}>
        <p style={{ fontSize: '16px', margin: '0 0 15px 0' }}>
          Hi <strong>{firstName}</strong>,
        </p>

        <p style={{ fontSize: '14px', margin: '0 0 15px 0' }}>
          Thank you for your payment! We've successfully received your transaction.
        </p>

        <EmailSection title="Payment Details" icon="💳">
          <table style={{ width: '100%', fontSize: '14px', color: '#1f2937' }}>
            <tbody>
              <tr>
                <td style={{ padding: '10px 0', fontWeight: '500' }}>Transaction ID:</td>
                <td style={{ padding: '10px 0', textAlign: 'right', fontFamily: 'monospace', backgroundColor: '#f3f4f6', padding: '8px 12px', borderRadius: '4px' }}>{transactionId}</td>
              </tr>
              <tr style={{ borderTop: '1px solid #e5e7eb' }}>
                <td style={{ padding: '10px 0', fontWeight: '500' }}>Description:</td>
                <td style={{ padding: '10px 0', textAlign: 'right' }}>{purchaseDescription}</td>
              </tr>
              <tr style={{ borderTop: '1px solid #e5e7eb' }}>
                <td style={{ padding: '10px 0', fontWeight: '500' }}>Date:</td>
                <td style={{ padding: '10px 0', textAlign: 'right' }}>{purchaseDate}</td>
              </tr>
              <tr style={{ borderTop: '2px solid #e5e7eb', backgroundColor: '#f0f9ff' }}>
                <td style={{ padding: '12px 0', fontWeight: '600', fontSize: '16px' }}>Total Amount:</td>
                <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: '600', fontSize: '16px', color: '#0284c7' }}>
                  {currency} {amount}
                </td>
              </tr>
            </tbody>
          </table>
        </EmailSection>

        <EmailSection 
          title="What's Next?" 
          icon="✅"
          backgroundColor="#ecfdf5"
          borderColor="#10b981"
        >
          {purchaseType === 'credit-pack' ? (
            <p style={{ margin: '10px 0', fontSize: '14px', color: '#1f2937' }}>
              Your credits have been added to your account. Visit your dashboard to start creating personalized study materials.
            </p>
          ) : (
            <p style={{ margin: '10px 0', fontSize: '14px', color: '#1f2937' }}>
              Your premium membership is now active! Enjoy unlimited course creation and exclusive features.
            </p>
          )}
        </EmailSection>

        <div style={{ textAlign: 'center', margin: '25px 0' }}>
          <EmailButton 
            href={`${process.env.NEXT_PUBLIC_APP_URL}/dashboard`}
            text="Go to Dashboard"
          />
        </div>

        <EmailSection 
          title="Have Questions?" 
          icon="❓"
          backgroundColor="#f0f9ff"
          borderColor="#0284c7"
        >
          <p style={{ margin: '0', fontSize: '14px', color: '#1f2937' }}>
            For invoice and payment history, visit your <a href={`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`} style={{ color: '#0284c7', textDecoration: 'none' }}>billing page</a> or contact <a href="mailto:support@geminilms.com" style={{ color: '#0284c7', textDecoration: 'none' }}>support@geminilms.com</a>
          </p>
        </EmailSection>

        <p style={{ fontSize: '14px', margin: '15px 0 0 0', color: '#6b7280' }}>
          Thank you for supporting Gemini LMS!<br />
          The Gemini LMS Team
        </p>
      </div>
    </EmailLayout>
  )
}

/**
 * Assignment Submission Confirmation
 */
export const AssignmentSubmissionEmail = ({ 
  firstName = 'Student',
  courseName = 'Your Course',
  assignmentTitle = 'Assignment',
  submissionDate = new Date().toLocaleDateString(),
  dueDate = new Date(Date.now() + 7*24*60*60*1000).toLocaleDateString()
}) => {
  return (
    <EmailLayout preheader="Assignment Submitted Successfully">
      <div style={{ color: '#1f2937', lineHeight: '1.6' }}>
        <p style={{ fontSize: '16px', margin: '0 0 15px 0' }}>
          Hi <strong>{firstName}</strong>,
        </p>

        <p style={{ fontSize: '14px', margin: '0 0 15px 0' }}>
          Your assignment has been successfully submitted! ✓
        </p>

        <EmailSection title="Submission Details" icon="📝">
          <table style={{ width: '100%', fontSize: '14px', color: '#1f2937' }}>
            <tbody>
              <tr>
                <td style={{ padding: '8px 0', fontWeight: '500' }}>Course:</td>
                <td style={{ padding: '8px 0', textAlign: 'right' }}>{courseName}</td>
              </tr>
              <tr style={{ borderTop: '1px solid #e5e7eb' }}>
                <td style={{ padding: '8px 0', fontWeight: '500' }}>Assignment:</td>
                <td style={{ padding: '8px 0', textAlign: 'right' }}>{assignmentTitle}</td>
              </tr>
              <tr style={{ borderTop: '1px solid #e5e7eb' }}>
                <td style={{ padding: '8px 0', fontWeight: '500' }}>Submitted:</td>
                <td style={{ padding: '8px 0', textAlign: 'right' }}>{submissionDate}</td>
              </tr>
              <tr style={{ borderTop: '1px solid #e5e7eb' }}>
                <td style={{ padding: '8px 0', fontWeight: '500' }}>Grading Expected:</td>
                <td style={{ padding: '8px 0', textAlign: 'right' }}>{dueDate}</td>
              </tr>
            </tbody>
          </table>
        </EmailSection>

        <EmailSection 
          title="What Happens Next?" 
          icon="👀"
          backgroundColor="#f0f9ff"
          borderColor="#0284c7"
        >
          <ol style={{ margin: '10px 0', paddingLeft: '20px', color: '#1f2937', fontSize: '14px' }}>
            <li style={{ marginBottom: '8px' }}>Your instructor will review your submission</li>
            <li style={{ marginBottom: '8px' }}>You'll receive feedback and a grade</li>
            <li>Visit your dashboard to see grades when they're published</li>
          </ol>
        </EmailSection>

        <div style={{ textAlign: 'center', margin: '25px 0' }}>
          <EmailButton 
            href={`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/assignments`}
            text="View Assignment"
          />
        </div>

        <p style={{ fontSize: '14px', margin: '15px 0 0 0', color: '#6b7280' }}>
          Keep up the good work! We're here to support your learning journey.
        </p>
      </div>
    </EmailLayout>
  )
}
