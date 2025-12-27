import { db } from "@/configs/db";
import { SUPPORT_TICKETS_TABLE } from "@/configs/schema";
import { eq, desc } from "drizzle-orm";
import { NextResponse } from "next/server";

const isAdminRequest = (req) => {
    const adminEmail = req.headers.get('x-admin-email')?.toLowerCase();
    const adminList = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
    return adminEmail && adminList.includes(adminEmail);
}

const isUserRequest = (req, userEmail) => {
    const headerEmail = req.headers.get('x-user-email')?.toLowerCase();
    return headerEmail && userEmail && headerEmail === userEmail.toLowerCase();
}

export async function POST(req) {
    try {
        const { userEmail, subject, message, category, aiIssue, metadata } = await req.json();

        if (!userEmail || !subject || !message) {
            return NextResponse.json({ error: 'userEmail, subject, and message are required' }, { status: 400 });
        }

        const [inserted] = await db.insert(SUPPORT_TICKETS_TABLE).values({
            userEmail,
            subject,
            message,
            category: category || 'General',
            aiIssue: aiIssue === true,
            metadata: metadata || null,
        }).returning();

        return NextResponse.json({ result: inserted });
    } catch (error) {
        console.error('Error creating support ticket:', error);
        return NextResponse.json({ error: 'Failed to submit support ticket' }, { status: 500 });
    }
}

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status');
        const userEmail = searchParams.get('userEmail');

        // Admin path
        if (isAdminRequest(req)) {
            let query = db.select().from(SUPPORT_TICKETS_TABLE)
                .orderBy(desc(SUPPORT_TICKETS_TABLE.createdAt))
                .limit(200);

            if (status) {
                query = query.where(eq(SUPPORT_TICKETS_TABLE.status, status));
            }

            const tickets = await query;
            return NextResponse.json({ result: tickets });
        }

        // User path
        if (userEmail && isUserRequest(req, userEmail)) {
            const tickets = await db.select().from(SUPPORT_TICKETS_TABLE)
                .where(eq(SUPPORT_TICKETS_TABLE.userEmail, userEmail))
                .orderBy(desc(SUPPORT_TICKETS_TABLE.updatedAt))
                .limit(50);
            return NextResponse.json({ result: tickets });
        }

        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    } catch (error) {
        console.error('Error fetching support tickets:', error);
        return NextResponse.json({ error: 'Failed to fetch support tickets' }, { status: 500 });
    }
}

export async function PATCH(req) {
    try {
        const { id, status, adminMessage, userReply } = await req.json();

        // Check if admin or user request
        const isAdmin = isAdminRequest(req);
        const userEmail = req.headers.get('x-user-email')?.toLowerCase();

        if (!isAdmin && !userEmail) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        if (!id) {
            return NextResponse.json({ error: 'id is required' }, { status: 400 });
        }

        // Build update object based on who is making the request
        const updateData = { updatedAt: new Date() };
        if (isAdmin) {
            if (status) updateData.status = status;
            if (adminMessage !== undefined) updateData.adminMessage = adminMessage;
        } else {
            // User reply - verify ownership
            const [ticket] = await db.select().from(SUPPORT_TICKETS_TABLE).where(eq(SUPPORT_TICKETS_TABLE.id, id));
            if (!ticket || ticket.userEmail.toLowerCase() !== userEmail) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
            // Block replies on closed tickets
            if (ticket.status === 'Closed') {
                return NextResponse.json({ error: 'Cannot reply to a closed ticket' }, { status: 400 });
            }
            if (userReply !== undefined) updateData.userReply = userReply;
            if (status) updateData.status = status;
        }

        const [updated] = await db.update(SUPPORT_TICKETS_TABLE)
            .set(updateData)
            .where(eq(SUPPORT_TICKETS_TABLE.id, id))
            .returning();

        // Trigger SSE notification to user
        try {
            const { notifyUser } = await import('@/app/api/notifications/stream/route');
            notifyUser(updated.userEmail, updated);
        } catch (err) {
            console.error('Failed to send SSE notification:', err);
        }

        // If user replied, notify all admins
        if (!isAdmin && userReply) {
            try {
                const { notifyAdmins } = await import('@/app/api/notifications/stream/route');
                if (notifyAdmins) {
                    notifyAdmins(updated);
                }
            } catch (err) {
                console.error('Failed to notify admins:', err);
            }
        }

        return NextResponse.json({ result: updated });
    } catch (error) {
        console.error('Error updating support ticket:', error);
        return NextResponse.json({ error: 'Failed to update support ticket' }, { status: 500 });
    }
}
