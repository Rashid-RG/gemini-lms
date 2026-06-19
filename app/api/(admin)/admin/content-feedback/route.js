import { db } from "@/configs/db";
import { CONTENT_FEEDBACK_TABLE, ADMIN_ACTIVITY_LOG_TABLE } from "@/configs/schema";
import { eq, and, desc, count, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/adminApiAuth";

/**
 * GET /api/admin/content-feedback
 * Admin: Fetch all student content feedback
 */
export async function GET(req) {
    const auth = await requireAdminAuth();
    if (!auth.authenticated) return auth.error;

    try {
        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status") || "open";
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const offset = (page - 1) * limit;

        const conditions = [];
        if (status && status !== "all") {
            conditions.push(eq(CONTENT_FEEDBACK_TABLE.status, status));
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const feedback = await db
            .select()
            .from(CONTENT_FEEDBACK_TABLE)
            .where(whereClause)
            .orderBy(desc(CONTENT_FEEDBACK_TABLE.createdAt))
            .limit(limit)
            .offset(offset);

        // Stats
        const statsResult = await db
            .select({
                status: CONTENT_FEEDBACK_TABLE.status,
                total: count(),
            })
            .from(CONTENT_FEEDBACK_TABLE)
            .groupBy(CONTENT_FEEDBACK_TABLE.status);

        const stats = { open: 0, acknowledged: 0, fixed: 0, dismissed: 0, total: 0 };
        for (const row of statsResult) {
            stats[row.status] = Number(row.total);
            stats.total += Number(row.total);
        }

        const totalResult = await db
            .select({ total: count() })
            .from(CONTENT_FEEDBACK_TABLE)
            .where(whereClause);

        return NextResponse.json({
            feedback,
            stats,
            pagination: {
                page,
                limit,
                total: Number(totalResult[0]?.total || 0),
                totalPages: Math.ceil(Number(totalResult[0]?.total || 0) / limit),
            },
        });
    } catch (error) {
        console.error("Admin Content Feedback GET Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch content feedback" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/admin/content-feedback
 * Admin: Respond to / resolve student feedback
 */
export async function POST(req) {
    const auth = await requireAdminAuth();
    if (!auth.authenticated) return auth.error;

    try {
        const { feedbackId, action, adminResponse } = await req.json();

        if (!feedbackId || !action) {
            return NextResponse.json(
                { error: "Missing feedbackId or action" },
                { status: 400 }
            );
        }

        const validActions = ["acknowledge", "fix", "dismiss"];
        if (!validActions.includes(action)) {
            return NextResponse.json(
                { error: "Invalid action. Must be one of: " + validActions.join(", ") },
                { status: 400 }
            );
        }

        const statusMap = {
            acknowledge: "acknowledged",
            fix: "fixed",
            dismiss: "dismissed",
        };

        await db
            .update(CONTENT_FEEDBACK_TABLE)
            .set({
                status: statusMap[action],
                adminResponse: adminResponse || null,
                resolvedBy: auth.admin.email,
                resolvedAt: new Date(),
            })
            .where(eq(CONTENT_FEEDBACK_TABLE.id, feedbackId));

        // Log activity
        await db.insert(ADMIN_ACTIVITY_LOG_TABLE).values({
            adminEmail: auth.admin.email,
            action: `feedback_${action}`,
            targetType: "content_feedback",
            targetId: String(feedbackId),
            details: { action, adminResponse },
            createdAt: new Date(),
        });

        return NextResponse.json({
            success: true,
            message: `Feedback ${statusMap[action]} successfully`,
        });
    } catch (error) {
        console.error("Admin Content Feedback POST Error:", error);
        return NextResponse.json(
            { error: "Failed to update feedback" },
            { status: 500 }
        );
    }
}
