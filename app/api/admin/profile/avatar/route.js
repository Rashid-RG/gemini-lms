import { db } from "@/configs/db";
import { ADMIN_TABLE } from "@/configs/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/adminApiAuth";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB limit
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/**
 * POST /api/admin/profile/avatar
 * Upload profile picture (base64 stored in DB)
 */
export async function POST(req) {
    const auth = await requireAdminAuth();
    if (!auth.authenticated) return auth.error;

    try {
        const formData = await req.formData();
        const file = formData.get("avatar");

        if (!file || typeof file === "string") {
            return NextResponse.json(
                { error: "No file provided" },
                { status: 400 }
            );
        }

        // Validate file type
        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json(
                { error: "Invalid file type. Allowed: JPEG, PNG, WebP, GIF" },
                { status: 400 }
            );
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: "File too large. Maximum size is 2MB" },
                { status: 400 }
            );
        }

        // Convert to base64 data URL
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64 = buffer.toString("base64");
        const dataUrl = `data:${file.type};base64,${base64}`;

        // Store in database
        await db
            .update(ADMIN_TABLE)
            .set({
                profilePic: dataUrl,
                updatedAt: new Date(),
            })
            .where(eq(ADMIN_TABLE.id, auth.admin.id));

        return NextResponse.json({
            success: true,
            profilePic: dataUrl,
            message: "Profile picture updated",
        });
    } catch (error) {
        console.error("Avatar upload error:", error);
        return NextResponse.json(
            { error: "Failed to upload profile picture" },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/admin/profile/avatar
 * Remove profile picture
 */
export async function DELETE(req) {
    const auth = await requireAdminAuth();
    if (!auth.authenticated) return auth.error;

    try {
        await db
            .update(ADMIN_TABLE)
            .set({
                profilePic: null,
                updatedAt: new Date(),
            })
            .where(eq(ADMIN_TABLE.id, auth.admin.id));

        return NextResponse.json({
            success: true,
            message: "Profile picture removed",
        });
    } catch (error) {
        console.error("Avatar delete error:", error);
        return NextResponse.json(
            { error: "Failed to remove profile picture" },
            { status: 500 }
        );
    }
}
