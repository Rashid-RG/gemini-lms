import { NextResponse } from "next/server";
import { deleteAdminSession } from "@/lib/adminAuth";
import { cookies } from "next/headers";

export async function POST(req) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_session')?.value;
    
    // Delete session from database
    if (token) {
      await deleteAdminSession(token);
    }
    
    // Clear the cookie
    cookieStore.delete('admin_session');
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Admin logout error:', error);
    return NextResponse.json(
      { error: "Logout failed" },
      { status: 500 }
    );
  }
}
