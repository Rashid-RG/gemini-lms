import { NextResponse } from 'next/server'
import { db } from '@/configs/db'
import { TUTOR_REQUESTS_TABLE, ADMIN_TABLE } from '@/configs/schema'
import { eq, desc } from 'drizzle-orm'
import { sql } from 'drizzle-orm'

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')

    let query = db.select().from(TUTOR_REQUESTS_TABLE)

    if (status && status !== 'all') {
      query = query.where(eq(TUTOR_REQUESTS_TABLE.status, status))
    }

    const requests = await query.orderBy(desc(TUTOR_REQUESTS_TABLE.requestedAt))

    return NextResponse.json({
      result: requests
    })
  } catch (error) {
    console.error('Fetch tutor requests error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch requests' },
      { status: 500 }
    )
  }
}

export async function PATCH(req) {
  try {
    const body = await req.json()
    const { id } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Request ID required' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      error: 'Use the specific request ID endpoint'
    }, { status: 400 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}
