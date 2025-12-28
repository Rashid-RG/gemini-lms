import { inngest } from "@/inngest/client";
import { NextResponse } from "next/server";
import { db } from "@/configs/db";
import { USER_TABLE } from "@/configs/schema";
import { eq } from "drizzle-orm";
import { withDbRetry } from "@/lib/dbUtils";
import cache, { CACHE_TTL, invalidateUserCache } from "@/lib/cache";
import { captureError, startTimer } from "@/lib/monitoring";
import { emailService } from "@/lib/emailService";

export async function POST(req) {
    const timer = startTimer('create-user-api');
    
    try {
        const { user, forceRefresh } = await req.json();
        
        if (!user?.email) {
            return NextResponse.json({ error: "Email required" }, { status: 400 });
        }

        const cacheKey = `user:${user.email}:data`;
        
        // Check cache first (unless force refresh)
        if (!forceRefresh) {
            const cached = cache.get(cacheKey);
            if (cached) {
                timer.end({ cached: true });
                return NextResponse.json({ 
                    result: cached,
                    exists: true,
                    cached: true 
                });
            }
        }

        // Check if user exists and get full user data (with retry for cold starts)
        const existingUser = await withDbRetry(async () => {
            return db.select()
                .from(USER_TABLE)
                .where(eq(USER_TABLE.email, user.email))
                .limit(1);
        }, { maxRetries: 2, delayMs: 500 });

        if (existingUser?.length > 0) {
            // Cache user data for 1 minute (short TTL for credits that change)
            cache.set(cacheKey, existingUser[0], CACHE_TTL.SHORT);
            
            timer.end({ cached: false, exists: true });
            
            // User exists, return full user data including credits
            return NextResponse.json({
                result: existingUser[0],
                exists: true 
            });
        }

        // New user - create via Inngest for reliable processing
        const result = await inngest.send({
            name: 'user.create',
            data: { user }
        });

        timer.end({ cached: false, exists: false, queued: true });

        // Return default values for new user
        return NextResponse.json({ 
            result: { 
                credits: 5, 
                isMember: false,
                email: user.email 
            },
            exists: false,
            queued: true 
        });
    } catch (err) {
        captureError(err, { operation: 'create-user', email: req.body?.user?.email });
        // Don't fail the request - return defaults
        return NextResponse.json({ 
            result: { credits: 5, isMember: false },
            error: true 
        });
    }
}