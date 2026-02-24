import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/adminAuth";
import { cookies } from "next/headers";

/**
 * Verify admin session from API route (any role: admin, super_admin, tutor)
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

/**
 * Require admin or super_admin role (excludes tutors)
 * @returns {Promise<{authenticated: boolean, admin?: object, error?: NextResponse}>}
 */
export async function requireAdminOrAbove() {
    const result = await requireAdminAuth();
    
    if (!result.authenticated) {
        return result;
    }
    
    if (!['admin', 'super_admin'].includes(result.admin.role)) {
        return {
            authenticated: false,
            error: NextResponse.json({ error: "Admin access required" }, { status: 403 })
        };
    }
    
    return result;
}

/**
 * Require reviewer access (tutor, admin, or super_admin) — for content review
 * @returns {Promise<{authenticated: boolean, admin?: object, error?: NextResponse}>}
 */
export async function requireReviewerAuth() {
    const result = await requireAdminAuth();
    
    if (!result.authenticated) {
        return result;
    }
    
    if (!['tutor', 'admin', 'super_admin'].includes(result.admin.role)) {
        return {
            authenticated: false,
            error: NextResponse.json({ error: "Reviewer access required" }, { status: 403 })
        };
    }
    
    return result;
}

/**
 * Check specific roles
 * @param {string[]} allowedRoles - Array of allowed roles
 * @returns {Promise<{authenticated: boolean, admin?: object, error?: NextResponse}>}
 */
export async function requireRole(allowedRoles) {
    const result = await requireAdminAuth();
    
    if (!result.authenticated) {
        return result;
    }
    
    if (!allowedRoles.includes(result.admin.role)) {
        return {
            authenticated: false,
            error: NextResponse.json({ error: `Required role: ${allowedRoles.join(' or ')}` }, { status: 403 })
        };
    }
    
    return result;
}
