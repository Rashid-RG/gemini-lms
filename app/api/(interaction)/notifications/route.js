import { db } from "@/configs/db";
import { SUPPORT_TICKETS_TABLE } from "@/configs/schema";
import { eq, desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { withDbRetry } from "@/lib/dbUtils";

export const maxDuration = 15;

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const userEmail = searchParams.get('userEmail')?.toLowerCase();
        const limit = parseInt(searchParams.get('limit') || '5');

        if (!userEmail) {
            return NextResponse.json({ error: 'userEmail is required' }, { status: 400 });
        }

        const tickets = await withDbRetry(async () => {
            return db.select()
                .from(SUPPORT_TICKETS_TABLE)
                .where(eq(SUPPORT_TICKETS_TABLE.userEmail, userEmail))
                .orderBy(desc(SUPPORT_TICKETS_TABLE.updatedAt))
                .limit(Math.min(limit, 10));
        }, { maxRetries: 2, delayMs: 300 });

        return NextResponse.json(
            { result: tickets },
            {
                headers: {
                    'Cache-Control': 'private, max-age=30, stale-while-revalidate=60'
                }
            }
        );
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }
}
