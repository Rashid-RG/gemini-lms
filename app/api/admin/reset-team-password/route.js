import { NextResponse } from 'next/server'
import { db } from '@/configs/db'
import { ADMIN_TABLE } from '@/configs/schema'
import { eq } from 'drizzle-orm'
import { hashPassword } from '@/lib/adminAuth'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@geminilms.com'

export async function POST(req) {
  try {
    const { email, password, sendEmail } = await req.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    // Find the team member
    const member = await db.select().from(ADMIN_TABLE)
      .where(eq(ADMIN_TABLE.email, email))

    if (!member.length) {
      return NextResponse.json(
        { error: 'Team member not found' },
        { status: 404 }
      )
    }

    // Hash the password using PBKDF2 (same as login system)
    const passwordHash = hashPassword(password)

    // Update the team member with new password
    const updated = await db.update(ADMIN_TABLE)
      .set({
        passwordHash: passwordHash,
        temporaryPassword: password, // Store plain for display
        passwordSetAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(ADMIN_TABLE.email, email))
      .returning()

    // Send email if requested
    if (sendEmail) {
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h2 style="color: #2196f3; margin-bottom: 20px;">Your Password Has Been Reset</h2>
            
            <p>Hello <strong>${member[0].name}</strong>,</p>
            
            <p>Your administrator has assigned you a new password. Please use the credentials below to log in:</p>
            
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196f3;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; font-weight: bold; width: 120px;">Email:</td>
                  <td style="padding: 10px 0; font-family: monospace; background-color: white; padding: 8px; border-radius: 4px;">${email}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-weight: bold;">Password:</td>
                  <td style="padding: 10px 0; font-family: monospace; background-color: white; padding: 8px; border-radius: 4px;">${password}</td>
                </tr>
              </table>
            </div>

            <div style="background-color: #e3f2fd; padding: 12px; border-left: 4px solid #2196f3; border-radius: 4px; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px;">
                ℹ️ <strong>Note:</strong> You can change this password anytime in your profile settings after logging in.
              </p>
            </div>

            <p style="color: #666; font-size: 14px; margin-top: 20px;">
              If you did not request this password reset, please contact your administrator immediately.
            </p>

            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">
              This is an automated message, please do not reply to this email.
            </p>
          </div>
        </body>
        </html>
      `

      try {
        await resend.emails.send({
          from: fromEmail,
          to: email,
          subject: '🔐 Your Password Has Been Reset',
          html: emailHtml
        })
      } catch (emailError) {
        console.error('Failed to send email:', emailError)
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully',
      emailSent: sendEmail
    })
  } catch (error) {
    console.error('Error resetting password:', error)
    return NextResponse.json(
      { 
        error: 'Failed to reset password',
        details: error.message
      },
      { status: 500 }
    )
  }
}
