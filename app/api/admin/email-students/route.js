import { NextResponse } from "next/server";
import { Resend } from 'resend';
import { db } from "@/configs/db";
import { USER_TABLE, STUDY_MATERIAL_TABLE, STUDENT_PROGRESS_TABLE, ADMIN_ACTIVITY_LOG_TABLE } from "@/configs/schema";
import { eq, desc, sql, inArray } from "drizzle-orm";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * GET /api/admin/email-students
 * Get list of students for emailing with optional filters
 */
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const courseId = searchParams.get('courseId');
        const filter = searchParams.get('filter'); // 'all', 'enrolled', 'completed', 'in-progress'

        // Get all users
        let users = await db.select({
            id: USER_TABLE.id,
            email: USER_TABLE.email,
            name: USER_TABLE.name,
            createdAt: USER_TABLE.createdAt
        }).from(USER_TABLE).orderBy(desc(USER_TABLE.createdAt));

        // If filtering by course enrollment
        if (courseId && filter && filter !== 'all') {
            const progress = await db.select({
                studentEmail: STUDENT_PROGRESS_TABLE.studentEmail,
                status: STUDENT_PROGRESS_TABLE.status
            }).from(STUDENT_PROGRESS_TABLE)
            .where(eq(STUDENT_PROGRESS_TABLE.courseId, courseId));

            const enrolledEmails = progress.map(p => p.studentEmail);
            const completedEmails = progress.filter(p => p.status === 'Completed').map(p => p.studentEmail);
            const inProgressEmails = progress.filter(p => p.status === 'In Progress').map(p => p.studentEmail);

            if (filter === 'enrolled') {
                users = users.filter(u => enrolledEmails.includes(u.email));
            } else if (filter === 'completed') {
                users = users.filter(u => completedEmails.includes(u.email));
            } else if (filter === 'in-progress') {
                users = users.filter(u => inProgressEmails.includes(u.email));
            }
        }

        // Get all courses for the course filter dropdown
        const courses = await db.select({
            courseId: STUDY_MATERIAL_TABLE.courseId,
            topic: STUDY_MATERIAL_TABLE.topic
        }).from(STUDY_MATERIAL_TABLE)
        .where(eq(STUDY_MATERIAL_TABLE.status, 'Ready'))
        .orderBy(desc(STUDY_MATERIAL_TABLE.createdAt))
        .limit(100);

        return NextResponse.json({ 
            students: users,
            courses: courses,
            totalCount: users.length 
        });
    } catch (error) {
        console.error('Error fetching students:', error);
        return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
    }
}

/**
 * POST /api/admin/email-students
 * Send bulk or individual emails to students
 */
export async function POST(req) {
    try {
        const { 
            recipients, // array of email addresses
            subject, 
            message,
            template, // 'custom', 'announcement', 'reminder', 'congratulations'
            adminEmail 
        } = await req.json();

        if (!recipients || recipients.length === 0) {
            return NextResponse.json({ error: 'No recipients specified' }, { status: 400 });
        }

        if (!subject || !message) {
            return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 });
        }

        // Limit batch size to prevent abuse
        const MAX_BATCH_SIZE = 50;
        if (recipients.length > MAX_BATCH_SIZE) {
            return NextResponse.json({ 
                error: `Maximum ${MAX_BATCH_SIZE} recipients allowed per request` 
            }, { status: 400 });
        }

        // Build email HTML based on template
        const htmlContent = buildEmailTemplate(template || 'custom', subject, message);

        // Send emails in batches
        const results = {
            successful: [],
            failed: []
        };

        // Resend supports batch sending
        for (const email of recipients) {
            try {
                const { data, error } = await resend.emails.send({
                    from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
                    to: [email],
                    subject: subject,
                    html: htmlContent
                });

                if (error) {
                    results.failed.push({ email, error: error.message });
                } else {
                    results.successful.push({ email, id: data?.id });
                }
            } catch (err) {
                results.failed.push({ email, error: err.message });
            }
        }

        // Log admin activity
        if (adminEmail) {
            await db.insert(ADMIN_ACTIVITY_LOG_TABLE).values({
                adminEmail,
                action: 'send_bulk_email',
                targetType: 'email',
                targetId: `batch_${Date.now()}`,
                details: {
                    recipientCount: recipients.length,
                    successful: results.successful.length,
                    failed: results.failed.length,
                    subject
                }
            });
        }

        return NextResponse.json({
            success: true,
            results,
            summary: {
                total: recipients.length,
                sent: results.successful.length,
                failed: results.failed.length
            }
        });
    } catch (error) {
        console.error('Error sending emails:', error);
        return NextResponse.json({ error: 'Failed to send emails' }, { status: 500 });
    }
}

/**
 * Build HTML email template based on type
 */
function buildEmailTemplate(template, subject, message) {
    const appName = 'Gemini LMS';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const year = new Date().getFullYear();

    // Convert newlines to <br> tags and handle basic formatting
    const formattedMessage = message
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');

    const templates = {
        custom: {
            bgColor: '#4F46E5',
            icon: '📧'
        },
        announcement: {
            bgColor: '#059669',
            icon: '📢'
        },
        reminder: {
            bgColor: '#D97706',
            icon: '⏰'
        },
        congratulations: {
            bgColor: '#7C3AED',
            icon: '🎉'
        }
    };

    const config = templates[template] || templates.custom;

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: ${config.bgColor}; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                .header h1 { margin: 0; font-size: 24px; }
                .icon { font-size: 48px; margin-bottom: 15px; }
                .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
                .message { color: #374151; font-size: 16px; }
                .button { display: inline-block; background: ${config.bgColor}; color: white !important; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                .footer { background: #f3f4f6; padding: 20px; text-align: center; color: #6B7280; font-size: 14px; border-radius: 0 0 10px 10px; }
                .footer a { color: #4F46E5; text-decoration: none; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="icon">${config.icon}</div>
                    <h1>${subject}</h1>
                </div>
                <div class="content">
                    <div class="message">
                        ${formattedMessage}
                    </div>
                    <center>
                        <a href="${appUrl}/dashboard" class="button">
                            Go to Dashboard
                        </a>
                    </center>
                </div>
                <div class="footer">
                    <p>© ${year} ${appName}. All rights reserved.</p>
                    <p>
                        <a href="${appUrl}">Visit Website</a> | 
                        <a href="${appUrl}/dashboard/support">Support</a>
                    </p>
                    <p style="font-size: 12px; color: #9ca3af;">
                        You received this email because you have an account on ${appName}.
                    </p>
                </div>
            </div>
        </body>
        </html>
    `;
}
