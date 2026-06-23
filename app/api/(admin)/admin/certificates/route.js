import { db } from "@/configs/db";
import { CERTIFICATES_TABLE, STUDENT_PROGRESS_TABLE } from "@/configs/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/adminApiAuth";

/**
 * DELETE /api/admin/certificates
 * Delete (revoke) a student's certificate and reset their course completion status
 */
export async function DELETE(req) {
    const auth = await requireAdminAuth();
    if (!auth.authenticated) return auth.error;

    try {
        const { searchParams } = new URL(req.url);
        const certificateId = searchParams.get("certificateId");

        if (!certificateId) {
            return NextResponse.json(
                { error: "Missing certificateId parameter" },
                { status: 400 }
            );
        }

        // 1. Fetch certificate to get courseId and studentEmail
        const certs = await db
            .select()
            .from(CERTIFICATES_TABLE)
            .where(eq(CERTIFICATES_TABLE.certificateId, certificateId));

        if (certs.length === 0) {
            return NextResponse.json(
                { error: "Certificate not found" },
                { status: 404 }
            );
        }

        const { courseId, studentEmail } = certs[0];

        // 2. Delete from CERTIFICATES_TABLE
        await db
            .delete(CERTIFICATES_TABLE)
            .where(eq(CERTIFICATES_TABLE.certificateId, certificateId));

        // 3. Reset progress table
        await db
            .update(STUDENT_PROGRESS_TABLE)
            .set({
                status: 'In Progress',
                completedAt: null
            })
            .where(
                and(
                    eq(STUDENT_PROGRESS_TABLE.courseId, courseId),
                    eq(STUDENT_PROGRESS_TABLE.studentEmail, studentEmail)
                )
            );

        return NextResponse.json({
            success: true,
            message: `Certificate ${certificateId} revoked successfully. Course status reset to In Progress.`
        });

    } catch (error) {
        console.error("Error revoking certificate:", error);
        return NextResponse.json(
            { error: "Failed to revoke certificate" },
            { status: 500 }
        );
    }
}
