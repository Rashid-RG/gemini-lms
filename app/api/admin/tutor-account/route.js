import { NextResponse } from 'next/server'
import { db } from '@/configs/db'
import { ADMIN_TABLE } from '@/configs/schema'
import { eq } from 'drizzle-orm'

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const admin = await db
      .select()
      .from(ADMIN_TABLE)
      .where(eq(ADMIN_TABLE.email, email))

    if (admin.length === 0) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    const account = admin[0]

    // Return temporary password (no expiry - password is permanent)
    const response = NextResponse.json({
      success: true,
      result: {
        email: account.email,
        name: account.name,
        role: account.role,
        isActive: account.isActive,
        temporaryPassword: account.temporaryPassword,
        passwordSetAt: account.passwordSetAt
      }
    })

    // Prevent caching to ensure fresh credentials are always shown
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')

    return response
  } catch (error) {
    console.error('Get tutor account error:', error)
    return NextResponse.json(
      { error: 'Failed to get account' },
      { status: 500 }
    )
  }
}
