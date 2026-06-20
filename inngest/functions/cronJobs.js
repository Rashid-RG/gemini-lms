import { db } from "@/configs/db";
import { inngest } from "../client";
import { 
  ADAPTIVE_PERFORMANCE_TABLE, 
  STUDY_MATERIAL_TABLE, 
  USER_TABLE, 
  STUDY_TYPE_CONTENT_TABLE,
  CHAPTER_NOTES_TABLE,
  COURSE_MEDIA_TABLE,
  COURSE_ENROLLMENT_TABLE,
  PAYMENT_RECORD_TABLE, 
  STUDENT_PROGRESS_TABLE, 
  CERTIFICATES_TABLE,
  COURSE_ASSIGNMENTS_TABLE, 
  ASSIGNMENT_SUBMISSIONS_TABLE, 
  SUPPORT_TICKETS_TABLE,
  LEADERBOARD_TABLE, 
  ANNOUNCEMENTS_TABLE, 
  TUTOR_REQUESTS_TABLE,
  ADMIN_TABLE,
  SYSTEM_BACKUP_TABLE
} from "@/configs/schema";
import zlib from "zlib";
import crypto from "crypto";
import { eq, and, lt, sql } from "drizzle-orm";
import { Resend } from "resend";
import { getMasterySummary } from "@/lib/adaptiveDifficulty";
import { buildReminderEmailHTML } from "@/lib/reminderEmail";
import { refundCourseCredits } from "@/lib/credits";
import { STALE_COURSE_THRESHOLD_MINUTES } from "@/lib/constants";

export const SendWeeklyProgressReminders = inngest.createFunction(
    { id: 'weekly-progress-reminders' },
    { cron: '0 9 * * 1' },
    async ({ step }) => {
        if (!process.env.RESEND_API_KEY) {
            console.error('SendWeeklyProgressReminders: RESEND_API_KEY missing; skipping run');
            throw new Error('RESEND_API_KEY not configured');
        }

        const resend = new Resend(process.env.RESEND_API_KEY);

        const performance = await step.run('Load performance records', async () => {
            return await db.select().from(ADAPTIVE_PERFORMANCE_TABLE);
        });

        if (!performance?.length) {
            return { message: 'No performance data to send reminders' };
        }

        const courseMeta = await step.run('Load course metadata', async () => {
            return await db
                .select({
                    courseId: STUDY_MATERIAL_TABLE.courseId,
                    topic: STUDY_MATERIAL_TABLE.topic,
                    courseType: STUDY_MATERIAL_TABLE.courseType,
                })
                .from(STUDY_MATERIAL_TABLE);
        });

        const userMeta = await step.run('Load users', async () => {
            return await db.select({ email: USER_TABLE.email, name: USER_TABLE.name }).from(USER_TABLE);
        });

        const courseMap = new Map(courseMeta.map((c) => [c.courseId, c]));
        const userMap = new Map(userMeta.map((u) => [u.email?.toLowerCase(), u]));

        const grouped = new Map();
        for (const row of performance) {
            const key = `${row.studentEmail}|${row.courseId}`;
            if (!grouped.has(key)) {
                grouped.set(key, { studentEmail: row.studentEmail, courseId: row.courseId, records: [] });
            }
            grouped.get(key).records.push(row);
        }

        let sent = 0;
        const failures = [];

        for (const [_, data] of grouped) {
            const { studentEmail, courseId, records } = data;

            const summary = getMasterySummary(records);
            const weakTopics = records
                .filter((r) => r.isWeakTopic)
                .slice(0, 3)
                .map((t) => ({
                    topicName: t.topicName,
                    score: t.averageScore,
                    recommendedDifficulty: t.recommendedDifficulty,
                }));

            const nextAction = records.length
                ? records
                    .slice()
                    .sort((a, b) => {
                        const weakA = a.isWeakTopic ? 0 : 1;
                        const weakB = b.isWeakTopic ? 0 : 1;
                        if (weakA !== weakB) return weakA - weakB;
                        return (a.averageScore || 0) - (b.averageScore || 0);
                    })[0]
                : null;

            const nextActionData = nextAction
                ? {
                    topicName: nextAction.topicName,
                    score: nextAction.averageScore,
                    recommendedDifficulty: nextAction.recommendedDifficulty,
                    isWeakTopic: nextAction.isWeakTopic,
                    suggestion: nextAction.isWeakTopic
                        ? `Revisit ${nextAction.topicName} and take a quiz at ${nextAction.recommendedDifficulty} difficulty.`
                        : `Keep your streak—take a quiz on ${nextAction.topicName} to reinforce learning.`,
                }
                : null;

            const courseName = courseMap.get(courseId)?.topic || 'Your Course';
            const studentName = userMap.get(studentEmail?.toLowerCase())?.name || 'Learner';

            const html = buildReminderEmailHTML({
                studentName,
                courseName,
                overallMastery: summary.overallMastery,
                topicsMastered: summary.topicsMastered,
                topicsNeedingWork: summary.topicsNeedingWork,
                nextActionTopic: nextActionData,
                weakTopics,
            });

            try {
                await step.run(`send-${sent + 1}`, async () => {
                    const res = await resend.emails.send({
                        from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
                        to: studentEmail,
                        subject: `Your Weekly Progress Summary - ${courseName}`,
                        html,
                    });

                    if (res.error) {
                        throw new Error(res.error.message || 'Resend send failed');
                    }

                    return res.data?.id || null;
                });

                sent += 1;
            } catch (err) {
                console.error('Weekly reminder send failed', { studentEmail, courseId, error: err?.message });
                failures.push({ studentEmail, courseId, error: err?.message });
            }
        }

        return { sent, attempted: grouped.size, failures };
    }
);

