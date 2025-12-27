import { db } from "@/configs/db";
import { USER_TABLE, CREDIT_TRANSACTION_TABLE } from "@/configs/schema";
import { eq, desc } from "drizzle-orm";
import { NextResponse } from "next/server";

/**
 * GET /api/credits
 * Returns user's current credits and transaction history
 */
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const email = searchParams.get('email');

        if (!email) {
            return NextResponse.json(
                { error: "Email is required" },
                { status: 400 }
            );
        }

        // Get user credits
        const users = await db.select({
            credits: USER_TABLE.credits,
            totalCreditsUsed: USER_TABLE.totalCreditsUsed,
            isMember: USER_TABLE.isMember
        }).from(USER_TABLE)
          .where(eq(USER_TABLE.email, email));

        if (users.length === 0) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }

        const user = users[0];

        // Get transaction history
        const transactions = await db.select()
            .from(CREDIT_TRANSACTION_TABLE)
            .where(eq(CREDIT_TRANSACTION_TABLE.userEmail, email))
            .orderBy(desc(CREDIT_TRANSACTION_TABLE.createdAt))
            .limit(50);

        return NextResponse.json({
            credits: user.credits ?? 0,
            totalUsed: user.totalCreditsUsed ?? 0,
            isMember: user.isMember ?? false,
            transactions: transactions.map(t => ({
                id: t.id,
                amount: t.amount,
                type: t.type,
                reason: t.reason,
                courseId: t.courseId,
                balanceBefore: t.balanceBefore,
                balanceAfter: t.balanceAfter,
                createdAt: t.createdAt
            }))
        });

    } catch (error) {
        console.error("Credits API error:", error);
        return NextResponse.json(
            { error: "Failed to fetch credits" },
            { status: 500 }
        );
    }
}
