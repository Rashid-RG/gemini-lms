import { db } from "@/configs/db";
import { ADMIN_TABLE, TUTOR_ASSIGNMENT_TABLE, STUDY_MATERIAL_TABLE, ADMIN_ACTIVITY_LOG_TABLE } from "@/configs/schema";
import { eq, and, desc, count, sql, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAdminOrAbove, requireSuperAdmin } from "@/lib/adminApiAuth";
import { hashPassword } from "@/lib/adminAuth";

/**
 * GET /api/admin/team
 * List all team members with their assignment counts
 */
export async function GET(req) {
    const auth = await requireAdminOrAbove();
    if (!auth.authenticated) return auth.error;

    try {
        const { searchParams } = new URL(req.url);
        const role = searchParams.get("role");
        const activeOnly = searchParams.get("active") !== "false";

        // Build conditions
        const conditions = [];
        if (role) {
            conditions.push(eq(ADMIN_TABLE.role, role));
        }
        if (activeOnly) {
            conditions.push(eq(ADMIN_TABLE.isActive, true));
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        // Fetch team members
        const members = await db
            .select()
            .from(ADMIN_TABLE)
            .where(whereClause)
            .orderBy(
                sql`CASE WHEN ${ADMIN_TABLE.role} = 'super_admin' THEN 0
                     WHEN ${ADMIN_TABLE.role} = 'admin' THEN 1
                     ELSE 2 END`,
                desc(ADMIN_TABLE.createdAt)
            );

        // Get assignment counts per tutor
        const assignmentCounts = await db
            .select({
                adminId: TUTOR_ASSIGNMENT_TABLE.adminId,
                total: count(),
            })
            .from(TUTOR_ASSIGNMENT_TABLE)
            .groupBy(TUTOR_ASSIGNMENT_TABLE.adminId);

        const countMap = {};
        for (const row of assignmentCounts) {
            countMap[row.adminId] = Number(row.total);
        }

        // Format response (exclude password hash)
        const formatted = members.map(m => ({
            id: m.id,
            email: m.email,
            name: m.name,
            role: m.role,
            isActive: m.isActive,
            lastLoginAt: m.lastLoginAt,
            createdAt: m.createdAt,
            assignmentCount: countMap[m.id] || 0,
        }));

        // Get stats
        const stats = {
            total: formatted.length,
            superAdmins: formatted.filter(m => m.role === 'super_admin').length,
            admins: formatted.filter(m => m.role === 'admin').length,
            tutors: formatted.filter(m => m.role === 'tutor').length,
            active: formatted.filter(m => m.isActive).length,
        };

        return NextResponse.json({ members: formatted, stats });
    } catch (error) {
        console.error("Team GET Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch team members" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/admin/team
 * Create a new team member (tutor or admin)
 */
export async function POST(req) {
    const auth = await requireSuperAdmin();
    if (!auth.authenticated) return auth.error;

    try {
        const { email, name, password, role } = await req.json();

        if (!email || !name || !password) {
            return NextResponse.json(
                { error: "Email, name, and password are required" },
                { status: 400 }
            );
        }

        if (!['admin', 'tutor'].includes(role)) {
            return NextResponse.json(
                { error: "Role must be 'admin' or 'tutor'" },
                { status: 400 }
            );
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { error: "Invalid email format" },
                { status: 400 }
            );
        }

        // Validate password strength
        if (password.length < 8) {
            return NextResponse.json(
                { error: "Password must be at least 8 characters" },
                { status: 400 }
            );
        }

        // Check if email already exists
        const existing = await db
            .select({ id: ADMIN_TABLE.id })
            .from(ADMIN_TABLE)
            .where(eq(ADMIN_TABLE.email, email.toLowerCase()));

        if (existing.length > 0) {
            return NextResponse.json(
                { error: "A team member with this email already exists" },
                { status: 409 }
            );
        }

        const passwordHash = hashPassword(password);

        const result = await db.insert(ADMIN_TABLE).values({
            email: email.toLowerCase(),
            passwordHash,
            name,
            role,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        }).returning();

        // Log the action
        await db.insert(ADMIN_ACTIVITY_LOG_TABLE).values({
            adminEmail: auth.admin.email,
            action: 'team_create_member',
            targetType: 'admin',
            targetId: String(result[0].id),
            details: { memberEmail: email.toLowerCase(), role, name },
            createdAt: new Date(),
        });

        return NextResponse.json({
            success: true,
            member: {
                id: result[0].id,
                email: result[0].email,
                name: result[0].name,
                role: result[0].role,
                isActive: result[0].isActive,
            },
        });
    } catch (error) {
        console.error("Team POST Error:", error);
        return NextResponse.json(
            { error: "Failed to create team member" },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/admin/team
 * Update a team member (role, active status, name)
 */
export async function PUT(req) {
    const auth = await requireSuperAdmin();
    if (!auth.authenticated) return auth.error;

    try {
        const { memberId, name, role, isActive } = await req.json();

        if (!memberId) {
            return NextResponse.json(
                { error: "memberId is required" },
                { status: 400 }
            );
        }

        // Get the member
        const existing = await db
            .select()
            .from(ADMIN_TABLE)
            .where(eq(ADMIN_TABLE.id, memberId));

        if (existing.length === 0) {
            return NextResponse.json(
                { error: "Team member not found" },
                { status: 404 }
            );
        }

        const member = existing[0];

        // Prevent deactivating yourself
        if (member.email === auth.admin.email && isActive === false) {
            return NextResponse.json(
                { error: "You cannot deactivate your own account" },
                { status: 400 }
            );
        }

        // Prevent changing your own role
        if (member.email === auth.admin.email && role && role !== member.role) {
            return NextResponse.json(
                { error: "You cannot change your own role" },
                { status: 400 }
            );
        }

        if (role && !['admin', 'super_admin', 'tutor'].includes(role)) {
            return NextResponse.json(
                { error: "Invalid role" },
                { status: 400 }
            );
        }

        const updateData = { updatedAt: new Date() };
        if (name !== undefined) updateData.name = name;
        if (role !== undefined) updateData.role = role;
        if (isActive !== undefined) updateData.isActive = isActive;

        await db
            .update(ADMIN_TABLE)
            .set(updateData)
            .where(eq(ADMIN_TABLE.id, memberId));

        // Log the action
        await db.insert(ADMIN_ACTIVITY_LOG_TABLE).values({
            adminEmail: auth.admin.email,
            action: 'team_update_member',
            targetType: 'admin',
            targetId: String(memberId),
            details: {
                memberEmail: member.email,
                changes: updateData,
                previousRole: member.role,
            },
            createdAt: new Date(),
        });

        return NextResponse.json({
            success: true,
            message: "Team member updated successfully",
        });
    } catch (error) {
        console.error("Team PUT Error:", error);
        return NextResponse.json(
            { error: "Failed to update team member" },
            { status: 500 }
        );
    }
}
