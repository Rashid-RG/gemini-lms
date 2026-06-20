import { NextResponse } from 'next/server'
import { db } from '@/configs/db'
import { ADMIN_TABLE } from '@/configs/schema'
import { eq } from 'drizzle-orm'
import { verifyPassword } from '@/lib/adminAuth'
import { requireAdminOrAbove } from '@/lib/adminApiAuth'

export async function POST(req) {
  const authResult = await requireAdminOrAbove();
  if (!authResult.authenticated) return authResult.error;

  try {
    const { password, email } = await req.json()

    if (authResult.admin.email.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    if (!password || !email) {
      return NextResponse.json(
        { error: 'Password and email required' },
        { status: 400 }
      )
    }

    // Get admin by email
    const admin = await db.select().from(ADMIN_TABLE).where(eq(ADMIN_TABLE.email, email))

    if (admin.length === 0) {
      return NextResponse.json(
        { error: 'Admin not found' },
        { status: 404 }
      )
    }

    const adminRecord = admin[0]

    // Verify password using PBKDF2 (same as login system)
    let passwordMatch = false

    if (adminRecord.passwordHash) {
      // Compare with hash using PBKDF2
      passwordMatch = verifyPassword(password, adminRecord.passwordHash)
    } else if (adminRecord.temporaryPassword) {
      // Fallback: compare plain text (if password not hashed yet)
      passwordMatch = password === adminRecord.temporaryPassword
    }

    if (!passwordMatch) {
      return NextResponse.json(
        { success: false, error: 'Invalid password' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Password verified'
    })
  } catch (error) {
    console.error('Verify password error:', error)
    return NextResponse.json(
      { error: 'Failed to verify password' },
      { status: 500 }
    )
  }
}
