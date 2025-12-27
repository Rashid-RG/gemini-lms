import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/adminAuth";
import { cookies } from "next/headers";

/**
 * Verify admin session from API route
 * @returns {Promise<{authenticated: boolean, admin?: object, error?: NextResponse}>}
 */
export async function requireAdminAuth() {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_session')?.value;
    
    if (!token) {
        return {
            authenticated: false,
            error: NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        };
    }
    
    const session = await verifyAdminSession(token);
    
    if (!session.valid) {
        return {
            authenticated: false,
            error: NextResponse.json({ error: "Invalid session" }, { status: 401 })
        };
    }
    
    return {
        authenticated: true,
        admin: session.admin
    };
}

/**
 * Require super admin role
 * @returns {Promise<{authenticated: boolean, admin?: object, error?: NextResponse}>}
 */
export async function requireSuperAdmin() {
    const result = await requireAdminAuth();
    
    if (!result.authenticated) {
        return result;
    }
    
    if (result.admin.role !== 'super_admin') {
        return {
            authenticated: false,
            error: NextResponse.json({ error: "Super admin access required" }, { status: 403 })
        };
    }
    
    return result;
}
