import { db } from "@/configs/db";
import { USER_TABLE, STUDY_MATERIAL_TABLE, STUDY_TYPE_CONTENT_TABLE, SUPPORT_TICKETS_TABLE, ASSIGNMENT_SUBMISSIONS_TABLE, CREDIT_TRANSACTION_TABLE, PAYMENT_RECORD_TABLE } from "@/configs/schema";
import { eq, desc, sql, and, gte } from "drizzle-orm";
import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/adminAuth";
import { cookies } from "next/headers";

/**
 * GET /api/admin/dashboard
 * Returns comprehensive system statistics for admin dashboard
 */
export async function GET(req) {
    try {
        // Verify admin session
        const cookieStore = await cookies();
        const token = cookieStore.get('admin_session')?.value;
        
        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        
        const session = await verifyAdminSession(token);
        if (!session.valid) {
            return NextResponse.json({ error: "Invalid session" }, { status: 401 });
        }
        
        // Calculate today's date for filtering
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Fetch all stats in parallel for performance
        const [
            userStats,
            courseStats,
            studyContentStats,
            supportStats,
            creditStats,
            reviewRequestStats,
            recentCourses,
            submissionsTodayResult,
            paymentStats,
            monthlyRevenueResult
        ] = await Promise.all([
            // User statistics
            db.select({
                total: sql`count(*)`,
                members: sql`count(*) filter (where ${USER_TABLE.isMember} = true)`
            }).from(USER_TABLE),
            
            // Course statistics by status
            db.select({
                status: STUDY_MATERIAL_TABLE.status,
                count: sql`count(*)`
            }).from(STUDY_MATERIAL_TABLE).groupBy(STUDY_MATERIAL_TABLE.status),
            
            // Study content statistics
            db.select({
                status: STUDY_TYPE_CONTENT_TABLE.status,
                count: sql`count(*)`
            }).from(STUDY_TYPE_CONTENT_TABLE).groupBy(STUDY_TYPE_CONTENT_TABLE.status),
            
            // Support ticket statistics
            db.select({
                status: SUPPORT_TICKETS_TABLE.status,
                count: sql`count(*)`
            }).from(SUPPORT_TICKETS_TABLE).groupBy(SUPPORT_TICKETS_TABLE.status).catch(() => []),
            
            // Credit statistics
            db.select({
                totalAvailable: sql`coalesce(sum(${USER_TABLE.credits}), 0)`,
                totalUsed: sql`coalesce(sum(${USER_TABLE.totalCreditsUsed}), 0)`
            }).from(USER_TABLE).catch(() => [{ totalAvailable: 0, totalUsed: 0 }]),
            
            // Review requests count
            db.select({
                count: sql`count(*)`
            }).from(ASSIGNMENT_SUBMISSIONS_TABLE)
              .where(eq(ASSIGNMENT_SUBMISSIONS_TABLE.reviewRequested, true))
              .catch(() => [{ count: 0 }]),
            
            // Recent courses
            db.select({
                courseId: STUDY_MATERIAL_TABLE.courseId,
                topic: STUDY_MATERIAL_TABLE.topic,
                courseType: STUDY_MATERIAL_TABLE.courseType,
                status: STUDY_MATERIAL_TABLE.status,
                createdBy: STUDY_MATERIAL_TABLE.createdBy,
                createdAt: STUDY_MATERIAL_TABLE.createdAt
            }).from(STUDY_MATERIAL_TABLE)
              .orderBy(desc(STUDY_MATERIAL_TABLE.createdAt))
              .limit(10),
            
            // Submissions today
            db.select({
                count: sql`count(*)`
            }).from(ASSIGNMENT_SUBMISSIONS_TABLE)
              .where(gte(ASSIGNMENT_SUBMISSIONS_TABLE.submittedAt, today))
              .catch(() => [{ count: 0 }]),
            
            // Payment statistics
            db.select({
                totalRevenue: sql`coalesce(sum(cast(amount as numeric)), 0)`,
                totalTransactions: sql`count(*)`,
                completedPayments: sql`count(*) filter (where status = 'completed')`
            }).from(PAYMENT_RECORD_TABLE).catch(() => [{ totalRevenue: 0, totalTransactions: 0, completedPayments: 0 }]),
            
            // This month's revenue
            db.select({
                monthlyRevenue: sql`coalesce(sum(cast(amount as numeric)), 0)`
            }).from(PAYMENT_RECORD_TABLE)
              .where(and(
                  eq(PAYMENT_RECORD_TABLE.status, 'completed'),
                  gte(PAYMENT_RECORD_TABLE.createdAt, sql`date_trunc('month', current_date)`)
              ))
              .catch(() => [{ monthlyRevenue: 0 }])
        ]);

        // Process course stats
        const courseStatsMap = {};
        let totalCourses = 0;
        courseStats.forEach(stat => {
            const status = (stat.status || 'Unknown').toLowerCase();
            const count = Number(stat.count);
            courseStatsMap[status] = count;
            totalCourses += count;
        });

        // Process study content stats
        const studyContentMap = {};
        studyContentStats.forEach(stat => {
            const status = (stat.status || 'Unknown').toLowerCase();
            studyContentMap[status] = Number(stat.count);
        });

        // Process support stats
        const supportStatsMap = { open: 0, total: 0 };
        supportStats.forEach(stat => {
            const count = Number(stat.count);
            supportStatsMap.total += count;
            if (stat.status === 'Open') {
                supportStatsMap.open = count;
            }
        });

        // Calculate success rate (Ready / Total * 100)
        const readyCourses = courseStatsMap['ready'] || 0;
        const successRate = totalCourses > 0 ? Math.round((readyCourses / totalCourses) * 100) : 0;

        const response = {
            stats: {
                totalUsers: Number(userStats[0]?.total || 0),
                totalMembers: Number(userStats[0]?.members || 0),
                totalCourses,
                readyCourses: courseStatsMap['ready'] || 0,
                generatingCourses: courseStatsMap['generating'] || 0,
                failedCourses: (courseStatsMap['failed'] || 0) + (courseStatsMap['error'] || 0),
                studyContentReady: studyContentMap['ready'] || 0,
                studyContentGenerating: studyContentMap['generating'] || 0,
                openTickets: supportStatsMap.open,
                totalTickets: supportStatsMap.total,
                totalCreditsAvailable: Number(creditStats[0]?.totalAvailable || 0),
                totalCreditsUsed: Number(creditStats[0]?.totalUsed || 0),
                pendingReviews: Number(reviewRequestStats[0]?.count || 0),
                submissionsToday: Number(submissionsTodayResult[0]?.count || 0),
                successRate,
                // Payment stats
                totalRevenue: parseFloat(paymentStats[0]?.totalRevenue || 0).toFixed(2),
                totalPayments: Number(paymentStats[0]?.completedPayments || 0),
                monthlyRevenue: parseFloat(monthlyRevenueResult[0]?.monthlyRevenue || 0).toFixed(2)
            },
            recentCourses
        };

        return NextResponse.json(response);

    } catch (error) {
        console.error("Admin dashboard error:", error);
        return NextResponse.json(
            { error: "Failed to fetch admin data" },
            { status: 500 }
        );
    }
}
