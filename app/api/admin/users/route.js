import { db } from "@/configs/db";
import { USER_TABLE, STUDY_MATERIAL_TABLE, CREDIT_TRANSACTION_TABLE } from "@/configs/schema";
import { eq, desc, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { addCredits, CREDIT_TYPES } from "@/lib/credits";
import { requireAdminAuth } from "@/lib/adminApiAuth";

/**
 * GET /api/admin/users
 * Returns list of all users with their stats
 */
export async function GET(req) {
    // Verify admin session
    const auth = await requireAdminAuth();
    if (!auth.authenticated) return auth.error;

    try {
        // Get users with their course counts
        const users = await db.select({
            id: USER_TABLE.id,
            name: USER_TABLE.name,
            email: USER_TABLE.email,
            isMember: USER_TABLE.isMember,
            credits: USER_TABLE.credits,
            totalCreditsUsed: USER_TABLE.totalCreditsUsed,
            createdAt: USER_TABLE.createdAt
        }).from(USER_TABLE)
          .orderBy(desc(USER_TABLE.createdAt));

        // Get course counts per user
        const courseCounts = await db.select({
            createdBy: STUDY_MATERIAL_TABLE.createdBy,
            total: sql`count(*)`,
            ready: sql`count(*) filter (where ${STUDY_MATERIAL_TABLE.status} = 'Ready')`,
            generating: sql`count(*) filter (where ${STUDY_MATERIAL_TABLE.status} = 'Generating')`,
            failed: sql`count(*) filter (where ${STUDY_MATERIAL_TABLE.status} in ('Failed', 'Error'))`
        }).from(STUDY_MATERIAL_TABLE)
          .groupBy(STUDY_MATERIAL_TABLE.createdBy);

        // Merge course counts with user data
        const courseCountMap = {};
        courseCounts.forEach(cc => {
            courseCountMap[cc.createdBy] = {
                total: Number(cc.total),
                ready: Number(cc.ready),
                generating: Number(cc.generating),
                failed: Number(cc.failed)
            };
        });

        const usersWithStats = users.map(user => ({
            ...user,
            courses: courseCountMap[user.email] || { total: 0, ready: 0, generating: 0, failed: 0 }
        }));

        return NextResponse.json({ users: usersWithStats });

    } catch (error) {
        console.error("Admin users error:", error);
        return NextResponse.json(
            { error: "Failed to fetch users" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/admin/users
 * Admin actions: adjust credits, toggle membership
 */
export async function POST(req) {
    // Verify admin session
    const auth = await requireAdminAuth();
    if (!auth.authenticated) return auth.error;

    try {
        const { action, userEmail, amount, reason } = await req.json();
        const adminEmail = auth.admin?.email;

        if (!action || !userEmail) {
            return NextResponse.json(
                { error: "action and userEmail are required" },
                { status: 400 }
            );
        }

        // Verify user exists
        const users = await db.select().from(USER_TABLE)
            .where(eq(USER_TABLE.email, userEmail));
        
        if (users.length === 0) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }

        const user = users[0];

        switch (action) {
            case 'add_credits': {
                if (!amount || amount <= 0) {
                    return NextResponse.json(
                        { error: "Invalid credit amount" },
                        { status: 400 }
                    );
                }

                const result = await addCredits(userEmail, amount, {
                    type: CREDIT_TYPES.ADMIN_ADJUSTMENT,
                    reason: reason || `Admin credit adjustment: +${amount}`,
                    createdBy: `admin:${adminEmail || 'unknown'}`
                });

                if (!result.success) {
                    return NextResponse.json(
                        { error: result.error },
                        { status: 400 }
                    );
                }

                return NextResponse.json({
                    success: true,
                    message: `Added ${amount} credits to ${userEmail}`,
                    newBalance: result.newBalance
                });
            }

            case 'toggle_membership': {
                const newMemberStatus = !user.isMember;
                
                await db.update(USER_TABLE)
                    .set({ 
                        isMember: newMemberStatus,
                        updatedAt: new Date()
                    })
                    .where(eq(USER_TABLE.email, userEmail));

                // If becoming a member, grant bonus credits
                if (newMemberStatus) {
                    await addCredits(userEmail, 10, {
                        type: CREDIT_TYPES.MEMBERSHIP_BONUS,
                        reason: 'Membership upgrade bonus',
                        createdBy: `admin:${adminEmail || 'unknown'}`
                    });
                }

                return NextResponse.json({
                    success: true,
                    message: `User ${userEmail} is now ${newMemberStatus ? 'a member' : 'not a member'}`,
                    isMember: newMemberStatus
                });
            }

            default:
                return NextResponse.json(
                    { error: "Unknown action" },
                    { status: 400 }
                );
        }

    } catch (error) {
        console.error("Admin users action error:", error);
        return NextResponse.json(
            { error: "Failed to perform action" },
            { status: 500 }
        );
    }
}
