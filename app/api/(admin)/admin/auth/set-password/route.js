import { NextResponse } from 'next/server'
import { db } from '@/configs/db'
import { ADMIN_TABLE } from '@/configs/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'

export async function POST(req) {
  try {
    const { email, password } = await req.json()

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

    // Hash the password
    const salt = await bcrypt.genSalt(10)
    const passwordHash = await bcrypt.hash(password, salt)

    // Check if tutor account exists
    const existingAdmin = await db
      .select()
      .from(ADMIN_TABLE)
      .where(eq(ADMIN_TABLE.email, email))

    if (existingAdmin.length === 0) {
      return NextResponse.json(
        { error: 'Account not found. Please contact admin.' },
        { status: 404 }
      )
    }

    // Update password
    await db
      .update(ADMIN_TABLE)
      .set({
        passwordHash: passwordHash,
        updatedAt: new Date()
      })
      .where(eq(ADMIN_TABLE.email, email))

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
