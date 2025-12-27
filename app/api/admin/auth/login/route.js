import { NextResponse } from "next/server";
import { authenticateAdmin, createAdminSession } from "@/lib/adminAuth";
import { cookies } from "next/headers";

export async function POST(req) {
  try {
    const { email, password } = await req.json();
    
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }
    
    // Authenticate admin
    const authResult = await authenticateAdmin(email, password);
    
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }
    
    // Get client info for session
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';
    
    // Create session
    const session = await createAdminSession(authResult.admin.id, ipAddress, userAgent);
    
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
      admin: authResult.admin
    });
    
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { error: "Login failed" },
      { status: 500 }
    );
  }
}
