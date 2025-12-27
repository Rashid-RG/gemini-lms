import { db } from "@/configs/db";
import { ADMIN_ACTIVITY_LOG_TABLE } from "@/configs/schema";
import { desc, eq, and, gte, lte, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/adminApiAuth";

/**
 * GET /api/admin/activity-log
 * Fetch admin activity logs with pagination and filters
 */
export async function GET(req) {
    const auth = await requireAdminAuth();
    if (!auth.authenticated) return auth.error;

    try {
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');
        const adminEmail = searchParams.get('admin') || '';
        const action = searchParams.get('action') || '';
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const offset = (page - 1) * limit;

        // Build conditions
        let conditions = [];

        if (adminEmail) {
            conditions.push(eq(ADMIN_ACTIVITY_LOG_TABLE.adminEmail, adminEmail));
        }

        if (action) {
            conditions.push(eq(ADMIN_ACTIVITY_LOG_TABLE.action, action));
        }

        if (startDate) {
            conditions.push(gte(ADMIN_ACTIVITY_LOG_TABLE.createdAt, new Date(startDate)));
        }

        if (endDate) {
            conditions.push(lte(ADMIN_ACTIVITY_LOG_TABLE.createdAt, new Date(endDate)));
        }

        // Get total count
        let countQuery = db.select({ count: sql`count(*)::int` }).from(ADMIN_ACTIVITY_LOG_TABLE);
        if (conditions.length > 0) {
            countQuery = countQuery.where(and(...conditions));
        }
        const totalResult = await countQuery;
        const totalCount = totalResult[0]?.count || 0;

        // Get logs with pagination
        let query = db
            .select()
            .from(ADMIN_ACTIVITY_LOG_TABLE)
            .orderBy(desc(ADMIN_ACTIVITY_LOG_TABLE.createdAt))
            .limit(limit)
            .offset(offset);

        if (conditions.length > 0) {
            query = query.where(and(...conditions));
        }

        const logs = await query;

        // Get unique action types for filter dropdown
        const actionTypes = await db
            .selectDistinct({ action: ADMIN_ACTIVITY_LOG_TABLE.action })
            .from(ADMIN_ACTIVITY_LOG_TABLE);

        // Get unique admins for filter dropdown
        const admins = await db
            .selectDistinct({ adminEmail: ADMIN_ACTIVITY_LOG_TABLE.adminEmail })
            .from(ADMIN_ACTIVITY_LOG_TABLE);

        return NextResponse.json({
            logs,
            totalCount,
            page,
            limit,
            totalPages: Math.ceil(totalCount / limit),
            filters: {
                actionTypes: actionTypes.map(a => a.action),
                admins: admins.map(a => a.adminEmail)
            }
        });

    } catch (error) {
        console.error("Error fetching activity logs:", error);
        return NextResponse.json(
            { error: "Failed to fetch activity logs" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/admin/activity-log
 * Log an admin activity (internal use)
 */
export async function POST(req) {
    const auth = await requireAdminAuth();
    if (!auth.authenticated) return auth.error;

    try {
        const body = await req.json();
        const { action, targetType, targetId, details, studentEmail, courseId } = body;

        if (!action || !targetType || !targetId) {
            return NextResponse.json(
                { error: "Missing required fields: action, targetType, targetId" },
                { status: 400 }
            );
        }

        const result = await db.insert(ADMIN_ACTIVITY_LOG_TABLE).values({
            adminEmail: auth.admin?.email || 'unknown',
            action,
            targetType,
            targetId: String(targetId),
            details: JSON.stringify(details || {}),
            studentEmail: studentEmail || null,
            courseId: courseId || null,
            createdAt: new Date()
        }).returning();

        return NextResponse.json({ result: result[0] });

    } catch (error) {
        console.error("Error logging activity:", error);
        return NextResponse.json(
            { error: "Failed to log activity" },
            { status: 500 }
        );
    }
}
