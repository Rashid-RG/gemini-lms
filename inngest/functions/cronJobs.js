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
import { eq, and, lt, sql, desc } from "drizzle-orm";
import { emailService } from "@/lib/emailService";
import { getMasterySummary } from "@/lib/adaptiveDifficulty";
import { buildReminderEmailHTML } from "@/lib/reminderEmail";
import { refundCourseCredits } from "@/lib/credits";
import { STALE_COURSE_THRESHOLD_MINUTES } from "@/lib/constants";

export const SendWeeklyProgressReminders = inngest.createFunction(
    { id: 'weekly-progress-reminders' },
    { cron: '0 9 * * 1' },
    async ({ step }) => {
        if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
            console.error('SendWeeklyProgressReminders: SMTP credentials missing; skipping run');
            throw new Error('SMTP credentials not configured');
        }

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
                    const res = await emailService.sendHtmlEmail({
                        to: studentEmail,
                        subject: `Your Weekly Progress Summary - ${courseName}`,
                        html,
                    });

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

export const CheckSubAndCreditLimits = inngest.createFunction(
    { id: 'check-sub-and-credit-limits' },
    { cron: '0 8 * * *' }, // Run daily at 8:00 AM
    async ({ step }) => {
        if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
            console.error('CheckSubAndCreditLimits: SMTP credentials missing; skipping run');
            throw new Error('SMTP credentials not configured');
        }

        const stats = await step.run('Process low credits and expiring subscriptions', async () => {
            let lowCreditsEmailed = 0;
            let subExpiringEmailed = 0;
            const errors = [];

            // 1. Process Low Credits warnings for free users (isMember = false, credits <= 1)
            try {
                const freeUsersWithLowCredits = await db
                    .select()
                    .from(USER_TABLE)
                    .where(
                        and(
                            eq(USER_TABLE.isMember, false),
                            sql`${USER_TABLE.credits} <= 1`
                        )
                    );

                for (const user of freeUsersWithLowCredits) {
                    try {
                        const email = user.email.trim().toLowerCase();
                        
                        // Get latest course creation transaction
                        const lastCourseCreation = await db
                            .select()
                            .from(CREDIT_TRANSACTION_TABLE)
                            .where(
                                and(
                                    eq(CREDIT_TRANSACTION_TABLE.userEmail, email),
                                    eq(CREDIT_TRANSACTION_TABLE.type, 'course_creation')
                                )
                            )
                            .orderBy(desc(CREDIT_TRANSACTION_TABLE.createdAt))
                            .limit(1);

                        if (lastCourseCreation.length > 0) {
                            // Check if a warning was already sent after this latest course creation
                            const lastWarning = await db
                                .select()
                                .from(CREDIT_TRANSACTION_TABLE)
                                .where(
                                    and(
                                        eq(CREDIT_TRANSACTION_TABLE.userEmail, email),
                                        eq(CREDIT_TRANSACTION_TABLE.type, 'low_credits_warning'),
                                        sql`${CREDIT_TRANSACTION_TABLE.createdAt} > ${lastCourseCreation[0].createdAt}`
                                    )
                                )
                                .limit(1);

                            if (lastWarning.length === 0) {
                                // No warning sent since last credit deduction! Send it now.
                                await emailService.sendLowCreditsWarning(
                                    user.email,
                                    user.name || 'Learner',
                                    user.credits ?? 0
                                );

                                // Log the warning in credit transaction table
                                await db.insert(CREDIT_TRANSACTION_TABLE).values({
                                    userEmail: email,
                                    amount: 0,
                                    type: 'low_credits_warning',
                                    reason: 'Low credits warning email sent',
                                    balanceBefore: user.credits ?? 0,
                                    balanceAfter: user.credits ?? 0,
                                    createdBy: 'system'
                                });

                                lowCreditsEmailed++;
                            }
                        } else {
                            // If they have no transactions at all but credits <= 1
                            // check if warned in last 30 days
                            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                            const recentWarning = await db
                                .select()
                                .from(CREDIT_TRANSACTION_TABLE)
                                .where(
                                    and(
                                        eq(CREDIT_TRANSACTION_TABLE.userEmail, email),
                                        eq(CREDIT_TRANSACTION_TABLE.type, 'low_credits_warning'),
                                        sql`${CREDIT_TRANSACTION_TABLE.createdAt} > ${thirtyDaysAgo}`
                                    )
                                )
                                .limit(1);

                            if (recentWarning.length === 0) {
                                await emailService.sendLowCreditsWarning(
                                    user.email,
                                    user.name || 'Learner',
                                    user.credits ?? 0
                                );

                                await db.insert(CREDIT_TRANSACTION_TABLE).values({
                                    userEmail: email,
                                    amount: 0,
                                    type: 'low_credits_warning',
                                    reason: 'Low credits warning email sent (no previous course creation tx)',
                                    balanceBefore: user.credits ?? 0,
                                    balanceAfter: user.credits ?? 0,
                                    createdBy: 'system'
                                });

                                lowCreditsEmailed++;
                            }
                        }
                    } catch (userErr) {
                        console.error(`Error processing low credits warning for user ${user.email}:`, userErr);
                        errors.push({ email: user.email, type: 'low_credits', error: userErr.message });
                    }
                }
            } catch (err) {
                console.error("Error in low credits warnings scan:", err);
                errors.push({ type: 'low_credits_scan', error: err.message });
            }

            // 2. Process expiring subscriptions (isMember = true)
            try {
                const premiumUsers = await db
                    .select()
                    .from(USER_TABLE)
                    .where(eq(USER_TABLE.isMember, true));

                const now = new Date();
                const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

                for (const user of premiumUsers) {
                    try {
                        const email = user.email.trim().toLowerCase();

                        // Get latest active/completed subscription payment
                        const latestSub = await db
                            .select()
                            .from(PAYMENT_RECORD_TABLE)
                            .where(
                                and(
                                    eq(PAYMENT_RECORD_TABLE.userEmail, email),
                                    eq(PAYMENT_RECORD_TABLE.status, 'completed'),
                                    eq(PAYMENT_RECORD_TABLE.planType, 'subscription')
                                )
                            )
                            .orderBy(desc(PAYMENT_RECORD_TABLE.createdAt))
                            .limit(1);

                        if (latestSub.length > 0) {
                            const sub = latestSub[0];
                            const createdAt = new Date(sub.createdAt);
                            const durationDays = sub.plan === 'premium_yearly' ? 365 : 30;
                            const expirationDate = new Date(createdAt.getTime() + durationDays * 24 * 60 * 60 * 1000);

                            // We want to notify if expiration is within the next 3 days (and in the future)
                            if (expirationDate > now && expirationDate <= threeDaysFromNow) {
                                // Check if we already warned them for this specific subscription
                                const lastWarning = await db
                                    .select()
                                    .from(CREDIT_TRANSACTION_TABLE)
                                    .where(
                                        and(
                                            eq(CREDIT_TRANSACTION_TABLE.userEmail, email),
                                            eq(CREDIT_TRANSACTION_TABLE.type, 'sub_expiry_warning'),
                                            sql`${CREDIT_TRANSACTION_TABLE.createdAt} > ${sub.createdAt}`
                                        )
                                    )
                                    .limit(1);

                                if (lastWarning.length === 0) {
                                    await emailService.sendSubscriptionExpiringSoon(
                                        user.email,
                                        user.name || 'Learner',
                                        expirationDate
                                    );

                                    // Log warning in credit transaction table to prevent double-emailing
                                    await db.insert(CREDIT_TRANSACTION_TABLE).values({
                                        userEmail: email,
                                        amount: 0,
                                        type: 'sub_expiry_warning',
                                        reason: `Subscription expiring soon warning sent. Expiry: ${expirationDate.toISOString()}`,
                                        balanceBefore: user.credits ?? 0,
                                        balanceAfter: user.credits ?? 0,
                                        createdBy: 'system'
                                    });

                                    subExpiringEmailed++;
                                }
                            }
                        }
                    } catch (userErr) {
                        console.error(`Error processing subscription expiry warning for user ${user.email}:`, userErr);
                        errors.push({ email: user.email, type: 'sub_expiry', error: userErr.message });
                    }
                }
            } catch (err) {
                console.error("Error in subscription expiry warnings scan:", err);
                errors.push({ type: 'sub_expiry_scan', error: err.message });
            }

            return {
                lowCreditsEmailed,
                subExpiringEmailed,
                errors
            };
        });

        return stats;
    }
);

