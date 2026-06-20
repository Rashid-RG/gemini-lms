import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/configs/db";
import { STUDY_TYPE_CONTENT_TABLE, USER_TABLE } from "@/configs/schema";
import { eq } from "drizzle-orm";
import { getAuthEmail } from "@/lib/clerkUtils";

/**
 * GET /api/dashboard-data
 * Returns courses, profile, and streak data in a single parallel request.
 * Replaces 3 separate API calls on the dashboard.
 */
export async function GET(req) {
    try {
        const { userId, sessionClaims } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userEmail = await getAuthEmail(sessionClaims);
        if (!userEmail) {
            return NextResponse.json({ error: "Email not found" }, { status: 400 });
        }

        const adminEmails = (process.env.ADMIN_EMAILS || '')
            .split(',')
            .map(e => e.trim().toLowerCase())
            .filter(Boolean);
        adminEmails.push('admin@demo.com');

        if (adminEmails.includes(userEmail.toLowerCase())) {
            return NextResponse.json({ 
                error: "Admin accounts cannot access student dashboard data." 
            }, { status: 403 });
        }

        const baseUrl = process.env.NEXT_PUBLIC_HOST_NAME || 
                        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

        const headers = {
            'Cookie': req.headers.get('cookie') || '',
            'Content-Type': 'application/json',
        };

        // Run all 3 fetches in parallel
        const [coursesRes, profileRes, streakRes] = await Promise.allSettled([
            // Courses
            fetch(`${baseUrl}/api/courses`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ createdBy: userEmail }),
            }).then(r => r.json()).catch(() => ({ result: [] })),

            // Profile
            fetch(`${baseUrl}/api/user/profile`, {
                headers,
            }).then(r => r.json()).catch(() => ({ result: null, completeness: { isComplete: true, missingLabels: [] } })),

            // Streak
            fetch(`${baseUrl}/api/user-streak?studentEmail=${encodeURIComponent(userEmail)}`, {
                headers,
            }).then(r => r.json()).catch(() => ({ result: {} })),
        ]);

        const courses = coursesRes.status === 'fulfilled' ? (coursesRes.value?.result || []) : [];
        const profileData = profileRes.status === 'fulfilled' ? profileRes.value : {};
        const streakData = streakRes.status === 'fulfilled' ? (streakRes.value?.result || {}) : {};

        return NextResponse.json({
            courses,
            profile: profileData?.result || null,
            completeness: profileData?.completeness || { isComplete: true, missingLabels: [] },
            streak: {
                count: streakData?.streakCount || 0,
                longest: streakData?.longestStreak || 0,
                badges: (() => {
                    try {
                        return Array.isArray(streakData?.badges) 
                            ? streakData.badges 
                            : JSON.parse(streakData?.badges || '[]');
                    } catch { return []; }
                })()
            }
        });

    } catch (err) {
        console.error('[dashboard-data] Error:', err?.message);
        return NextResponse.json({
            courses: [],
            profile: null,
            completeness: { isComplete: true, missingLabels: [] },
            streak: { count: 0, longest: 0, badges: [] },
            error: 'Partial data may be unavailable'
        });
    }
}
