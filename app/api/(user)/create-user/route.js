import { inngest } from "@/inngest/client";
import { NextResponse } from "next/server";
import { db } from "@/configs/db";
import { USER_TABLE } from "@/configs/schema";
import { eq } from "drizzle-orm";
import { withDbRetry } from "@/lib/dbUtils";
import cache, { CACHE_TTL } from "@/lib/cache";
import { captureError, startTimer } from "@/lib/monitoring";
import { ensureStudentIdentifierForUser, hasStudentIdentifier } from "@/lib/studentIdentifier";
import { auth } from "@clerk/nextjs/server";
import { getAuthEmail } from "@/lib/clerkUtils";
import { getUserCredits } from "@/lib/credits";

// In-memory request deduplication to prevent duplicate DB queries
const pendingRequests = new Map();
const DB_LOOKUP_TIMEOUT_MS = 4000;

function withTimeout(promise, timeoutMs, message) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(message)), timeoutMs)),
    ]);
}

export async function POST(req) {
    const timer = startTimer('create-user-api');
    
    try {
        const { userId, sessionClaims } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const authEmail = await getAuthEmail(sessionClaims);

        // Safely parse body — guard against empty/malformed requests
        let user, forceRefresh;
        try {
            const body = await req.json();
            user = body?.user;
            forceRefresh = body?.forceRefresh;
        } catch {
            return NextResponse.json({ error: "Invalid or empty request body" }, { status: 400 });
        }

        const normalizedEmail = user?.email?.trim()?.toLowerCase();
        
        if (!normalizedEmail) {
            return NextResponse.json({ error: "Email required" }, { status: 400 });
        }

        const adminEmails = (process.env.ADMIN_EMAILS || '')
            .split(',')
            .map(e => e.trim().toLowerCase())
            .filter(Boolean);
        adminEmails.push('geminilmsadmin@gmail.com');

        if (adminEmails.includes(normalizedEmail)) {
            return NextResponse.json({ 
                error: "Admin accounts cannot register as standard students." 
            }, { status: 403 });
        }

        if (authEmail !== normalizedEmail) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const cacheKey = `user:${normalizedEmail}:data`;
        
        // Return cached result immediately if available
        if (!forceRefresh) {
            const cached = cache.get(cacheKey);
            if (cached) {
                return NextResponse.json({ 
                    result: cached,
                    exists: true,
                    cached: true,
                });
            }
            
            // Check if we're already fetching this user (deduplication)
            // Store just the data promise, not the NextResponse
            if (pendingRequests.has(normalizedEmail)) {
                try {
                    const userData = await Promise.race([
                        pendingRequests.get(normalizedEmail),
                        new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('Timeout')), 3000)
                        )
                    ]);
                    // Return fresh response from cached user data
                    return NextResponse.json({ 
                        result: userData,
                        exists: true,
                        deduped: true,
                        cached: true,
                    });
                } catch {
                    // Timeout or error, proceed normally
                }
            }
        }

        // Create promise for deduplication (store just data, not NextResponse)
        const dataPromise = (async () => {
            // Check if user exists and get full user data (with retry for cold starts)
            const existingUser = await withTimeout(
                withDbRetry(async () => {
                    return db.select()
                        .from(USER_TABLE)
                        .where(eq(USER_TABLE.email, normalizedEmail))
                        .limit(1);
                }, { maxRetries: 1, delayMs: 300 }),
                DB_LOOKUP_TIMEOUT_MS,
                'User lookup timeout'
            ).catch(() => null);

            if (existingUser?.length > 0) {
                const userCreditsResult = await getUserCredits(normalizedEmail);
                const updatedUser = userCreditsResult ? userCreditsResult.user : existingUser[0];
                const totalCreditsLimit = userCreditsResult ? userCreditsResult.totalCreditsLimit : 5;

                const userWithLimit = {
                    ...updatedUser,
                    totalCreditsLimit
                };

                const ensuredUser = hasStudentIdentifier(userWithLimit?.studentIdentifier)
                    ? userWithLimit
                    : await ensureStudentIdentifierForUser(userWithLimit);

                // Cache user data for 5 minutes
                cache.set(cacheKey, ensuredUser, CACHE_TTL.MEDIUM);
                return ensuredUser;
            }

            const normalizedUser = {
                ...user,
                email: normalizedEmail,
            };

            // New user - queue creation via Inngest (non-blocking)
            inngest.send({
                name: 'user.create',
                data: { user: normalizedUser }
            }).catch(err => {
                console.error('Failed to queue user creation:', err);
            });

            // Return default for new user
            return { 
                credits: 5, 
                totalCreditsLimit: 5,
                isMember: false,
                email: normalizedEmail,
            };
        })();

        // Store data promise for deduplication (not NextResponse)
        if (!forceRefresh) {
            pendingRequests.set(normalizedEmail, dataPromise);
            
            // Clean up after 5 seconds
            setTimeout(() => {
                pendingRequests.delete(normalizedEmail);
            }, 5000);
        }

        try {
            const userData = await dataPromise;
            timer.end({ cached: false, exists: userData?.id ? true : false });
            
            return NextResponse.json({
                result: userData,
                exists: userData?.id ? true : false,
            });
        } catch (innerError) {
            const isExpectedTimeout = innerError?.message === 'User lookup timeout' || innerError?.message === 'Timeout';
            if (!isExpectedTimeout) {
                console.error('Error fetching user data:', innerError?.message);
            }
            timer.end({ error: true });
            
            // Return defaults on error
            return NextResponse.json({ 
                result: { credits: 5, isMember: false, email: normalizedEmail },
                error: 'Database error'
            });
        }
    } catch (err) {
        console.error('Error in create-user:', err?.message);
        captureError(err, { operation: 'create-user' });
        
        // Return graceful default on parsing error
        return NextResponse.json({ 
            result: { credits: 5, isMember: false },
            error: 'Request error'
        });
    }
}