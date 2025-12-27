import { db } from "@/configs/db";
import { SUPPORT_TICKETS_TABLE } from "@/configs/schema";
import { eq, desc, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/adminApiAuth";

/**
 * GET /api/admin/support
 * Get all support tickets with optional status filter
 */
export async function GET(req) {
    // Verify admin session
    const auth = await requireAdminAuth();
    if (!auth.authenticated) return auth.error;

    try {
        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status');

        // Build query
        let query = db.select().from(SUPPORT_TICKETS_TABLE)
            .orderBy(desc(SUPPORT_TICKETS_TABLE.createdAt))
            .limit(200);

        if (status && status !== 'all') {
            query = query.where(eq(SUPPORT_TICKETS_TABLE.status, status));
        }

        const tickets = await query;

        // Get stats
        const statsResult = await db
            .select({
                status: SUPPORT_TICKETS_TABLE.status,
                count: sql`count(*)`
            })
            .from(SUPPORT_TICKETS_TABLE)
            .groupBy(SUPPORT_TICKETS_TABLE.status);

        const stats = {
            open: 0,
            inReview: 0,
            resolved: 0,
            closed: 0
        };

        statsResult.forEach(s => {
            const count = Number(s.count);
            if (s.status === 'Open') stats.open = count;
            else if (s.status === 'In Review') stats.inReview = count;
            else if (s.status === 'Resolved') stats.resolved = count;
            else if (s.status === 'Closed') stats.closed = count;
        });

        return NextResponse.json({ tickets, stats });

    } catch (error) {
        console.error("Error fetching support tickets:", error);
        return NextResponse.json(
            { error: "Failed to fetch support tickets" },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/admin/support
 * Update ticket status or add admin message
 */
export async function PATCH(req) {
    // Verify admin session
    const auth = await requireAdminAuth();
    if (!auth.authenticated) return auth.error;

    try {
        const { ticketId, status, adminMessage } = await req.json();

        if (!ticketId) {
            return NextResponse.json(
                { error: "ticketId is required" },
                { status: 400 }
            );
        }

        // Build update object
        const updateData = { updatedAt: new Date() };
        if (status) updateData.status = status;
        if (adminMessage !== undefined) updateData.adminMessage = adminMessage;

        const result = await db
            .update(SUPPORT_TICKETS_TABLE)
            .set(updateData)
            .where(eq(SUPPORT_TICKETS_TABLE.id, ticketId))
            .returning();

        if (result.length === 0) {
            return NextResponse.json(
                { error: "Ticket not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            ticket: result[0]
        });

    } catch (error) {
        console.error("Error updating support ticket:", error);
        return NextResponse.json(
            { error: "Failed to update ticket" },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/admin/support
 * Delete a support ticket
 */
export async function DELETE(req) {
    // Verify admin session
    const auth = await requireAdminAuth();
    if (!auth.authenticated) return auth.error;

    try {
        const { ticketId } = await req.json();

        if (!ticketId) {
            return NextResponse.json(
                { error: "ticketId is required" },
                { status: 400 }
            );
        }

        const result = await db
            .delete(SUPPORT_TICKETS_TABLE)
            .where(eq(SUPPORT_TICKETS_TABLE.id, ticketId))
            .returning();

        if (result.length === 0) {
            return NextResponse.json(
                { error: "Ticket not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "Ticket deleted successfully"
        });

    } catch (error) {
        console.error("Error deleting support ticket:", error);
        return NextResponse.json(
            { error: "Failed to delete ticket" },
            { status: 500 }
        );
    }
}
