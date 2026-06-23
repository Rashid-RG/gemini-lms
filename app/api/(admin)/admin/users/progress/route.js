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

        // 2. Fetch all related tables in parallel
        const [dbEnrollments, selfGenerated, studentProgressList, submissions, certificates] = await Promise.all([
            db.select({
                id: COURSE_ENROLLMENT_TABLE.id,
                courseId: COURSE_ENROLLMENT_TABLE.courseId,
                enrolledAt: COURSE_ENROLLMENT_TABLE.enrolledAt,
                completionPercentage: COURSE_ENROLLMENT_TABLE.completionPercentage,
                status: COURSE_ENROLLMENT_TABLE.status,
                lastAccessedAt: COURSE_ENROLLMENT_TABLE.lastAccessedAt,
                totalTimeSpent: COURSE_ENROLLMENT_TABLE.totalTimeSpent,
                performanceScore: COURSE_ENROLLMENT_TABLE.performanceScore,
                courseTopic: STUDY_MATERIAL_TABLE.topic,
                courseType: STUDY_MATERIAL_TABLE.courseType,
                certificateIssued: COURSE_ENROLLMENT_TABLE.certificateIssued
            })
            .from(COURSE_ENROLLMENT_TABLE)
            .leftJoin(STUDY_MATERIAL_TABLE, eq(COURSE_ENROLLMENT_TABLE.courseId, STUDY_MATERIAL_TABLE.courseId))
            .where(eq(COURSE_ENROLLMENT_TABLE.studentEmail, normalizedEmail)),

            db.select({
                id: STUDY_MATERIAL_TABLE.id,
                courseId: STUDY_MATERIAL_TABLE.courseId,
                enrolledAt: STUDY_MATERIAL_TABLE.createdAt,
                completionPercentage: STUDY_MATERIAL_TABLE.totalStudents,
                status: STUDY_MATERIAL_TABLE.status,
                lastAccessedAt: STUDY_MATERIAL_TABLE.createdAt,
                totalTimeSpent: STUDY_MATERIAL_TABLE.totalStudents,
                performanceScore: STUDY_MATERIAL_TABLE.averageRating,
                courseTopic: STUDY_MATERIAL_TABLE.topic,
                courseType: STUDY_MATERIAL_TABLE.courseType
            })
            .from(STUDY_MATERIAL_TABLE)
            .where(eq(STUDY_MATERIAL_TABLE.createdBy, normalizedEmail)),

            db.select({
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
            .where(eq(STUDENT_PROGRESS_TABLE.studentEmail, normalizedEmail)),

            db.select({
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
            .orderBy(desc(ASSIGNMENT_SUBMISSIONS_TABLE.submittedAt)),

            db.select()
                .from(CERTIFICATES_TABLE)
                .where(eq(CERTIFICATES_TABLE.studentEmail, normalizedEmail))
                .orderBy(desc(CERTIFICATES_TABLE.completedAt))
        ]);

        const progressMap = new Map(
            studentProgressList.map(p => [p.courseId, p])
        );
        const certCourseIds = new Set(certificates.map(c => c.courseId));
        const courseMap = new Map();

        // 1. Process enrolled courses
        for (const enr of dbEnrollments) {
            const prog = progressMap.get(enr.courseId);
            courseMap.set(enr.courseId, {
                id: enr.id,
                courseId: enr.courseId,
                enrolledAt: enr.enrolledAt,
                completionPercentage: prog ? (prog.progressPercentage || 0) : (enr.completionPercentage || 0),
                status: prog ? (prog.status || 'Active') : (enr.status || 'Active'),
                lastAccessedAt: enr.lastAccessedAt || (prog ? prog.lastActivityAt : null),
                totalTimeSpent: enr.totalTimeSpent || 0,
                performanceScore: enr.performanceScore || (prog ? String(prog.finalScore) : null),
                courseTopic: enr.courseTopic || 'Unknown Course',
                courseType: enr.courseType || 'Unknown',
                certificateIssued: enr.certificateIssued || certCourseIds.has(enr.courseId)
            });
        }

        // 2. Process self-generated courses
        for (const sg of selfGenerated) {
            if (!courseMap.has(sg.courseId)) {
                const prog = progressMap.get(sg.courseId);
                courseMap.set(sg.courseId, {
                    id: sg.id,
                    courseId: sg.courseId,
                    enrolledAt: sg.enrolledAt,
                    completionPercentage: prog ? (prog.progressPercentage || 0) : 0,
                    status: prog ? (prog.status || 'Active') : 'Active',
                    lastAccessedAt: prog ? prog.lastActivityAt : sg.enrolledAt,
                    totalTimeSpent: 0,
                    performanceScore: prog ? String(prog.finalScore) : null,
                    courseTopic: sg.courseTopic || 'Unknown Course',
                    courseType: sg.courseType || 'Unknown',
                    certificateIssued: certCourseIds.has(sg.courseId)
                });
            }
        }

        // 3. Process progress records that might not be in either (safety net)
        for (const prog of studentProgressList) {
            if (!courseMap.has(prog.courseId)) {
                courseMap.set(prog.courseId, {
                    id: prog.id,
                    courseId: prog.courseId,
                    enrolledAt: prog.startedAt || new Date(),
                    completionPercentage: prog.progressPercentage || 0,
                    status: prog.status || 'Active',
                    lastAccessedAt: prog.lastActivityAt,
                    totalTimeSpent: 0,
                    performanceScore: String(prog.finalScore || 0),
                    courseTopic: prog.courseTopic || 'Unknown Course',
                    courseType: prog.courseType || 'Unknown',
                    certificateIssued: certCourseIds.has(prog.courseId)
                });
            }
        }

        const enrollments = Array.from(courseMap.values()).sort(
            (a, b) => new Date(b.enrolledAt).getTime() - new Date(a.enrolledAt).getTime()
        );

        return NextResponse.json({
            user,
            enrollments,
            progressRecords: studentProgressList,
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
