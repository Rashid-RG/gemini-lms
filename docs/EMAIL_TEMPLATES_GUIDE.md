# Professional Email Templates Implementation Guide

## Overview

This guide shows you how to implement professional, branded email templates in your Gemini LMS platform.

### What Was Created

1. **EmailLayout.jsx** - Base layout component with consistent branding
2. **StandardTemplates.jsx** - 6 professional email templates (Welcome, Enrollment, Certificate, Payment, etc.)
3. **ProgressReminderEmail.jsx** - Updated with professional styling
4. **emailService.js** - Centralized service for sending all emails

---

## Architecture

### Component Hierarchy

```
EmailLayout (base layout with header, footer, brand colors)
├── EmailSection (reusable section with icons and styling)
├── EmailButton (styled CTA buttons)
├── StatCard (metric display cards)
└── StatsRow (grid layout for stats)

StandardTemplates (specific email types)
├── WelcomeEmail
├── CourseEnrollmentEmail
├── CertificateEarnedEmail
├── PaymentConfirmationEmail
└── AssignmentSubmissionEmail
```

### Email Service

```javascript
// Centralized service with methods for each email type
emailService.sendWelcomeEmail(email, firstName)
emailService.sendCourseEnrollmentEmail(email, firstName, courseName, instructorName)
emailService.sendCertificateEmail(email, firstName, courseName, certificateUrl)
emailService.sendPaymentConfirmationEmail(email, firstName, amount, transactionId)
emailService.sendProgressReminderEmail(email, studentName, courseName, stats)
```

---

## Implementation Steps

### Step 1: Update Environment Variables

Add to your `.env.local`:

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxx  # Your Resend API key
RESEND_FROM_EMAIL=noreply@geminilms.com  # Your sender email
NEXT_PUBLIC_APP_URL=http://localhost:3000  # For email links
```

### Step 2: Install React Email Renderer (Recommended)

For better email compatibility, install:

```bash
npm install @react-email/render
```

Then update emailService.js:

```javascript
import { renderAsync } from '@react-email/render'

// Replace renderReactEmailComponent function with:
async function renderReactEmailComponent(Component) {
  const html = await renderAsync(Component)
  return html
}

// And update sendEmail method to be async:
async sendEmail({ to, subject, component: Component, from }) {
  const html = await renderReactEmailComponent(Component)
  // ... rest of code
}
```

### Step 3: Update Existing Email Endpoints

**Example: Payment Confirmation**

Before:
```javascript
// Old inline HTML
const html = `<html>...</html>`
const res = await resend.emails.send({
  from: 'noreply@geminilms.com',
  to: userEmail,
  subject: 'Payment Confirmation',
  html
})
```

After:
```javascript
import { emailService } from '@/lib/emailService'

await emailService.sendPaymentConfirmationEmail(
  userEmail,
  user.firstName,
  amount,
  transactionId,
  'credit-pack' // or 'subscription'
)
```

### Step 4: Update Inngest Functions

**Example: Weekly Progress Reminder**

File: `/inngest/functions.js`

Before:
```javascript
const html = `<html>...</html>`
const res = await resend.emails.send({
  from: 'noreply@geminilms.com',
  to: studentEmail,
  subject: 'Weekly Progress Summary',
  html
})
```

After:
```javascript
import { emailService } from '@/lib/emailService'

await emailService.sendProgressReminderEmail(
  studentEmail,
  studentName,
  courseName,
  {
    overallMastery: 75,
    topicsMastered: 5,
    topicsNeedingWork: 2,
    weakTopics: [...],
    nextActionTopic: {...}
  }
)
```

---

## Available Email Templates

### 1. Welcome Email
**When**: User first signs up
**File**: `StandardTemplates.jsx` → `WelcomeEmail`

```javascript
emailService.sendWelcomeEmail(email, 'John Doe')
```

**Features**:
- Greeting personalization
- Getting started tips
- Call-to-action buttons
- Support information

### 2. Course Enrollment Confirmation
**When**: User enrolls in a course
**File**: `StandardTemplates.jsx` → `CourseEnrollmentEmail`

```javascript
emailService.sendCourseEnrollmentEmail(
  email, 
  'John Doe', 
  'Advanced JavaScript', 
  'Jane Smith'
)
```

**Features**:
- Course details (name, instructor, start date)
- Next steps guidance
- Course access link
- Instructor contact info

### 3. Certificate Earned
**When**: User completes a course
**File**: `StandardTemplates.jsx` → `CertificateEarnedEmail`

```javascript
emailService.sendCertificateEmail(
  email,
  'John Doe',
  'Advanced JavaScript',
  'https://certs.geminilms.com/...'
)
```

**Features**:
- Achievement celebration
- Certificate download link
- LinkedIn share suggestions
- Next course recommendations

### 4. Payment Confirmation
**When**: Payment processed
**File**: `StandardTemplates.jsx` → `PaymentConfirmationEmail`

```javascript
emailService.sendPaymentConfirmationEmail(
  email,
  'John Doe',
  '2,999', // amount
  'PAY-123456',
  'credit-pack' // or 'subscription'
)
```

**Features**:
- Transaction details
- Invoice/receipt information
- Account status update
- Billing portal link

### 5. Progress Reminder
**When**: Weekly (configurable)
**File**: `ProgressReminderEmail.jsx`

```javascript
emailService.sendProgressReminderEmail(
  email,
  'John Doe',
  'JavaScript Basics',
  {
    overallMastery: 75,
    topicsMastered: 8,
    topicsNeedingWork: 3,
    weakTopics: [
      { topicName: 'Async/Await', score: 45, recommendedDifficulty: 'Medium' }
    ],
    nextActionTopic: {
      topicName: 'Promises',
      recommendedDifficulty: 'Medium',
      suggestion: 'Focus on promise chaining before moving to async/await'
    }
  }
)
```

**Features**:
- Progress statistics with visual cards
- Topics needing focus
- Personalized recommendations
- Motivation message

### 6. Assignment Submission Confirmation
**When**: Student submits assignment
**File**: `StandardTemplates.jsx` → `AssignmentSubmissionEmail`

```javascript
emailService.sendAssignmentSubmissionEmail(
  email,
  'John Doe',
  'Web Development',
  'Build a Todo App'
)
```

**Features**:
- Submission confirmation
- Assignment details
- Grading timeline
- Feedback expectations

### 7. Subscription Cancellation
**When**: Subscription cancelled
**File**: `emailService.js` → `sendSubscriptionCancellationEmail`

```javascript
emailService.sendSubscriptionCancellationEmail(
  email,
  'John Doe',
  2999, // refund amount
  'Too expensive' // optional reason
)
```

**Features**:
- Cancellation confirmation
- Refund details and timeline
- What happens next
- Reactivation options

---

## Customization Guide

### Changing Brand Colors

All templates use `brandColor` prop. Update in EmailLayout:

```javascript
const brandColor = '#667eea' // Change to your color
```

Or override per template:

```javascript
<EmailLayout brandColor="#your-color">
  {/* content */}
