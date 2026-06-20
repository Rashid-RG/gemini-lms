import { NextResponse } from "next/server";
import { db } from "@/configs/db";
import { ANNOUNCEMENTS_TABLE, ADMIN_ACTIVITY_LOG_TABLE } from "@/configs/schema";
import { eq, desc } from "drizzle-orm";
import { requireAdminOrAbove } from "@/lib/adminApiAuth";
import { auth } from "@clerk/nextjs/server";
import { getAuthEmail } from "@/lib/clerkUtils";

/**
 * GET /api/admin/announcements
 * Get all announcements (admin view) or active announcements (user view)
 */
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url, 'http://localhost');
        const isAdmin = searchParams.get('admin') === 'true';
        const userEmail = searchParams.get('userEmail');

        if (isAdmin) {
            const authResult = await requireAdminOrAbove();
            if (!authResult.authenticated) return authResult.error;
        } else {
            const { userId, sessionClaims } = await auth();
            if (!userId) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }
            if (userEmail) {
                const authEmail = await getAuthEmail(sessionClaims);
                if (authEmail !== userEmail.trim().toLowerCase()) {
                    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
                }
            }
        }

        let announcements;

        if (isAdmin) {
            // Admin view - get all announcements
            announcements = await db.select()
                .from(ANNOUNCEMENTS_TABLE)
                .orderBy(desc(ANNOUNCEMENTS_TABLE.isPinned), desc(ANNOUNCEMENTS_TABLE.createdAt));
        } else {
            // User view - get only active, non-expired announcements
            const now = new Date();
            
            // First get all announcements then filter in JS for compatibility
            const allAnnouncements = await db.select()
                .from(ANNOUNCEMENTS_TABLE)
                .orderBy(desc(ANNOUNCEMENTS_TABLE.isPinned), desc(ANNOUNCEMENTS_TABLE.priority), desc(ANNOUNCEMENTS_TABLE.createdAt));
            
            announcements = allAnnouncements.filter(a => {
                // Check if active (handle both boolean and string)
                const isActive = a.isActive === true || a.isActive === 'true';
                if (!isActive) return false;
                
                // Check expiration
                if (a.expiresAt) {
                    const expiresAt = new Date(a.expiresAt);
                    if (expiresAt <= now) return false;
                }
                
                return true;
            });
        }

        // Filter out dismissed announcements for user view
        let filteredAnnouncements = announcements;
        if (!isAdmin && userEmail) {
            filteredAnnouncements = announcements.filter(a => {
                let dismissed = a.dismissedBy;
                if (typeof dismissed === 'string') {
                    try {
                        dismissed = JSON.parse(dismissed);
                    } catch (_) {
                        dismissed = [];
                    }
                }
                if (!Array.isArray(dismissed)) {
                    dismissed = [];
                }
                return !dismissed.includes(userEmail);
            });
        }

        console.log('Announcements API:', { isAdmin, userEmail, count: filteredAnnouncements.length });
        return NextResponse.json({ announcements: filteredAnnouncements });
    } catch (error) {
        console.error('Error fetching announcements:', error);
        return NextResponse.json({ error: 'Failed to fetch announcements' }, { status: 500 });
    }
}

/**
 * POST /api/admin/announcements
 * Create a new announcement
 */
export async function POST(req) {
    const authResult = await requireAdminOrAbove();
    if (!authResult.authenticated) return authResult.error;

    try {
        const { 
            title, 
            content, 
            type = 'info', 
            priority = 'normal',
            targetAudience = 'all',
            isPinned = false,
            expiresAt,
            adminEmail 
        } = await req.json();

        if (!title || !content) {
            return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
        }

        // Input validation: length limits
        if (typeof title !== 'string' || title.length > 200) {
            return NextResponse.json({ error: 'Title must be under 200 characters' }, { status: 400 });
        }
        if (typeof content !== 'string' || content.length > 10000) {
            return NextResponse.json({ error: 'Content must be under 10000 characters' }, { status: 400 });
        }

        if (!adminEmail) {
            return NextResponse.json({ error: 'Admin email is required' }, { status: 400 });
        }

        const result = await db.insert(ANNOUNCEMENTS_TABLE).values({
            title,
            content,
            type,
            priority,
            targetAudience,
            isPinned,
            expiresAt: expiresAt ? new Date(expiresAt) : null,
            createdBy: adminEmail
        }).returning();

        // Log activity
        await db.insert(ADMIN_ACTIVITY_LOG_TABLE).values({
            adminEmail,
            action: 'create_announcement',
            targetType: 'announcement',
            targetId: result[0].id.toString(),
            details: { title, type, priority, targetAudience }
        });

        return NextResponse.json({ 
            success: true, 
            announcement: result[0] 
        });
    } catch (error) {
        console.error('Error creating announcement:', error);
        return NextResponse.json({ error: 'Failed to create announcement' }, { status: 500 });
    }
}

