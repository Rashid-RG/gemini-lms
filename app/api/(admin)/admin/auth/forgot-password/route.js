import { db } from "@/configs/db";
import { ADMIN_TABLE, PASSWORD_RESET_TABLE } from "@/configs/schema";
import { eq, and, gt } from "drizzle-orm";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { emailService } from "@/lib/emailService";

/**
 * POST /api/admin/auth/forgot-password
 * Generate a password reset token and send email
 */
export async function POST(req) {
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json(
                { error: "Email is required" },
                { status: 400 }
            );
        }

        // Always return success to prevent email enumeration
        const successMsg = "If an account exists with this email, a password reset link has been sent.";

        // Find admin
        const admins = await db
            .select({ id: ADMIN_TABLE.id, name: ADMIN_TABLE.name, isActive: ADMIN_TABLE.isActive })
            .from(ADMIN_TABLE)
            .where(eq(ADMIN_TABLE.email, email.toLowerCase()));

        if (admins.length === 0 || !admins[0].isActive) {
            // Don't reveal if email exists
            return NextResponse.json({ success: true, message: successMsg });
        }

        const admin = admins[0];

        // Generate secure token
        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        // Invalidate existing tokens for this admin
        await db
            .update(PASSWORD_RESET_TABLE)
            .set({ used: true })
            .where(
                and(
                    eq(PASSWORD_RESET_TABLE.adminId, admin.id),
                    eq(PASSWORD_RESET_TABLE.used, false)
                )
            );

        // Create new token
        await db.insert(PASSWORD_RESET_TABLE).values({
            adminId: admin.id,
            token,
            expiresAt,
            used: false,
            createdAt: new Date(),
        });

        // Build reset URL
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
        const resetUrl = `${baseUrl}/admin/reset-password?token=${token}`;

        // Try to send email
        try {
            if (process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
                await emailService.sendHtmlEmail({
                    to: email.toLowerCase(),
                    subject: "Password Reset - Gemini LMS Admin",
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
                            <div style="text-align: center; margin-bottom: 30px;">
                                <h1 style="color: #1a1a1a; font-size: 24px;">🔐 Password Reset</h1>
                            </div>
                            <p style="color: #333; font-size: 16px;">Hi <strong>${admin.name}</strong>,</p>
                            <p style="color: #555; font-size: 14px; line-height: 1.6;">
                                We received a request to reset your admin password. Click the button below to set a new password:
                            </p>
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${resetUrl}" 
                                   style="background-color: #7c3aed; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
                                    Reset Password
                                </a>
                            </div>
                            <p style="color: #888; font-size: 12px; line-height: 1.5;">
                                This link expires in <strong>1 hour</strong>. If you didn't request this, you can safely ignore this email.
                            </p>
                            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                            <p style="color: #aaa; font-size: 11px; text-align: center;">Gemini LMS Admin Portal</p>
                        </div>
                    `,
                });
                console.log(`Password reset email sent to ${email}`);
            } else {
                console.log(`⚠️ SMTP credentials not set. Reset URL: ${resetUrl}`);
            }
        } catch (emailErr) {
            // Email failed, but token is created — log the URL for manual use
            console.error("Failed to send reset email:", emailErr.message);
            console.log(`Manual reset URL: ${resetUrl}`);
        }

        return NextResponse.json({ success: true, message: successMsg });
    } catch (error) {
        console.error("Forgot password error:", error);
        return NextResponse.json(
            { error: "Something went wrong. Please try again." },
            { status: 500 }
        );
    }
}
