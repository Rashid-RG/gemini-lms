import { NextResponse } from 'next/server'
import { db } from '@/configs/db'
import { ADMIN_TABLE } from '@/configs/schema'
import { eq } from 'drizzle-orm'
import { hashPassword } from '@/lib/adminAuth'
import { requireAdminOrAbove } from '@/lib/adminApiAuth'

export async function POST(req) {
  const authResult = await requireAdminOrAbove();
  if (!authResult.authenticated) return authResult.error;

  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    if (authResult.admin.email.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    // Hash the password using PBKDF2 (same as the login/reset system)
    const passwordHash = hashPassword(password)

    // Check if tutor account exists
    const existingAdmin = await db
      .select()
      .from(ADMIN_TABLE)
      .where(eq(ADMIN_TABLE.email, email.toLowerCase()))

    if (existingAdmin.length === 0) {
      return NextResponse.json(
        { error: 'Account not found.' },
        { status: 404 }
      )
    }

    // Update password and clear temporaryPassword
    await db
      .update(ADMIN_TABLE)
      .set({
        passwordHash: passwordHash,
        temporaryPassword: null,
        passwordSetAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(ADMIN_TABLE.email, email.toLowerCase()))

    return NextResponse.json({
      success: true,
      message: 'Password set successfully'
    })
  } catch (error) {
    console.error('Set password error:', error)
    return NextResponse.json(
      { error: 'Failed to set password' },
      { status: 500 }
    )
  }
}