/**
 * PUT /api/admin/announcements
 * Update an announcement or dismiss it (for users)
 */
export async function PUT(req) {
    try {
        const { id, updates, adminEmail, userEmail, action } = await req.json();

        if (!id) {
            return NextResponse.json({ error: 'Announcement ID is required' }, { status: 400 });
        }

        // Handle user dismissal
        if (action === 'dismiss' && userEmail) {
            const { userId, sessionClaims } = await auth();
            if (!userId) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }
            const authEmail = await getAuthEmail(sessionClaims);
            if (authEmail !== userEmail.trim().toLowerCase()) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }

            const announcement = await db.select()
                .from(ANNOUNCEMENTS_TABLE)
                .where(eq(ANNOUNCEMENTS_TABLE.id, id))
                .limit(1);

            if (announcement.length === 0) {
                return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
            }

            let dismissed = announcement[0].dismissedBy;
            if (typeof dismissed === 'string') {
                try {
                    dismissed = JSON.parse(dismissed);
                } catch (_) {
                    dismissed = [];
                }
            }
            if (!Array.isArray(dismissed)) {
                dismissed = [];
            }

            if (!dismissed.includes(userEmail)) {
                dismissed.push(userEmail);
                await db.update(ANNOUNCEMENTS_TABLE)
                    .set({ dismissedBy: dismissed })
                    .where(eq(ANNOUNCEMENTS_TABLE.id, id));
            }

            return NextResponse.json({ success: true, message: 'Announcement dismissed' });
        }

        // Handle admin updates
        const authResult = await requireAdminOrAbove();
        if (!authResult.authenticated) return authResult.error;

        if (!adminEmail) {
            return NextResponse.json({ error: 'Admin email is required' }, { status: 400 });
        }

        const allowedFields = ['title', 'content', 'type', 'priority', 'targetAudience', 'isActive', 'isPinned', 'expiresAt'];
        const sanitizedUpdates = { updatedAt: new Date() };
        
        for (const [key, value] of Object.entries(updates || {})) {
            if (allowedFields.includes(key)) {
                if (key === 'expiresAt' && value) {
                    sanitizedUpdates[key] = new Date(value);
                } else {
                    sanitizedUpdates[key] = value;
                }
            }
        }

        await db.update(ANNOUNCEMENTS_TABLE)
            .set(sanitizedUpdates)
            .where(eq(ANNOUNCEMENTS_TABLE.id, id));

        // Log activity
        await db.insert(ADMIN_ACTIVITY_LOG_TABLE).values({
            adminEmail,
            action: 'update_announcement',
            targetType: 'announcement',
            targetId: id.toString(),
            details: { updates: sanitizedUpdates }
        });

        return NextResponse.json({ success: true, message: 'Announcement updated' });
    } catch (error) {
        console.error('Error updating announcement:', error);
        return NextResponse.json({ error: 'Failed to update announcement' }, { status: 500 });
    }
}

/**
 * DELETE /api/admin/announcements
 * Delete an announcement
 */
export async function DELETE(req) {
    const authResult = await requireAdminOrAbove();
    if (!authResult.authenticated) return authResult.error;

    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        const adminEmail = searchParams.get('adminEmail');

        if (!id) {
            return NextResponse.json({ error: 'Announcement ID is required' }, { status: 400 });
        }

        // Get announcement info for logging
        const announcement = await db.select()
            .from(ANNOUNCEMENTS_TABLE)
            .where(eq(ANNOUNCEMENTS_TABLE.id, parseInt(id)))
            .limit(1);

        if (announcement.length === 0) {
            return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
        }

        await db.delete(ANNOUNCEMENTS_TABLE)
            .where(eq(ANNOUNCEMENTS_TABLE.id, parseInt(id)));

        // Log activity
        if (adminEmail) {
            await db.insert(ADMIN_ACTIVITY_LOG_TABLE).values({
                adminEmail,
                action: 'delete_announcement',
                targetType: 'announcement',
                targetId: id,
                details: { title: announcement[0].title }
            });
        }

        return NextResponse.json({ success: true, message: 'Announcement deleted' });
    } catch (error) {
        console.error('Error deleting announcement:', error);
        return NextResponse.json({ error: 'Failed to delete announcement' }, { status: 500 });
    }
}
