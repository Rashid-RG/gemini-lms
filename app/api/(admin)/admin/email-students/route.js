import { NextResponse } from "next/server";
import { db } from "@/configs/db";
import { USER_TABLE, STUDY_MATERIAL_TABLE, STUDENT_PROGRESS_TABLE, ADMIN_ACTIVITY_LOG_TABLE } from "@/configs/schema";
import { eq, desc, sql, inArray } from "drizzle-orm";
import { requireAdminOrAbove } from "@/lib/adminApiAuth";
import { emailService } from "@/lib/emailService";

/**
 * GET /api/admin/email-students
 * Get list of students for emailing with optional filters
 */
export async function GET(req) {
    const authResult = await requireAdminOrAbove();
    if (!authResult.authenticated) return authResult.error;

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

        users = Array.from(
            new Map(
                users.map((user) => [String(user.email || '').trim().toLowerCase(), user])
            ).values()
        );

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
    const authResult = await requireAdminOrAbove();
    if (!authResult.authenticated) return authResult.error;

    try {
        const { 
            recipients, // array of email addresses
            subject, 
            message,
            template, // 'custom', 'announcement', 'reminder', 'congratulations'
            signature, // 'founder', 'admin', or 'none'
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
        const htmlContent = buildEmailTemplate(template || 'custom', subject, message, signature || 'none');

        // Send emails in batches
        const results = {
            successful: [],
            failed: []
        };

        for (const email of recipients) {
            try {
                const result = await emailService.sendHtmlEmail({
                    to: email,
                    subject: subject,
                    html: htmlContent
                });

                results.successful.push({ email, id: result.data?.id });
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
function buildEmailTemplate(template, subject, message, signature = 'none') {
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
            bgColor: '#6366f1',
            icon: '📧',
            gradient: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)'
        },
        announcement: {
            bgColor: '#10b981',
            icon: '📢',
            gradient: 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
        },
        reminder: {
            bgColor: '#f59e0b',
            icon: '⏰',
            gradient: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)'
        },
        congratulations: {
            bgColor: '#8b5cf6',
            icon: '🎉',
            gradient: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)'
        }
    };

    const config = templates[template] || templates.custom;

    // Define signature HTML
    let signatureHtml = '';
    if (signature === 'founder') {
        signatureHtml = `
            <div style="margin-top: 35px; padding-top: 25px; border-top: 1px solid #f1f5f9; font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;">
                <p style="margin: 0 0 8px 0; font-size: 13px; color: #64748b; font-style: italic;">With warm regards,</p>
                <div style="margin-top: 10px;">
                    <div style="font-family: 'Dancing Script', 'Brush Script MT', cursive; font-size: 26px; color: #4f46e5; margin: 5px 0 12px 0; font-weight: 600; font-style: italic; letter-spacing: 0.5px;">M.S.F. Sajeefa</div>
                    <p style="margin: 0; font-size: 15px; font-weight: 700; color: #0f172a;">M.S.F. Sajeefa</p>
                    <p style="margin: 2px 0 0 0; font-size: 12px; color: #4f46e5; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Founder, Gemini LMS</p>
                    <p style="margin: 4px 0 0 0; font-size: 11px; color: #94a3b8; line-height: 1.4;">Transforming Education through AI Personalization</p>
                </div>
            </div>
        `;
    } else if (signature === 'admin') {
        signatureHtml = `
            <div style="margin-top: 35px; padding-top: 25px; border-top: 1px solid #f1f5f9; font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;">
                <p style="margin: 0 0 8px 0; font-size: 13px; color: #64748b; font-style: italic;">Best regards,</p>
                <div>
                    <p style="margin: 0; font-size: 15px; font-weight: 700; color: #0f172a;">Gemini LMS Administration</p>
                    <p style="margin: 2px 0 0 0; font-size: 12px; color: #64748b;">Academic & Teammate Operations</p>
                </div>
            </div>
        `;
    }

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
                body { 
                    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
                    line-height: 1.6; 
                    color: #334155; 
                    background-color: #f8fafc;
                    padding: 40px 20px;
                    margin: 0;
                }
                .container { 
                    max-width: 600px; 
                    margin: 0 auto; 
                    background-color: #ffffff;
                    border-radius: 16px;
                    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.02), 0 8px 10px -6px rgba(0, 0, 0, 0.03);
                    border: 1px solid #f1f5f9;
                    overflow: hidden;
                }
                .header { 
                    background: ${config.gradient}; 
                    color: white; 
                    padding: 35px 24px; 
                    text-align: center; 
                }
                .header h1 { 
                    margin: 0; 
                    font-size: 24px; 
                    font-weight: 700;
                    letter-spacing: -0.5px;
                }
                .icon { font-size: 40px; margin-bottom: 12px; }
                .content { padding: 40px 32px; }
                .message { color: #334155; font-size: 15px; line-height: 1.6; }
                .button { 
                    display: inline-block; 
                    background: ${config.gradient}; 
                    color: white !important; 
                    padding: 14px 28px; 
                    text-decoration: none; 
                    border-radius: 10px; 
                    font-weight: 600;
                    font-size: 14px;
                    margin: 24px 0;
                    box-shadow: 0 4px 12px rgba(79, 70, 229, 0.15);
                    text-align: center;
                }
                .footer { 
                    background-color: #f8fafc; 
                    padding: 30px 24px; 
                    text-align: center; 
                    color: #64748b; 
                    font-size: 13px; 
                    border-top: 1px solid #f1f5f9;
                }
                .footer a { color: #4f46e5; text-decoration: none; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div style="font-size: 22px; font-weight: 700; letter-spacing: -0.5px; color: #ffffff; margin-bottom: 12px;">
                        <span style="color: #a78bfa; font-weight: 800;">Gemini</span><span style="color: #ffffff; font-weight: 300;"> LMS</span>✨
                    </div>
                    <div class="icon">${config.icon}</div>
                    <h1>${subject}</h1>
                </div>
                <div class="content">
                    <div class="message">
                        ${formattedMessage}
                    </div>
                    ${signatureHtml}
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
                    <p style="font-size: 12px; color: #94a3b8; font-style: italic; margin-top: 10px;">
                        You received this email because you have an active account on ${appName}.
                    </p>
                </div>
            </div>
        </body>
        </html>
    `;
}
