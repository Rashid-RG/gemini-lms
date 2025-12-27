import { db } from "@/configs/db";
import { SUPPORT_TICKETS_TABLE } from "@/configs/schema";
import { eq, desc } from "drizzle-orm";

// Global map to track active SSE connections per user
const connections = new Map();

export const dynamic = 'force-dynamic';

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const userEmail = searchParams.get('userEmail')?.toLowerCase();

    // EventSource can't send custom headers, so we rely on query param + Clerk middleware protection
    if (!userEmail) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
            status: 403,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
        async start(controller) {
            // Store connection
            if (!connections.has(userEmail)) {
                connections.set(userEmail, []);
            }
            connections.get(userEmail).push(controller);

            // Send initial data
            try {
                const tickets = await db.select()
                    .from(SUPPORT_TICKETS_TABLE)
                    .where(eq(SUPPORT_TICKETS_TABLE.userEmail, userEmail))
                    .orderBy(desc(SUPPORT_TICKETS_TABLE.updatedAt))
                    .limit(5);
                
                const data = `data: ${JSON.stringify({ type: 'initial', tickets })}\n\n`;
                try {
                    controller.enqueue(encoder.encode(data));
                } catch (enqueueErr) {
                    console.warn('SSE enqueue error (likely client disconnected):', enqueueErr.code);
                    // Don't try to close - just return
                    return;
                }
            } catch (error) {
                console.error('SSE initial fetch error:', error);
                // Don't try to close - just return
                return;
            }

            // Keep alive ping every 30s
            const keepAlive = setInterval(() => {
                try {
                    controller.enqueue(encoder.encode(': keepalive\n\n'));
                } catch (err) {
                    clearInterval(keepAlive);
                    // Don't try to close - controller may already be closed
                }
            }, 30000);

            // Cleanup on close
            req.signal.addEventListener('abort', () => {
                clearInterval(keepAlive);
                const userConnections = connections.get(userEmail);
                if (userConnections) {
                    const idx = userConnections.indexOf(controller);
                    if (idx > -1) userConnections.splice(idx, 1);
                    if (userConnections.length === 0) {
                        connections.delete(userEmail);
                    }
                }
                try {
                    controller.close();
                } catch (closeErr) {
                    // Ignore close errors
                }
            });
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
        }
    });
}

// Helper to broadcast updates to specific user
export function notifyUser(userEmail, ticket) {
    const userConnections = connections.get(userEmail?.toLowerCase());
    if (!userConnections || userConnections.length === 0) return;

    const encoder = new TextEncoder();
    const data = `data: ${JSON.stringify({ type: 'update', ticket })}\n\n`;
    const encoded = encoder.encode(data);

    userConnections.forEach(controller => {
        try {
            controller.enqueue(encoded);
        } catch (err) {
            console.error('Failed to send SSE update:', err);
        }
    });
}

// Helper to broadcast updates to all admin users
export function notifyAdmins(ticket) {
    // Check both env variable names for admin emails
    const adminEmails = process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS || '';
    const adminList = adminEmails.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
    
    console.log('Notifying admins:', adminList, 'Connections:', Array.from(connections.keys()));
    
    const encoder = new TextEncoder();
    const data = `data: ${JSON.stringify({ type: 'admin-update', ticket })}\n\n`;
    const encoded = encoder.encode(data);

    adminList.forEach(adminEmail => {
        const adminConnections = connections.get(adminEmail);
        console.log(`Admin ${adminEmail} connections:`, adminConnections?.length || 0);
        if (!adminConnections || adminConnections.length === 0) return;

        adminConnections.forEach(controller => {
            try {
                controller.enqueue(encoded);
            } catch (err) {
                console.error('Failed to send admin SSE update:', err);
            }
        });
    });
}
