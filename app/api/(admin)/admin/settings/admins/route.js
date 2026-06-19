import { db } from "@/configs/db";
import { ADMIN_TABLE } from "@/configs/schema";
import { eq, desc, ne } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/adminApiAuth";
import { hashPassword } from "@/lib/adminAuth";

/**
 * GET /api/admin/settings/admins
 * Get all admin users (super_admin only)
 */
export async function GET(req) {
    // Verify super admin session
    const auth = await requireSuperAdmin();
    if (!auth.authenticated) return auth.error;

    try {
        const admins = await db
            .select({
                id: ADMIN_TABLE.id,
                email: ADMIN_TABLE.email,
                name: ADMIN_TABLE.name,
                role: ADMIN_TABLE.role,
                isActive: ADMIN_TABLE.isActive,
                lastLoginAt: ADMIN_TABLE.lastLoginAt,
                createdAt: ADMIN_TABLE.createdAt
            })
            .from(ADMIN_TABLE)
            .orderBy(desc(ADMIN_TABLE.createdAt));

        return NextResponse.json({ admins });

    } catch (error) {
        console.error("Error fetching admins:", error);
        return NextResponse.json(
            { error: "Failed to fetch admin users" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/admin/settings/admins
 * Create a new admin user (super_admin only)
 */
export async function POST(req) {
    // Verify super admin session
    const auth = await requireSuperAdmin();
    if (!auth.authenticated) return auth.error;

    try {
        const { email, password, name, role } = await req.json();

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

        // Check if admin already exists
        const existing = await db
            .select()
            .from(ADMIN_TABLE)
            .where(eq(ADMIN_TABLE.email, email.toLowerCase()));

        if (existing.length > 0) {
            return NextResponse.json(
                { error: "An admin with this email already exists" },
                { status: 400 }
            );
        }

        // Hash password
        const passwordHash = await hashPassword(password);

        // Create admin
        const result = await db.insert(ADMIN_TABLE).values({
            email: email.toLowerCase(),
            passwordHash,
            name,
            role: role || 'admin',
            isActive: true
        }).returning({
            id: ADMIN_TABLE.id,
            email: ADMIN_TABLE.email,
            name: ADMIN_TABLE.name,
            role: ADMIN_TABLE.role
        });

        return NextResponse.json({
            success: true,
            admin: result[0]
        });

    } catch (error) {
        console.error("Error creating admin:", error);
        return NextResponse.json(
            { error: "Failed to create admin user" },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/admin/settings/admins
 * Update admin status (activate/deactivate)
 */
export async function PATCH(req) {
    // Verify super admin session
    const auth = await requireSuperAdmin();
    if (!auth.authenticated) return auth.error;

    try {
        const { adminId, isActive } = await req.json();

        if (!adminId || isActive === undefined) {
            return NextResponse.json(
                { error: "adminId and isActive are required" },
                { status: 400 }
            );
        }

        // Can't deactivate yourself
        if (adminId === auth.admin.id) {
            return NextResponse.json(
                { error: "You cannot deactivate your own account" },
                { status: 400 }
            );
        }

        const result = await db
            .update(ADMIN_TABLE)
            .set({ isActive })
            .where(eq(ADMIN_TABLE.id, adminId))
            .returning();

        if (result.length === 0) {
            return NextResponse.json(
                { error: "Admin not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            admin: result[0]
        });

    } catch (error) {
        console.error("Error updating admin:", error);
        return NextResponse.json(
            { error: "Failed to update admin" },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/admin/settings/admins
 * Delete an admin user (super_admin only)
 */
export async function DELETE(req) {
    // Verify super admin session
    const auth = await requireSuperAdmin();
    if (!auth.authenticated) return auth.error;

    try {
        const { adminId } = await req.json();

        if (!adminId) {
            return NextResponse.json(
                { error: "adminId is required" },
                { status: 400 }
            );
        }

        // Can't delete yourself
        if (adminId === auth.admin.id) {
            return NextResponse.json(
                { error: "You cannot delete your own account" },
                { status: 400 }
            );
        }

        const result = await db
            .delete(ADMIN_TABLE)
            .where(eq(ADMIN_TABLE.id, adminId))
            .returning();

        if (result.length === 0) {
            return NextResponse.json(
                { error: "Admin not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "Admin deleted successfully"
        });

    } catch (error) {
        console.error("Error deleting admin:", error);
        return NextResponse.json(
            { error: "Failed to delete admin" },
            { status: 500 }
        );
    }
}