export const CleanupStaleCourses = inngest.createFunction(
    { id: 'cleanup-stale-courses' },
    { cron: '*/15 * * * *' },
    async ({ step }) => {
        const result = await step.run('Find and cleanup stale courses', async () => {
            const cutoffTime = new Date(Date.now() - STALE_COURSE_THRESHOLD_MINUTES * 60 * 1000);
            
            const staleCourses = await db.select()
                .from(STUDY_MATERIAL_TABLE)
                .where(
                    and(
                        eq(STUDY_MATERIAL_TABLE.status, 'Generating'),
                        lt(STUDY_MATERIAL_TABLE.createdAt, cutoffTime)
                    )
                );
            
            if (staleCourses.length === 0) {
                return { processed: 0, refunded: 0, message: 'No stale courses found' };
            }
            
            let refunded = 0;
            const processedCourses = [];
            
            for (const course of staleCourses) {
                try {
                    await db.update(STUDY_MATERIAL_TABLE)
                        .set({ status: 'Failed' })
                        .where(eq(STUDY_MATERIAL_TABLE.courseId, course.courseId));
                    
                    const refundResult = await refundCourseCredits(
                        course.createdBy,
                        course.courseId,
                        `Auto-refund: Course generation timed out after ${STALE_COURSE_THRESHOLD_MINUTES} minutes`
                    );
                    
                    if (refundResult.success) {
                        refunded++;
                    }
                    
                    processedCourses.push({
                        courseId: course.courseId,
                        topic: course.topic,
                        createdBy: course.createdBy,
                        refunded: refundResult.success
                    });
                    
                    console.log('Cleaned up stale course:', {
                        courseId: course.courseId,
                        topic: course.topic,
                        createdBy: course.createdBy,
                        refunded: refundResult.success
                    });
                } catch (err) {
                    console.error('Failed to cleanup stale course:', course.courseId, err);
                }
            }
            
            return {
                processed: staleCourses.length,
                refunded,
                courses: processedCourses
            };
        });
        
        return result;
    }
);

