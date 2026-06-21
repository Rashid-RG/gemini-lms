import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getAuthEmail } from "@/lib/clerkUtils";
import { db } from "@/configs/db";
import { ADMIN_TABLE } from "@/configs/schema";
import { eq } from "drizzle-orm";
import { createAdminSession } from "@/lib/adminAuth";
import { cookies } from "next/headers";

export async function POST(req) {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized: Please log in with Google first." },
        { status: 401 }
      );
    }

    const email = await getAuthEmail(sessionClaims);
    if (!email) {
      return NextResponse.json(
        { error: "Could not retrieve email from Google login." },
        { status: 400 }
      );
    }

    // Lookup this email in our database
    const admins = await db.select()
      .from(ADMIN_TABLE)
      .where(eq(ADMIN_TABLE.email, email.toLowerCase()));

    if (admins.length === 0) {
      return NextResponse.json(
        { error: "Access Denied: This Google account is not registered as an Admin, Super Admin, or Tutor." },
        { status: 403 }
      );
    }

    const admin = admins[0];

    if (!admin.isActive) {
      return NextResponse.json(
        { error: "Account is disabled." },
        { status: 403 }
      );
    }

    // Get client info for session
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Create session
    const session = await createAdminSession(admin.id, ipAddress, userAgent);

    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set('admin_session', session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: session.expiresAt,
      path: '/'
    });

    return NextResponse.json({
      success: true,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      }
    });

  } catch (error) {
    console.error('Google admin login error:', error);
    return NextResponse.json(
      { error: "Google login processing failed" },
      { status: 500 }
    );
  }
}
