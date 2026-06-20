import { NextResponse } from 'next/server'
import { db } from '@/configs/db'
import { TUTOR_REQUESTS_TABLE, ADMIN_TABLE } from '@/configs/schema'
import { eq } from 'drizzle-orm'
import { hashPassword } from '@/lib/adminAuth'
import { requireAdminOrAbove } from '@/lib/adminApiAuth'
import { emailService } from '@/lib/emailService'

// Email templates
const TutorApprovedEmail = ({ userName, tutorEmail, password, loginUrl }) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #10b981; margin: 0;">🎉 Congratulations!</h1>
    </div>
    
    <p style="font-size: 16px;">Hi <strong>${userName}</strong>,</p>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      Great news! Your tutor application has been <strong style="color: #10b981;">approved</strong>. 
      Your admin team has created your tutor account. Here are your login credentials:
    </p>

    <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0ea5e9;">
      <h3 style="margin-top: 0; color: #0ea5e9;">🔐 Your Login Credentials</h3>
      <table style="width: 100%; margin: 10px 0;">
        <tr>
          <td style="padding: 8px 0; text-align: right; font-weight: bold; width: 30%;">Email:</td>
          <td style="padding: 8px 0 8px 15px; font-family: monospace; background: white; border-radius: 4px; padding: 8px;">${tutorEmail}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; text-align: right; font-weight: bold; width: 30%;">Password:</td>
          <td style="padding: 8px 0 8px 15px; font-family: monospace; background: white; border-radius: 4px; padding: 8px;">${password}</td>
        </tr>
      </table>
      <p style="font-size: 12px; color: #dc2626; margin-top: 10px;">⚠️ Keep these credentials safe. Do not share with anyone.</p>
    </div>

    <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
      <p style="margin: 0; font-size: 14px;"><strong>💡 Next Steps:</strong></p>
      <ol style="margin: 10px 0; font-size: 14px;">
        <li>Log in using the credentials above</li>
        <li>Go to your profile and change your password (optional but recommended)</li>
        <li>Click "Create Course" to start building courses</li>
      </ol>
    </div>

    <div style="text-align: center; margin: 20px 0;">
      <a href="${loginUrl}" style="display: inline-block; background-color: #0ea5e9; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
        Go to Tutor Login
      </a>
    </div>

    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      If you have any questions, feel free to contact our support team.
    </p>

    <p style="font-size: 14px; margin-top: 20px;">
      Best regards,<br>
      <strong>Gemini LMS Team</strong>
    </p>
  </div>
</body>
</html>
`

const TutorRejectedEmail = ({ userName, rejectionReason }) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #ef4444; margin: 0;">Application Update</h1>
    </div>
    
    <p style="font-size: 16px;">Hi <strong>${userName}</strong>,</p>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      Thank you for applying to become a tutor. Unfortunately, your application has been <strong style="color: #ef4444;">not approved at this time</strong>.
    </p>

    ${rejectionReason ? `
      <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
        <h4 style="margin-top: 0; color: #dc2626;">Reason:</h4>
        <p style="margin: 0; font-size: 15px;">${rejectionReason}</p>
      </div>
    ` : ''}

    <p style="font-size: 15px; margin: 20px 0;">
      We encourage you to address the feedback and apply again in the future. 
      Your dedication to education is appreciated, and we'd love to see you join our tutor community!
    </p>

    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      If you have any questions about the decision, please contact our support team.
    </p>

    <p style="font-size: 14px; margin-top: 20px;">
      Best regards,<br>
      <strong>Gemini LMS Team</strong>
    </p>
  </div>
</body>
</html>
`

export async function PATCH(req, { params }) {
  const authResult = await requireAdminOrAbove();
  if (!authResult.authenticated) return authResult.error;

  try {
    const { id } = await params
    const { status, userEmail, password, rejectionReason, reviewedBy } = await req.json()

    if (!id || !status) {
      return NextResponse.json(
        { error: 'ID and status required' },
        { status: 400 }
      )
    }

    const updateData = {
      status,
      reviewedBy,
      reviewedAt: new Date(),
      updatedAt: new Date()
    }

    // Get tutor request details
    const request = await db.select().from(TUTOR_REQUESTS_TABLE).where(eq(TUTOR_REQUESTS_TABLE.id, parseInt(id)))
    
    if (request.length === 0) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      )
    }

    const tutorEmail = request[0].userEmail
    const userName = request[0].userName

    // FIRST: Update TUTOR_REQUESTS_TABLE status immediately
    // This is critical so the user sees the status change on their profile
    const result = await db.update(TUTOR_REQUESTS_TABLE)
      .set(updateData)
      .where(eq(TUTOR_REQUESTS_TABLE.id, parseInt(id)))
      .returning()

    // THEN: Do admin account operations (if approving)
    if (status === 'approved') {
      try {
        if (!password) {
          return NextResponse.json(
            { error: 'Password required for approval' },
            { status: 400 }
          )
        }

        // Hash the password using PBKDF2 (same as login system)
        const passwordHash = hashPassword(password)

        // Create or update admin account for the tutor
        const existingAdmin = await db.select().from(ADMIN_TABLE).where(eq(ADMIN_TABLE.email, tutorEmail))
        
        if (existingAdmin.length === 0) {
          // Create new admin with tutor role
          await db.insert(ADMIN_TABLE).values({
            email: tutorEmail,
            name: userName,
            passwordHash: passwordHash,
            temporaryPassword: password, // Store plain password temporarily for display
            passwordSetAt: new Date(),
            role: 'tutor',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          })
        } else {
          // Update existing admin to tutor role with new password
          await db.update(ADMIN_TABLE)
            .set({ 
              role: 'tutor', 
              isActive: true,
              passwordHash: passwordHash,
              temporaryPassword: password,
              passwordSetAt: new Date(),
              updatedAt: new Date()
            })
            .where(eq(ADMIN_TABLE.email, tutorEmail))
        }

        // Credentials are stored in database and shown on applicant's profile notification
        // No email is sent - applicant will see credentials on their profile
      } catch (adminError) {
        console.error('Error creating admin account:', adminError)
        // Even if admin account creation fails, the status is already updated
      }
    }

    // THEN: Do rejection operations
    if (status === 'rejected') {
      try {
        // Send rejection email
        await emailService.sendHtmlEmail({
          to: tutorEmail,
          subject: 'Your Tutor Application Status',
          html: TutorRejectedEmail({ userName, rejectionReason })
        })
      } catch (emailError) {
        console.error('Failed to send rejection email:', emailError)
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({
      success: true,
      result: result[0],
      message: status === 'approved' 
        ? 'Tutor approved! Credentials stored and ready on their profile notification.'
        : 'Request rejected. Email notification sent.'
    })
  } catch (error) {
    console.error('Update tutor request error:', error)
    return NextResponse.json(
      { error: 'Failed to update request' },
      { status: 500 }
    )
  }
}
