import { db } from "@/configs/db";
import { ADMIN_TABLE } from "@/configs/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/adminApiAuth";
import { hashPassword, verifyPassword } from "@/lib/adminAuth";

/**
 * GET /api/admin/profile
 * Get current admin's profile info
 */
export async function GET(req) {
    const auth = await requireAdminAuth();
    if (!auth.authenticated) return auth.error;

    try {
        const admins = await db
            .select({
                id: ADMIN_TABLE.id,
                email: ADMIN_TABLE.email,
                name: ADMIN_TABLE.name,
                role: ADMIN_TABLE.role,
                profilePic: ADMIN_TABLE.profilePic,
                createdAt: ADMIN_TABLE.createdAt,
                lastLoginAt: ADMIN_TABLE.lastLoginAt,
            })
            .from(ADMIN_TABLE)
            .where(eq(ADMIN_TABLE.id, auth.admin.id));

        if (admins.length === 0) {
            return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }

        return NextResponse.json({ profile: admins[0] });
    } catch (error) {
        console.error("Profile GET error:", error);
        return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
    }
}

/**
 * PUT /api/admin/profile
 * Update profile (name) or change password
 */
export async function PUT(req) {
    const auth = await requireAdminAuth();
    if (!auth.authenticated) return auth.error;

    try {
        const { name, currentPassword, newPassword } = await req.json();

        const updateData = { updatedAt: new Date() };
        const changes = [];

        // Update name
        if (name !== undefined && name.trim()) {
            updateData.name = name.trim();
            changes.push("name");
        }

        // Change password
        if (currentPassword && newPassword) {
            if (newPassword.length < 8) {
                return NextResponse.json(
                    { error: "New password must be at least 8 characters" },
                    { status: 400 }
                );
            }

            // Verify current password
            const admin = await db
                .select({ passwordHash: ADMIN_TABLE.passwordHash })
                .from(ADMIN_TABLE)
                .where(eq(ADMIN_TABLE.id, auth.admin.id));

            if (admin.length === 0) {
                return NextResponse.json({ error: "Account not found" }, { status: 404 });
            }

            const isValid = verifyPassword(currentPassword, admin[0].passwordHash);
            if (!isValid) {
                return NextResponse.json(
                    { error: "Current password is incorrect" },
                    { status: 400 }
                );
            }

            updateData.passwordHash = hashPassword(newPassword);
            changes.push("password");
        }

        if (changes.length === 0) {
            return NextResponse.json(
                { error: "No changes provided" },
                { status: 400 }
            );
        }

        await db
            .update(ADMIN_TABLE)
            .set(updateData)
            .where(eq(ADMIN_TABLE.id, auth.admin.id));

        return NextResponse.json({
            success: true,
            message: `Updated: ${changes.join(", ")}`,
            changes,
        });
    } catch (error) {
        console.error("Profile PUT error:", error);
        return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }
}