export const SystemHealthCheck = inngest.createFunction(
    { id: 'system-health-check' },
    { cron: '0 * * * *' },
    async ({ step }) => {
        const healthReport = await step.run('Generate health report', async () => {
            const now = new Date();
            
            const generatingCourses = await db.select({ count: sql`count(*)` })
                .from(STUDY_MATERIAL_TABLE)
                .where(eq(STUDY_MATERIAL_TABLE.status, 'Generating'));
            
            const failedCourses = await db.select({ count: sql`count(*)` })
                .from(STUDY_MATERIAL_TABLE)
                .where(eq(STUDY_MATERIAL_TABLE.status, 'Failed'));
            
            const readyCourses = await db.select({ count: sql`count(*)` })
                .from(STUDY_MATERIAL_TABLE)
                .where(eq(STUDY_MATERIAL_TABLE.status, 'Ready'));
            
            const errorCourses = await db.select({ count: sql`count(*)` })
                .from(STUDY_MATERIAL_TABLE)
                .where(eq(STUDY_MATERIAL_TABLE.status, 'Error'));
            
            const generatingContent = await db.select({ count: sql`count(*)` })
                .from(STUDY_TYPE_CONTENT_TABLE)
                .where(eq(STUDY_TYPE_CONTENT_TABLE.status, 'Generating'));
            
            const errorContent = await db.select({ count: sql`count(*)` })
                .from(STUDY_TYPE_CONTENT_TABLE)
                .where(eq(STUDY_TYPE_CONTENT_TABLE.status, 'Error'));
            
            const totalUsers = await db.select({ count: sql`count(*)` })
                .from(USER_TABLE);
            
            return {
                timestamp: now.toISOString(),
                courses: {
                    generating: Number(generatingCourses[0]?.count || 0),
                    ready: Number(readyCourses[0]?.count || 0),
                    failed: Number(failedCourses[0]?.count || 0),
                    error: Number(errorCourses[0]?.count || 0)
                },
                studyContent: {
                    generating: Number(generatingContent[0]?.count || 0),
                    error: Number(errorContent[0]?.count || 0)
                },
                users: {
                    total: Number(totalUsers[0]?.count || 0)
                }
            };
        });
        
        console.log('System Health Report:', JSON.stringify(healthReport, null, 2));
        return healthReport;
    }
);

export const SystemBackupCron = inngest.createFunction(
    { id: 'system-backup-cron' },
    { cron: '0 0 * * 0' }, // Every Sunday at midnight
    async ({ step }) => {
        const result = await step.run('Generate system backup', async () => {
            const users = await db.select().from(USER_TABLE);
            const studyMaterial = await db.select().from(STUDY_MATERIAL_TABLE);
            const chapterNotes = await db.select().from(CHAPTER_NOTES_TABLE);
            const studyTypeContent = await db.select().from(STUDY_TYPE_CONTENT_TABLE);
            const courseMedia = await db.select().from(COURSE_MEDIA_TABLE);
            const courseEnrollments = await db.select().from(COURSE_ENROLLMENT_TABLE);
            const paymentRecord = await db.select().from(PAYMENT_RECORD_TABLE);
            const studentProgress = await db.select().from(STUDENT_PROGRESS_TABLE);
            const certificates = await db.select().from(CERTIFICATES_TABLE);
            const courseAssignments = await db.select().from(COURSE_ASSIGNMENTS_TABLE);
            const assignmentSubmissions = await db.select().from(ASSIGNMENT_SUBMISSIONS_TABLE);
            const supportTickets = await db.select().from(SUPPORT_TICKETS_TABLE);
            const leaderboard = await db.select().from(LEADERBOARD_TABLE);
            const admins = await db.select().from(ADMIN_TABLE);
            const tutorRequests = await db.select().from(TUTOR_REQUESTS_TABLE);
            const announcements = await db.select().from(ANNOUNCEMENTS_TABLE);

            const backupPayload = {
              timestamp: new Date().toISOString(),
              version: "1.0",
              tables: {
                users,
                studyMaterial,
                chapterNotes,
                studyTypeContent,
                courseMedia,
                courseEnrollments,
                paymentRecord,
                studentProgress,
                certificates,
                courseAssignments,
                assignmentSubmissions,
                supportTickets,
                leaderboard,
                admins,
                tutorRequests,
                announcements
              }
            };

            const jsonString = JSON.stringify(backupPayload);
            const compressedBuffer = zlib.gzipSync(jsonString);
            const base64Data = compressedBuffer.toString("base64");
            const fileSize = compressedBuffer.length;

            const recordCount = Object.values(backupPayload.tables).reduce(
              (sum, table) => sum + (table?.length || 0), 
              0
            );

            const downloadToken = crypto.randomBytes(32).toString("hex");

            const timestampStr = new Date()
              .toISOString()
              .replace(/T/, "_")
              .replace(/\..+/, "")
              .replace(/:/g, "");
            const fileName = `backup_${timestampStr}.json.gz`;

            await db.insert(SYSTEM_BACKUP_TABLE).values({
              fileName,
              backupType: "scheduled",
              recordCount,
              fileSize,
              backupData: base64Data,
              downloadToken,
              createdBy: "system"
            });

            return {
              success: true,
              fileName,
              recordCount,
              fileSize
            };
        });

        return result;
    }
);
