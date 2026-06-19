import { NextResponse } from "next/server";
import { createAdmin, verifyAdminSession } from "@/lib/adminAuth";
import { cookies } from "next/headers";
import { db } from "@/configs/db";
import { ADMIN_TABLE } from "@/configs/schema";

export async function POST(req) {
  try {
    const { email, password, name, role, setupKey } = await req.json();
    
    // Check if this is initial setup (no admins exist)
    const existingAdmins = await db.select().from(ADMIN_TABLE).limit(1);
    const isInitialSetup = existingAdmins.length === 0;
    
    if (isInitialSetup) {
      // Allow first admin creation with setup key from env
      const validSetupKey = process.env.ADMIN_SETUP_KEY || 'initial-setup-key-change-me';
      if (setupKey !== validSetupKey) {
        return NextResponse.json(
          { error: "Invalid setup key" },
          { status: 403 }
        );
      }
    } else {
      // Require super_admin authentication to create new admins
      const cookieStore = await cookies();
      const token = cookieStore.get('admin_session')?.value;
      
      if (!token) {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        );
      }
      
      const session = await verifyAdminSession(token);
      
      if (!session.valid || session.admin.role !== 'super_admin') {
        return NextResponse.json(
          { error: "Only super admins can create new admin accounts" },
          { status: 403 }
        );
      }
    }
    
    // Validate input
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Email, password, and name are required" },
        { status: 400 }
      );
    }
    
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }
    
    // Create admin (first admin becomes super_admin)
    const adminRole = isInitialSetup ? 'super_admin' : (role || 'admin');
    
    const result = await createAdmin({
      email,
      password,
      name,
      role: adminRole
    });
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      admin: result.admin,
      message: isInitialSetup ? 'Super admin created successfully' : 'Admin created successfully'
    });
    
  } catch (error) {
    console.error('Admin creation error:', error);
    return NextResponse.json(
      { error: "Failed to create admin" },
      { status: 500 }
    );
  }
}
