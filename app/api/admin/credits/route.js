import { db } from "@/configs/db";
import { USER_TABLE, CREDIT_TRANSACTION_TABLE } from "@/configs/schema";
import { eq, desc, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/adminApiAuth";

/**
 * GET /api/admin/credits
 * Get all users with their credit balances and transaction history
 */
export async function GET(req) {
    // Verify admin session
    const auth = await requireAdminAuth();
    if (!auth.authenticated) return auth.error;

    try {
        const { searchParams } = new URL(req.url);
        const email = searchParams.get("email");

        if (email) {
            // Get specific user's credit details and transactions
            const users = await db
                .select()
                .from(USER_TABLE)
                .where(eq(USER_TABLE.email, email));

            if (users.length === 0) {
                return NextResponse.json({ error: "User not found" }, { status: 404 });
            }

            // Get transaction history
            const transactions = await db
                .select()
                .from(CREDIT_TRANSACTION_TABLE)
                .where(eq(CREDIT_TRANSACTION_TABLE.userEmail, email))
                .orderBy(desc(CREDIT_TRANSACTION_TABLE.createdAt))
                .limit(50);

            return NextResponse.json({
                user: users[0],
                transactions: transactions
            });
        }

        // Get all users with credits
        const users = await db
            .select({
                id: USER_TABLE.id,
                name: USER_TABLE.name,
                email: USER_TABLE.email,
                credits: USER_TABLE.credits,
                isMember: USER_TABLE.isMember,
                createdAt: USER_TABLE.createdAt
            })
            .from(USER_TABLE)
            .orderBy(desc(USER_TABLE.createdAt));

        // Calculate stats
        const totalCredits = users.reduce((sum, u) => sum + (u.credits || 0), 0);
        const freeUsers = users.filter(u => !u.isMember).length;
        const premiumUsers = users.filter(u => u.isMember === true).length;

        return NextResponse.json({
            users: users,
            stats: {
                totalUsers: users.length,
                totalCredits: totalCredits,
                freeUsers: freeUsers,
                premiumUsers: premiumUsers,
                averageCredits: users.length > 0 ? Math.round(totalCredits / users.length) : 0
            }
        });

    } catch (error) {
        console.error("Error fetching credits data:", error);
        return NextResponse.json(
            { error: "Failed to fetch credits data" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/admin/credits
 * Adjust user credits (add or deduct)
 */
export async function POST(req) {
    // Verify admin session
    const auth = await requireAdminAuth();
    if (!auth.authenticated) return auth.error;

    try {
        const { email, amount, reason } = await req.json();
        const adminEmail = auth.admin?.email;

        if (!email || amount === undefined) {
            return NextResponse.json(
                { error: "Missing required fields: email, amount" },
                { status: 400 }
            );
        }

        // Get current user
        const users = await db
            .select()
            .from(USER_TABLE)
            .where(eq(USER_TABLE.email, email));

        if (users.length === 0) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const user = users[0];
        const currentCredits = user.credits ?? 5;
        const newCredits = Math.max(0, currentCredits + parseInt(amount)); // Prevent negative credits

        // Update user credits
        await db
            .update(USER_TABLE)
            .set({ credits: newCredits })
            .where(eq(USER_TABLE.email, email));

        // Log the transaction
        await db.insert(CREDIT_TRANSACTION_TABLE).values({
            userEmail: email,
            type: amount > 0 ? 'admin_adjustment' : 'admin_deduction',
            amount: parseInt(amount),
            balanceBefore: currentCredits,
            balanceAfter: newCredits,
            reason: reason || `Admin adjustment by ${adminEmail}`,
            createdBy: `admin:${adminEmail}`
        });

        return NextResponse.json({
            success: true,
            previousCredits: currentCredits,
            newCredits: newCredits,
            adjustment: parseInt(amount)
        });

    } catch (error) {
        console.error("Error adjusting credits:", error);
        return NextResponse.json(
            { error: "Failed to adjust credits" },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/admin/credits
 * Update user membership (free/premium)
 */
export async function PUT(req) {
    // Verify admin session
    const auth = await requireAdminAuth();
    if (!auth.authenticated) return auth.error;

    try {
        const { email, isMember } = await req.json();
        const adminEmail = auth.admin?.email;

        if (!email || isMember === undefined) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        const isPremium = isMember === true || isMember === 'premium';

        // Update user membership
        const result = await db
            .update(USER_TABLE)
            .set({ 
                isMember: isPremium,
                // If upgrading to premium, set unlimited credits (9999)
                ...(isPremium ? { credits: 9999 } : {})
            })
            .where(eq(USER_TABLE.email, email))
            .returning();

        if (result.length === 0) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Log the change
        await db.insert(CREDIT_TRANSACTION_TABLE).values({
            userEmail: email,
            type: 'membership_change',
            amount: isPremium ? 9999 : 0,
            balanceBefore: result[0].credits ?? 5,
            balanceAfter: isPremium ? 9999 : result[0].credits,
            reason: `Membership changed to ${isPremium ? 'premium' : 'free'} by admin`,
            createdBy: `admin:${adminEmail}`
        });

        return NextResponse.json({
            success: true,
            user: result[0]
        });

    } catch (error) {
        console.error("Error updating membership:", error);
        return NextResponse.json(
            { error: "Failed to update membership" },
            { status: 500 }
        );
    }
}
