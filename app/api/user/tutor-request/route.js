import { NextResponse } from 'next/server';
import { db } from '@/configs/db';
import { TUTOR_REQUESTS_TABLE } from '@/configs/schema';
import { eq, desc } from 'drizzle-orm';

export async function POST(req) {
  try {
    const { userEmail, userName, experienceLevel, subjectExpertise, motivation, certifications } = await req.json();

    // Validation
    if (!userEmail || !userName || !experienceLevel || !subjectExpertise || !motivation) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if user has already submitted a request
    const existingRequest = await db
      .select()
      .from(TUTOR_REQUESTS_TABLE)
      .where(eq(TUTOR_REQUESTS_TABLE.userEmail, userEmail))
      .orderBy(desc(TUTOR_REQUESTS_TABLE.id)); // Get LATEST application

    if (existingRequest.length > 0) {
      const existing = existingRequest[0]; // Now this is the LATEST application
      if (existing.status === 'pending') {
        return NextResponse.json(
          { error: 'You already have a pending tutor request' },
          { status: 409 }
        );
      }
      if (existing.status === 'approved') {
        return NextResponse.json(
          { error: 'You are already a tutor' },
          { status: 409 }
        );
      }
    }

    // Create new request
    const result = await db.insert(TUTOR_REQUESTS_TABLE).values({
      userEmail,
      userName,
      experienceLevel,
      subjectExpertise,
      motivation,
      certifications: certifications || '',
      status: 'pending'
    }).returning();

    return NextResponse.json({
      success: true,
      result: result[0],
      message: 'Tutor request submitted successfully! Admin will review your application.'
    });
  } catch (error) {
    console.error('Tutor request error:', error);
    return NextResponse.json(
      { error: 'Failed to submit tutor request' },
      { status: 500 }
    );
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const userEmail = searchParams.get('email');

    if (!userEmail) {
      return NextResponse.json(
        { error: 'Email parameter required' },
        { status: 400 }
      );
    }

    const request = await db
      .select()
      .from(TUTOR_REQUESTS_TABLE)
      .where(eq(TUTOR_REQUESTS_TABLE.userEmail, userEmail))
      .orderBy(desc(TUTOR_REQUESTS_TABLE.id)); // Get the LATEST application, not the first

    const response = NextResponse.json({
      result: request.length > 0 ? request[0] : null
    });

    // Prevent caching to ensure fresh data
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (error) {
    console.error('Get tutor request error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tutor request' },
      { status: 500 }
    );
  }
}
