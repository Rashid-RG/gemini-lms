const { neon } = require('@neondatabase/serverless');
const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

// Setup SMTP Transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: true,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
    },
});

const fromEmail = process.env.SMTP_USER || 'geminilmsadmin@gmail.com';
const appUrl = 'https://gemini-lms.vercel.app';

// Branded HTML Template
function buildWelcomeEmailHTML(firstName) {
    return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: "Segoe UI", Roboto, Arial, sans-serif; background-color: #f8fafc; color: #334155; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 30px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1); border: 1px solid #e2e8f0; }
          .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; padding: 40px 20px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.025em; }
          .header p { margin: 8px 0 0 0; font-size: 14px; opacity: 0.9; font-weight: 500; }
          .content { padding: 40px 30px; }
          .content h2 { margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #1e293b; }
          .content p { margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #475569; }
          .section { margin: 24px 0; padding: 20px; border-radius: 12px; border-left: 4px solid; }
          .section h3 { margin: 0 0 10px 0; font-size: 15px; font-weight: 700; display: flex; align-items: center; }
          .section-success { background-color: #f0fdf4; border-left-color: #10b981; }
          .section-success h3 { color: #065f46; }
          .section-warning { background-color: #fffbeb; border-left-color: #f59e0b; }
          .section-warning h3 { color: #92400e; }
          .section-info { background-color: #f0f9ff; border-left-color: #0284c7; }
          .section-info h3 { color: #075985; }
          .list { margin: 0; padding-left: 20px; font-size: 14px; color: #334155; }
          .list li { margin-bottom: 8px; line-height: 1.5; }
          .button-container { text-align: center; margin: 32px 0; }
          .button { display: inline-block; padding: 12px 32px; background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); color: white !important; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 15px; box-shadow: 0 4px 10px rgba(99, 102, 241, 0.2); transition: all 0.2s; }
          .footer { background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8; }
          .footer a { color: #6366f1; text-decoration: none; font-weight: 500; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Gemini LMS!</h1>
            <p>Your AI-Powered Learning Space</p>
          </div>
          
          <div class="content">
            <h2>Hi ${firstName},</h2>
            <p>Welcome to <strong>Gemini LMS</strong>! 🎉 We are thrilled to welcome you to our learning community. We've built an AI-native portal to help you automate study plans, generate custom quizzes, and trace your learning paths dynamically.</p>
            
            <div class="section section-success">
              <h3>🚀 What You Can Do Right Now:</h3>
              <ul class="list">
                <li>Create and customize personalized courses in seconds using AI</li>
                <li>Generate beautiful HTML chapter study notes and study cards</li>
                <li>Take dynamic quizzes with adaptive difficulty scales</li>
                <li>Obtain verified completion certificates</li>
              </ul>
            </div>
            
            <div class="section section-warning">
              <h3>💡 Quick Startup Tips:</h3>
              <ol class="list">
                <li>Go to your profile settings and add your learning preferences</li>
                <li>Create your first study material topic and choose your difficulty</li>
                <li>Spend 15 minutes a day reviewing weak topics flagged by our system</li>
              </ol>
            </div>
            
            <div class="button-container">
              <a href="${appUrl}/dashboard" class="button">Go to Dashboard</a>
            </div>
            
            <div class="section section-info">
              <h3>❓ Need Assistance?</h3>
              <p style="margin: 0; font-size: 14px;">Our engineering and academic staff are here to support your success. Reach out anytime at <a href="mailto:support@geminilms.com" style="color: #0284c7; font-weight: 600; text-decoration: none;">support@geminilms.com</a>.</p>
            </div>
            
            <p style="margin: 24px 0 0 0; font-size: 14px; color: #64748b; line-height: 1.5;">
              Happy learning!<br>
              <strong>The Gemini LMS Team</strong>
            </p>
          </div>
          
          <div class="footer">
            <p>© ${new Date().getFullYear()} Gemini LMS. All rights reserved.</p>
            <p>You received this email because you registered on our platform. <a href="${appUrl}/help">Help Center</a></p>
          </div>
        </div>
      </body>
    </html>
    `;
}

async function runBackfill() {
    const connectionString = process.env.NEXT_PUBLIC_DB_CONNECTION_STRING;
    if (!connectionString) {
        throw new Error('Database connection string is missing.');
    }
    const sql = neon(connectionString);
    
    console.log('Fetching registered users...');
    const users = await sql`SELECT id, name, email FROM users ORDER BY id ASC`;
    console.log(`Found ${users.length} users to review.`);
    
    let sentCount = 0;
    
    for (const user of users) {
        try {
            console.log(`Sending Welcome Email to: ${user.name} (${user.email})...`);
            
            const html = buildWelcomeEmailHTML(user.name);
            
            await transporter.sendMail({
                from: `"Gemini LMS" <${fromEmail}>`,
                to: user.email,
                subject: 'Welcome to Gemini LMS! 🎓',
                html: html
            });
            
            console.log(`✓ Email sent successfully to ${user.email}`);
            sentCount++;
            
            // Add a small delay between sending to prevent rate limits
            await new Promise(resolve => setTimeout(resolve, 1500));
        } catch (err) {
            console.error(`✗ Failed to send email to ${user.email}:`, err.message);
        }
    }
    
    console.log(`\n=== Backfill Finished ===`);
    console.log(`Successfully sent ${sentCount} Welcome Emails.`);
}

runBackfill().catch(console.error);
