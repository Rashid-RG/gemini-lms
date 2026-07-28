import { db } from "@/configs/db";
import { CERTIFICATES_TABLE, STUDENT_PROGRESS_TABLE, COURSE_ENROLLMENT_TABLE, STUDY_MATERIAL_TABLE, USER_TABLE } from "@/configs/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/adminApiAuth";
import { v4 as uuidv4 } from 'uuid';
import { emailService } from "@/lib/emailService";
import { getMergedQuizScores } from "@/lib/gradingEngine";

/**
 * DELETE /api/admin/certificates
 * Delete (revoke) a student's certificate and reset their course completion status
 */
export async function DELETE(req) {
    const auth = await requireAdminAuth();
    if (!auth.authenticated) return auth.error;

    try {
        const { searchParams } = new URL(req.url);
        const certificateId = searchParams.get("certificateId");

        if (!certificateId) {
            return NextResponse.json(
                { error: "Missing certificateId parameter" },
                { status: 400 }
            );
        }

        // 1. Fetch certificate to get courseId and studentEmail
        const certs = await db
            .select()
            .from(CERTIFICATES_TABLE)
            .where(eq(CERTIFICATES_TABLE.certificateId, certificateId));

        if (certs.length === 0) {
            return NextResponse.json(
                { error: "Certificate not found" },
                { status: 404 }
            );
        }

        const { courseId, studentEmail } = certs[0];

        // 2. Delete from CERTIFICATES_TABLE
        await db
            .delete(CERTIFICATES_TABLE)
            .where(eq(CERTIFICATES_TABLE.certificateId, certificateId));

        // 3. Reset progress table
        await db
            .update(STUDENT_PROGRESS_TABLE)
            .set({
                status: 'In Progress',
                completedAt: null
            })
            .where(
                and(
                    eq(STUDENT_PROGRESS_TABLE.courseId, courseId),
                    eq(STUDENT_PROGRESS_TABLE.studentEmail, studentEmail)
                )
            );

        // 4. Reset enrollment table
        await db
            .update(COURSE_ENROLLMENT_TABLE)
            .set({
                certificateIssued: false,
                certificateIssuedAt: null,
                status: 'Active'
            })
            .where(
                and(
                    eq(COURSE_ENROLLMENT_TABLE.courseId, courseId),
                    eq(COURSE_ENROLLMENT_TABLE.studentEmail, studentEmail)
                )
            );

        return NextResponse.json({
            success: true,
            message: `Certificate ${certificateId} revoked successfully. Course status reset to In Progress.`
        });

    } catch (error) {
        console.error("Error revoking certificate:", error);
        return NextResponse.json(
            { error: "Failed to revoke certificate" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/admin/certificates
 * Manually issue or force-issue a certificate to a student
 */
export async function POST(req) {
    const auth = await requireAdminAuth();
    if (!auth.authenticated) return auth.error;

    try {
        const { courseId, studentEmail, studentName, force } = await req.json();

        if (!courseId || !studentEmail) {
            return NextResponse.json(
                { error: "Missing courseId or studentEmail" },
                { status: 400 }
            );
        }

        // Look up student details from USER_TABLE
        const users = await db
            .select()
            .from(USER_TABLE)
            .where(eq(USER_TABLE.email, studentEmail));
        
        const finalStudentName = studentName || users[0]?.name || studentEmail.split('@')[0] || 'Student';

        // Check if certificate already exists
        const existingCerts = await db
            .select()
            .from(CERTIFICATES_TABLE)
            .where(
                and(
                    eq(CERTIFICATES_TABLE.courseId, courseId),
                    eq(CERTIFICATES_TABLE.studentEmail, studentEmail)
                )
            );

        if (existingCerts.length > 0) {
            return NextResponse.json(
                { error: "Certificate already exists for this student in this course", certificate: existingCerts[0] },
                { status: 400 }
            );
        }

        // Get course details
        const courses = await db
            .select()
            .from(STUDY_MATERIAL_TABLE)
            .where(eq(STUDY_MATERIAL_TABLE.courseId, courseId));

        if (courses.length === 0) {
            return NextResponse.json(
                { error: "Course not found" },
                { status: 404 }
            );
        }

        const courseName = courses[0].topic;

        // Get progress details
        const progress = await db
            .select()
            .from(STUDENT_PROGRESS_TABLE)
            .where(
                and(
                    eq(STUDENT_PROGRESS_TABLE.courseId, courseId),
                    eq(STUDENT_PROGRESS_TABLE.studentEmail, studentEmail)
                )
            );

        const hasProgress = progress.length > 0;
        const progressRecord = hasProgress ? progress[0] : null;

        // Validate eligibility if not forced
        if (!force) {
            if (!progressRecord) {
                return NextResponse.json(
                    { error: "Student has no progress record in this course. Use force issue to bypass." },
                    { status: 400 }
                );
            }

            const completedChapters = Array.isArray(progressRecord.completedChapters)
                ? progressRecord.completedChapters
                : JSON.parse(progressRecord.completedChapters || '[]');
            const totalChapters = progressRecord.totalChapters || 0;
            const chaptersCompleted = completedChapters.length >= totalChapters && totalChapters > 0;

            const combinedQuizScores = getMergedQuizScores(progressRecord.quizScores, progressRecord.mcqScores);
            const quizScoreValues = Object.values(combinedQuizScores);
            const avgQuizScore = quizScoreValues.length > 0
                ? quizScoreValues.reduce((sum, score) => sum + score, 0) / quizScoreValues.length
                : 0;
            
            // Must complete ALL quizzes and average >= 60%
            const allQuizzesCompleted = quizScoreValues.length >= totalChapters && totalChapters > 0;
            const passedQuizzes = allQuizzesCompleted && avgQuizScore >= 60;

            const courseHasAssignments = courses[0].hasAssignments === true || (courses[0].assignmentCount && courses[0].assignmentCount > 0);
            const expectedAssignmentCount = courses[0].assignmentCount || 0;
            const assignmentScores = typeof progressRecord.assignmentScores === 'string'
                ? JSON.parse(progressRecord.assignmentScores || '{}')
                : (progressRecord.assignmentScores || {});
            const assignmentScoreEntries = Object.entries(assignmentScores);

            // Must complete ALL assignments
            const allAssignmentsCompleted = !courseHasAssignments || (assignmentScoreEntries.length >= expectedAssignmentCount);
            
            let allAssignmentsPassed = allAssignmentsCompleted;
            if (courseHasAssignments) {
                for (const [, score] of assignmentScoreEntries) {
                    const scoreNum = Number(score);
                    if (isNaN(scoreNum) || scoreNum < 60) {
                        allAssignmentsPassed = false;
                        break;
                    }
                }
            }

            const isEligible = chaptersCompleted && passedQuizzes && allAssignmentsPassed;

            if (!isEligible) {
                return NextResponse.json(
                    { error: "Student does not meet the updated Option 1 passing criteria (all quizzes average >= 60%, all assignments each >= 60%). Use force issue to bypass." },
                    { status: 400 }
                );
            }
        }

        // Generate certificate
        const certificateId = `CERT-${uuidv4().substring(0, 8).toUpperCase()}`;
        const finalScore = progressRecord ? progressRecord.finalScore : 100;

        const certResult = await db
            .insert(CERTIFICATES_TABLE)
            .values({
                certificateId,
                courseId,
                studentEmail,
                studentName: finalStudentName,
                courseName,
                finalScore,
                completedAt: new Date(),
                issueDate: new Date()
            })
            .returning();

        // Update progress table
        if (hasProgress) {
            await db
                .update(STUDENT_PROGRESS_TABLE)
                .set({
                    status: 'Completed',
                    completedAt: new Date()
                })
                .where(
                    and(
                        eq(STUDENT_PROGRESS_TABLE.courseId, courseId),
                        eq(STUDENT_PROGRESS_TABLE.studentEmail, studentEmail)
                    )
                );
        } else {
            // Create completed progress record if missing and forced
            await db
                .insert(STUDENT_PROGRESS_TABLE)
                .values({
                    courseId,
                    studentEmail,
                    status: 'Completed',
                    completedAt: new Date(),
                    progressPercentage: 100,
                    finalScore: 100
                });
        }

        // Update enrollment record (upsert/insert if not exists, but usually exists)
        const enrollment = await db
            .select()
            .from(COURSE_ENROLLMENT_TABLE)
            .where(
                and(
                    eq(COURSE_ENROLLMENT_TABLE.courseId, courseId),
                    eq(COURSE_ENROLLMENT_TABLE.studentEmail, studentEmail)
                )
            );

        if (enrollment.length > 0) {
            await db
                .update(COURSE_ENROLLMENT_TABLE)
                .set({
                    certificateIssued: true,
                    certificateIssuedAt: new Date(),
                    status: 'Completed'
                })
                .where(
                    and(
                        eq(COURSE_ENROLLMENT_TABLE.courseId, courseId),
                        eq(COURSE_ENROLLMENT_TABLE.studentEmail, studentEmail)
                    )
                );
        } else {
            await db
                .insert(COURSE_ENROLLMENT_TABLE)
                .values({
                    courseId,
                    studentEmail,
                    certificateIssued: true,
                    certificateIssuedAt: new Date(),
                    status: 'Completed'
                });
        }

        // Send email
        try {
            const certificateUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/verify-certificate/${certificateId}`;
            await emailService.sendCertificateEmail(
                studentEmail,
                finalStudentName,
                courseName,
                certificateUrl
            );
        } catch (emailErr) {
            console.error("Failed to send certificate email (non-fatal):", emailErr);
        }

        return NextResponse.json({
            success: true,
            message: "Certificate generated successfully!",
            certificate: certResult[0]
        });

    } catch (error) {
        console.error("Error issuing certificate:", error);
        return NextResponse.json(
            { error: "Failed to issue certificate: " + error.message },
            { status: 500 }
        );
    }
}