</EmailLayout>
```

### Adding Your Logo

Pass logo URL to EmailLayout:

```javascript
<EmailLayout 
  logoUrl="https://your-cdn.com/logo.png"
  preheader="Your email preview text"
>
  {/* content */}
</EmailLayout>
```

### Updating Sender Email

Change in environment variables:

```bash
RESEND_FROM_EMAIL=hello@yourdomain.com
```

Or per email:

```javascript
await emailService.sendEmail({
  to: email,
  subject: 'Hello',
  component: MyEmail,
  from: 'special@yourdomain.com' // Override
})
```

### Adding Custom Sections

Use EmailSection component:

```javascript
<EmailSection 
  title="Custom Title"
  icon="📝"
  backgroundColor="#f0f9ff"
  borderColor="#0284c7"
>
  <p>Your custom content here</p>
</EmailSection>
```

---

## Migration Checklist

- [ ] Install `@react-email/render` (optional but recommended)
- [ ] Update `.env.local` with Resend credentials
- [ ] Add NEXT_PUBLIC_APP_URL to environment
- [ ] Test each email template locally
- [ ] Update `/api/enroll` endpoint to use emailService
- [ ] Update `/api/generate-certificate` to use emailService
- [ ] Update `/api/payment/webhook` to use emailService
- [ ] Update `/inngest/functions.js` SendWeeklyProgressReminders to use emailService
- [ ] Update subscription cancellation endpoint
- [ ] Test in Vercel staging environment
- [ ] Deploy to production
- [ ] Monitor email delivery in Resend dashboard

---

## Testing Locally

### Using Resend Test Key

Create test mode key in Resend dashboard and use for local development:

```bash
RESEND_API_KEY=re_test_xxxxxxxxxxxxx
```

### Example Test Call

```javascript
// In a Next.js API route
import { emailService } from '@/lib/emailService'

export async function GET(req) {
  try {
    await emailService.sendWelcomeEmail('test@example.com', 'Test User')
    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}

// Visit /api/test-email to send a test email
```

---

## Production Considerations

### Email Deliverability

1. **Verify Domain**: Add DKIM, SPF, and DMARC records in Resend
2. **Test Lists**: Check with tools like [Mail-tester](https://www.mail-tester.com)
3. **Unsubscribe Links**: Legally required in marketing emails
4. **A/B Testing**: Test subject lines and content variations

### Performance

- Email rendering is async, so use in background tasks (Inngest)
- Cache component renders if sending bulk emails
- Monitor Resend API rate limits

### Monitoring

Add logging to emailService:

```javascript
async sendEmail({ to, subject, component }) {
  console.time(`email-${to}`)
  // ... send logic
  console.timeEnd(`email-${to}`)
}
```

Monitor in Resend dashboard for:
- Delivery rates
- Bounce rates
- Click rates
- Open rates

---

## Troubleshooting

### Emails Not Sending

1. Check RESEND_API_KEY is valid
2. Verify domain is verified in Resend
3. Check email to address is correct
4. Review Resend dashboard for errors

### Styling Issues in Email Clients

- Outlook: Use inline styles only (already done)
- Apple Mail: Test color rendering
- Dark mode: Use background colors with sufficient contrast

### React Component Not Rendering

Install @react-email/render and update emailService as shown above.

---

## Resources

- [Resend Documentation](https://resend.com/docs)
- [React Email Library](https://react.email)
- [Email HTML Best Practices](https://www.mailgun.com/blog/email/html-emails/)

---

## File Summary

| File | Purpose |
|------|---------|
| `components/emails/EmailLayout.jsx` | Base layout with branding |
| `components/emails/StandardTemplates.jsx` | 5 standard email templates |
| `components/emails/ProgressReminderEmail.jsx` | Weekly progress email |
| `lib/emailService.js` | Centralized service for all emails |

**Total Lines of Code**: ~1000 lines (reusable, maintainable)
**Email Templates**: 7 types
**Customization Level**: High (colors, logos, copy)
