import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/adminAuth";
import { cookies } from "next/headers";

export async function GET(req) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_session')?.value;
    
    if (!token) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }
    
    const result = await verifyAdminSession(token);
    
    if (!result.valid) {
      // Clear invalid session cookie
      cookieStore.delete('admin_session');
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }
    
    return NextResponse.json({
      authenticated: true,
      admin: result.admin
    });
    
  } catch (error) {
    console.error('Admin session verify error:', error);
    return NextResponse.json(
      { authenticated: false, error: "Session verification failed" },
      { status: 500 }
    );
  }
}
