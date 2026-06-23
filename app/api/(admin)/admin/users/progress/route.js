import { db } from "@/configs/db";
import { 
    USER_TABLE, 
    COURSE_ENROLLMENT_TABLE, 
    STUDY_MATERIAL_TABLE, 
    STUDENT_PROGRESS_TABLE, 
    ASSIGNMENT_SUBMISSIONS_TABLE, 
    CERTIFICATES_TABLE 
} from "@/configs/schema";
import { eq, desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/adminApiAuth";

/**
 * GET /api/admin/users/progress?email=student@example.com
 * Fetches enrollment history, quiz/assignment marks, progress, and certificates for a user.
 * Authorized for both admins and tutors.
 */
export async function GET(req) {
    const auth = await requireAdminAuth();
    if (!auth.authenticated) return auth.error;

    try {
        const { searchParams } = new URL(req.url);
        const email = searchParams.get("email");

        if (!email) {
            return NextResponse.json(
                { error: "email parameter is required" },
                { status: 400 }
            );
        }

        const normalizedEmail = email.trim().toLowerCase();

        // 1. Get user details
        const users = await db.select()
            .from(USER_TABLE)
            .where(eq(USER_TABLE.email, normalizedEmail))
            .limit(1);

        if (users.length === 0) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }

        const user = users[0];

        // 2. Get course enrollment history
        const enrollments = await db.select({
            id: COURSE_ENROLLMENT_TABLE.id,
            courseId: COURSE_ENROLLMENT_TABLE.courseId,
            enrolledAt: COURSE_ENROLLMENT_TABLE.enrolledAt,
            completionPercentage: COURSE_ENROLLMENT_TABLE.completionPercentage,
            status: COURSE_ENROLLMENT_TABLE.status,
            lastAccessedAt: COURSE_ENROLLMENT_TABLE.lastAccessedAt,
            totalTimeSpent: COURSE_ENROLLMENT_TABLE.totalTimeSpent,
            performanceScore: COURSE_ENROLLMENT_TABLE.performanceScore,
            courseTopic: STUDY_MATERIAL_TABLE.topic,
            courseType: STUDY_MATERIAL_TABLE.courseType
        })
        .from(COURSE_ENROLLMENT_TABLE)
        .leftJoin(STUDY_MATERIAL_TABLE, eq(COURSE_ENROLLMENT_TABLE.courseId, STUDY_MATERIAL_TABLE.courseId))
        .where(eq(COURSE_ENROLLMENT_TABLE.studentEmail, normalizedEmail))
        .orderBy(desc(COURSE_ENROLLMENT_TABLE.enrolledAt));

        // 3. Get student progress details (quizzes and overall progress)
        const progressRecords = await db.select({
            id: STUDENT_PROGRESS_TABLE.id,
            courseId: STUDENT_PROGRESS_TABLE.courseId,
            progressPercentage: STUDENT_PROGRESS_TABLE.progressPercentage,
            quizScores: STUDENT_PROGRESS_TABLE.quizScores,
            assignmentScores: STUDENT_PROGRESS_TABLE.assignmentScores,
            finalScore: STUDENT_PROGRESS_TABLE.finalScore,
            status: STUDENT_PROGRESS_TABLE.status,
            startedAt: STUDENT_PROGRESS_TABLE.startedAt,
            completedAt: STUDENT_PROGRESS_TABLE.completedAt,
            lastActivityAt: STUDENT_PROGRESS_TABLE.lastActivityAt,
            courseTopic: STUDY_MATERIAL_TABLE.topic
        })
        .from(STUDENT_PROGRESS_TABLE)
        .leftJoin(STUDY_MATERIAL_TABLE, eq(STUDENT_PROGRESS_TABLE.courseId, STUDY_MATERIAL_TABLE.courseId))
        .where(eq(STUDENT_PROGRESS_TABLE.studentEmail, normalizedEmail));

        // 4. Get assignment submissions
        const submissions = await db.select({
            id: ASSIGNMENT_SUBMISSIONS_TABLE.id,
            courseId: ASSIGNMENT_SUBMISSIONS_TABLE.courseId,
            assignmentId: ASSIGNMENT_SUBMISSIONS_TABLE.assignmentId,
            score: ASSIGNMENT_SUBMISSIONS_TABLE.score,
            submittedAt: ASSIGNMENT_SUBMISSIONS_TABLE.submittedAt,
            status: ASSIGNMENT_SUBMISSIONS_TABLE.status,
            courseTopic: STUDY_MATERIAL_TABLE.topic
        })
        .from(ASSIGNMENT_SUBMISSIONS_TABLE)
        .leftJoin(STUDY_MATERIAL_TABLE, eq(ASSIGNMENT_SUBMISSIONS_TABLE.courseId, STUDY_MATERIAL_TABLE.courseId))
        .where(eq(ASSIGNMENT_SUBMISSIONS_TABLE.studentEmail, normalizedEmail))
        .orderBy(desc(ASSIGNMENT_SUBMISSIONS_TABLE.submittedAt));

        // 5. Get earned certificates
        const certificates = await db.select()
            .from(CERTIFICATES_TABLE)
            .where(eq(CERTIFICATES_TABLE.studentEmail, normalizedEmail))
            .orderBy(desc(CERTIFICATES_TABLE.completedAt));

        return NextResponse.json({
            user,
            enrollments,
            progressRecords,
            submissions,
            certificates
        });

    } catch (error) {
        console.error("Error fetching user progress:", error);
        return NextResponse.json(
            { error: "Failed to fetch user progress details" },
            { status: 500 }
        );
    }
}
