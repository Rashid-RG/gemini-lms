import { NextResponse } from "next/server";
import { db } from "@/configs/db";
import { PAYMENT_RECORD_TABLE } from "@/configs/schema";
import { eq, desc } from "drizzle-orm";
import { requireUserAuth } from "@/lib/userApiAuth";

/**
 * GET /api/payments/history
 * Fetches the payment history for a specific user.
 */
export async function GET(req) {
    try {
        const authResult = await requireUserAuth(req);
        if (!authResult.authenticated) return authResult.error;
        const email = authResult.email;

        const history = await db.select()
            .from(PAYMENT_RECORD_TABLE)
            .where(eq(PAYMENT_RECORD_TABLE.userEmail, email))
            .orderBy(desc(PAYMENT_RECORD_TABLE.createdAt));

        return NextResponse.json({ success: true, result: history });
    } catch (error) {
        console.error('Error fetching payment history:', error);
        return NextResponse.json({ error: 'Failed to fetch payment history' }, { status: 500 });
    }
}
