import { db } from "@/configs/db";
import { ADMIN_TABLE, PASSWORD_RESET_TABLE } from "@/configs/schema";
import { eq, and, gt } from "drizzle-orm";
import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/adminAuth";

/**
 * POST /api/admin/auth/reset-password
 * Reset password using a valid token
 */
export async function POST(req) {
    try {
        const { token, newPassword } = await req.json();

        if (!token || !newPassword) {
            return NextResponse.json(
                { error: "Token and new password are required" },
                { status: 400 }
            );
        }

        if (newPassword.length < 8) {
            return NextResponse.json(
                { error: "Password must be at least 8 characters" },
                { status: 400 }
            );
        }

        // Find valid token
        const tokens = await db
            .select()
            .from(PASSWORD_RESET_TABLE)
            .where(
                and(
                    eq(PASSWORD_RESET_TABLE.token, token),
                    eq(PASSWORD_RESET_TABLE.used, false),
                    gt(PASSWORD_RESET_TABLE.expiresAt, new Date())
                )
            );

        if (tokens.length === 0) {
            return NextResponse.json(
                { error: "Invalid or expired reset link. Please request a new one." },
                { status: 400 }
            );
        }

        const resetToken = tokens[0];

        // Hash new password
        const passwordHash = hashPassword(newPassword);

        // Update admin password
        await db
            .update(ADMIN_TABLE)
            .set({ passwordHash, updatedAt: new Date() })
            .where(eq(ADMIN_TABLE.id, resetToken.adminId));

        // Mark token as used
        await db
            .update(PASSWORD_RESET_TABLE)
            .set({ used: true })
            .where(eq(PASSWORD_RESET_TABLE.id, resetToken.id));

        return NextResponse.json({
            success: true,
            message: "Password reset successfully. You can now login with your new password.",
        });
    } catch (error) {
        console.error("Reset password error:", error);
        return NextResponse.json(
            { error: "Failed to reset password. Please try again." },
            { status: 500 }
        );
    }
}

/**
 * GET /api/admin/auth/reset-password?token=xxx
 * Verify if a reset token is still valid
 */
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const token = searchParams.get("token");

        if (!token) {
            return NextResponse.json({ valid: false, error: "No token provided" });
        }

        const tokens = await db
            .select({
                id: PASSWORD_RESET_TABLE.id,
                adminId: PASSWORD_RESET_TABLE.adminId,
                expiresAt: PASSWORD_RESET_TABLE.expiresAt,
                adminName: ADMIN_TABLE.name,
                adminEmail: ADMIN_TABLE.email,
            })
            .from(PASSWORD_RESET_TABLE)
            .leftJoin(ADMIN_TABLE, eq(PASSWORD_RESET_TABLE.adminId, ADMIN_TABLE.id))
            .where(
                and(
                    eq(PASSWORD_RESET_TABLE.token, token),
                    eq(PASSWORD_RESET_TABLE.used, false),
                    gt(PASSWORD_RESET_TABLE.expiresAt, new Date())
                )
            );

        if (tokens.length === 0) {
            return NextResponse.json({ valid: false, error: "Invalid or expired token" });
        }

        return NextResponse.json({
            valid: true,
            name: tokens[0].adminName,
            email: tokens[0].adminEmail,
        });
    } catch (error) {
        console.error("Token verify error:", error);
        return NextResponse.json({ valid: false, error: "Verification failed" });
    }
}
