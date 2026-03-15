import { NextResponse } from 'next/server'
import { db } from '@/configs/db'
import { ADMIN_TABLE } from '@/configs/schema'
import { eq } from 'drizzle-orm'

export async function GET(req) {
  try {
    // Get query parameters
    const { searchParams } = new URL(req.url)
    const role = searchParams.get('role')

    // Build query to fetch team members
    let query = db.select().from(ADMIN_TABLE)

    // Filter by role if provided (e.g., role=tutor)
    if (role) {
      query = query.where(eq(ADMIN_TABLE.role, role))
    }

    const members = await query

    return NextResponse.json({
      result: members || []
    })
  } catch (error) {
    console.error('Error fetching team members:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch team members',
        details: error.message
      },
      { status: 500 }
    )
  }
}
