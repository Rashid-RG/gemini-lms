import { db } from "@/configs/db";
import { 
    USER_TABLE, 
    STUDY_MATERIAL_TABLE, 
    ASSIGNMENT_SUBMISSIONS_TABLE, 
    STUDENT_PROGRESS_TABLE,
    COURSE_REVIEWS_TABLE 
} from "@/configs/schema";
import { desc, eq, and, gte, sql, count } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/adminApiAuth";

/**
 * GET /api/admin/analytics
 * Fetch analytics data for admin dashboard
 */
export async function GET(req) {
    const auth = await requireAdminAuth();
    if (!auth.authenticated) return auth.error;

    try {
        const { searchParams } = new URL(req.url);
        const days = parseInt(searchParams.get('days') || '30');
        
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // 1. User signup trends (daily)
        const userSignups = await db
            .select({
                date: sql`DATE(${USER_TABLE.createdAt})`.as('date'),
                count: sql`count(*)::int`.as('count')
            })
            .from(USER_TABLE)
            .where(gte(USER_TABLE.createdAt, startDate))
            .groupBy(sql`DATE(${USER_TABLE.createdAt})`)
            .orderBy(sql`DATE(${USER_TABLE.createdAt})`);

        // 2. Course creation trends
        const courseCreations = await db
            .select({
                date: sql`DATE(${STUDY_MATERIAL_TABLE.createdAt})`.as('date'),
                count: sql`count(*)::int`.as('count')
            })
            .from(STUDY_MATERIAL_TABLE)
            .where(gte(STUDY_MATERIAL_TABLE.createdAt, startDate))
            .groupBy(sql`DATE(${STUDY_MATERIAL_TABLE.createdAt})`)
            .orderBy(sql`DATE(${STUDY_MATERIAL_TABLE.createdAt})`);

        // 3. Submission trends
        const submissionTrends = await db
            .select({
                date: sql`DATE(${ASSIGNMENT_SUBMISSIONS_TABLE.submittedAt})`.as('date'),
                count: sql`count(*)::int`.as('count')
            })
            .from(ASSIGNMENT_SUBMISSIONS_TABLE)
            .where(gte(ASSIGNMENT_SUBMISSIONS_TABLE.submittedAt, startDate))
            .groupBy(sql`DATE(${ASSIGNMENT_SUBMISSIONS_TABLE.submittedAt})`)
            .orderBy(sql`DATE(${ASSIGNMENT_SUBMISSIONS_TABLE.submittedAt})`);

        // 4. Score distribution
        const scoreDistribution = await db
            .select({
                range: sql`
                    CASE 
                        WHEN ${ASSIGNMENT_SUBMISSIONS_TABLE.score} >= 90 THEN 'A (90-100)'
                        WHEN ${ASSIGNMENT_SUBMISSIONS_TABLE.score} >= 80 THEN 'B (80-89)'
                        WHEN ${ASSIGNMENT_SUBMISSIONS_TABLE.score} >= 70 THEN 'C (70-79)'
                        WHEN ${ASSIGNMENT_SUBMISSIONS_TABLE.score} >= 60 THEN 'D (60-69)'
                        ELSE 'F (0-59)'
                    END
                `.as('range'),
                count: sql`count(*)::int`.as('count')
            })
            .from(ASSIGNMENT_SUBMISSIONS_TABLE)
            .where(sql`${ASSIGNMENT_SUBMISSIONS_TABLE.score} IS NOT NULL`)
            .groupBy(sql`
                CASE 
                    WHEN ${ASSIGNMENT_SUBMISSIONS_TABLE.score} >= 90 THEN 'A (90-100)'
                    WHEN ${ASSIGNMENT_SUBMISSIONS_TABLE.score} >= 80 THEN 'B (80-89)'
                    WHEN ${ASSIGNMENT_SUBMISSIONS_TABLE.score} >= 70 THEN 'C (70-79)'
                    WHEN ${ASSIGNMENT_SUBMISSIONS_TABLE.score} >= 60 THEN 'D (60-69)'
                    ELSE 'F (0-59)'
                END
            `);

        // 5. Course completion rates
        const completionStats = await db
            .select({
                status: STUDENT_PROGRESS_TABLE.status,
                count: sql`count(*)::int`.as('count')
            })
            .from(STUDENT_PROGRESS_TABLE)
            .groupBy(STUDENT_PROGRESS_TABLE.status);

        // 6. Course type distribution
        const courseTypes = await db
            .select({
                type: STUDY_MATERIAL_TABLE.courseType,
                count: sql`count(*)::int`.as('count')
            })
            .from(STUDY_MATERIAL_TABLE)
            .groupBy(STUDY_MATERIAL_TABLE.courseType);

        // 7. Difficulty distribution
        const difficultyDistribution = await db
            .select({
                difficulty: STUDY_MATERIAL_TABLE.difficultyLevel,
                count: sql`count(*)::int`.as('count')
            })
            .from(STUDY_MATERIAL_TABLE)
            .groupBy(STUDY_MATERIAL_TABLE.difficultyLevel);

        // 8. Average scores by grading method
        const gradingStats = await db
            .select({
                gradedBy: sql`CASE WHEN ${ASSIGNMENT_SUBMISSIONS_TABLE.gradedBy} = 'AI' THEN 'AI' ELSE 'Manual' END`.as('gradedBy'),
                avgScore: sql`ROUND(AVG(${ASSIGNMENT_SUBMISSIONS_TABLE.score})::numeric, 1)`.as('avgScore'),
                count: sql`count(*)::int`.as('count')
            })
            .from(ASSIGNMENT_SUBMISSIONS_TABLE)
            .where(sql`${ASSIGNMENT_SUBMISSIONS_TABLE.score} IS NOT NULL`)
            .groupBy(sql`CASE WHEN ${ASSIGNMENT_SUBMISSIONS_TABLE.gradedBy} = 'AI' THEN 'AI' ELSE 'Manual' END`);

        // 9. Overall stats
        const totalUsers = await db.select({ count: sql`count(*)::int` }).from(USER_TABLE);
        const totalCourses = await db.select({ count: sql`count(*)::int` }).from(STUDY_MATERIAL_TABLE);
        const totalSubmissions = await db.select({ count: sql`count(*)::int` }).from(ASSIGNMENT_SUBMISSIONS_TABLE);
        const avgScore = await db
            .select({ avg: sql`ROUND(AVG(${ASSIGNMENT_SUBMISSIONS_TABLE.score})::numeric, 1)` })
            .from(ASSIGNMENT_SUBMISSIONS_TABLE)
            .where(sql`${ASSIGNMENT_SUBMISSIONS_TABLE.score} IS NOT NULL`);

        // 10. Top courses by enrollment
        const topCourses = await db
            .select({
                topic: STUDY_MATERIAL_TABLE.topic,
                students: STUDY_MATERIAL_TABLE.totalStudents,
                rating: STUDY_MATERIAL_TABLE.averageRating
            })
            .from(STUDY_MATERIAL_TABLE)
            .orderBy(desc(STUDY_MATERIAL_TABLE.totalStudents))
            .limit(10);

        return NextResponse.json({
            trends: {
                userSignups: userSignups.map(r => ({ date: r.date, count: r.count })),
                courseCreations: courseCreations.map(r => ({ date: r.date, count: r.count })),
                submissionTrends: submissionTrends.map(r => ({ date: r.date, count: r.count }))
            },
            distributions: {
                scoreDistribution,
                completionStats,
                courseTypes,
                difficultyDistribution,
                gradingStats
            },
            overview: {
                totalUsers: totalUsers[0]?.count || 0,
                totalCourses: totalCourses[0]?.count || 0,
                totalSubmissions: totalSubmissions[0]?.count || 0,
                avgScore: avgScore[0]?.avg || 0
            },
            topCourses
        });

    } catch (error) {
        console.error("Error fetching analytics:", error);
        return NextResponse.json(
            { error: "Failed to fetch analytics" },
            { status: 500 }
        );
    }
}
