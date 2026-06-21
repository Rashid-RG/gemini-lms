import { db } from "@/configs/db";
import { USER_TABLE, CREDIT_TRANSACTION_TABLE } from "@/configs/schema";
import { eq, desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getAuthEmail } from "@/lib/clerkUtils";
import { getUserCredits } from "@/lib/credits";

/**
 * GET /api/credits
 * Returns user's current credits and transaction history
 */
export async function GET(req) {
    try {
        const { userId, sessionClaims } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const authEmail = await getAuthEmail(sessionClaims);

        const { searchParams } = new URL(req.url);
        const email = searchParams.get('email');

        if (!email) {
            return NextResponse.json(
                { error: "Email is required" },
                { status: 400 }
            );
        }

        if (authEmail !== email.trim().toLowerCase()) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Get user credits via self-healing getUserCredits
        const userCreditsResult = await getUserCredits(email);
        if (!userCreditsResult) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }

        const { credits, totalCreditsLimit, user } = userCreditsResult;

        // Get transaction history
        const transactions = await db.select()
            .from(CREDIT_TRANSACTION_TABLE)
            .where(eq(CREDIT_TRANSACTION_TABLE.userEmail, email))
            .orderBy(desc(CREDIT_TRANSACTION_TABLE.createdAt))
            .limit(50);

        return NextResponse.json({
            credits: credits ?? 0,
            totalCreditsLimit: totalCreditsLimit ?? 5,
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
