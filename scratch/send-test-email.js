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
const recipient = 'rashidruski001@gmail.com';

const premiumHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
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
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #311042 100%); 
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
    .header p {
      margin: 8px 0 0 0;
      font-size: 14px;
      color: #cbd5e1;
    }
    .content { padding: 40px 32px; }
    .footer { 
      background-color: #f8fafc; 
      padding: 30px 24px; 
      text-align: center; 
      border-top: 1px solid #f1f5f9; 
      font-size: 13px; 
      color: #64748b; 
    }
    .footer a {
      color: #4f46e5;
      text-decoration: none;
    }
    .section { 
      margin: 20px 0; 
      padding: 24px; 
      background-color: #f8fafc; 
      border: 1px solid #e2e8f0;
      border-left: 4px solid #4f46e5; 
      border-radius: 12px; 
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.01);
    }
    .section h3 {
      margin: 0 0 12px 0;
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
    }
    .amount { font-size: 26px; font-weight: 800; color: #4f46e5; letter-spacing: -0.5px; }
    .button { 
      display: inline-block; 
      padding: 14px 28px; 
      background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); 
      color: white !important; 
      text-decoration: none; 
      border-radius: 10px; 
      font-weight: 600;
      font-size: 14px;
      margin: 12px 0;
      box-shadow: 0 4px 12px rgba(79, 70, 229, 0.15);
    }
    ul {
      margin: 10px 0;
      padding-left: 20px;
    }
    li {
      margin-bottom: 8px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div style="font-size: 22px; font-weight: 700; letter-spacing: -0.5px; color: #ffffff; margin-bottom: 12px;">
        <span style="color: #a78bfa; font-weight: 800;">Gemini</span><span style="color: #ffffff; font-weight: 300;"> LMS</span>✨
      </div>
      <h1>Premium Email Test</h1>
      <p>Successful SMTP Configuration Delivery</p>
    </div>
    <div class="content">
      <p style="font-size: 16px; margin: 0 0 20px 0;">Hello,</p>
      <p style="font-size: 14px; margin: 0 0 20px 0;">This is a test email sent from your <strong>Gemini LMS</strong> development environment. It verifies that your personal Google SMTP credentials are properly authorized and operating.</p>
      
      <div class="section" style="border-left-color: #10b981; background-color: #f0fdf4; border-color: #bbf7d0;">
        <h3 style="color: #14532d;">✨ New Premium Design Applied</h3>
        <p style="margin: 0; color: #15803d; font-size: 13px;">
          This template uses the newly designed <strong>Plus Jakarta Sans</strong> typography, rounded corners, soft shadow gradients, and high-compatibility layout blocks.
        </p>
      </div>

      <div class="section" style="border-left-color: #4f46e5;">
        <h3>🚀 Current Configuration:</h3>
        <ul style="color: #475569; font-size: 13px;">
          <li><strong>SMTP Host:</strong> ${process.env.SMTP_HOST}</li>
          <li><strong>SMTP User:</strong> ${process.env.SMTP_USER}</li>
          <li><strong>Security:</strong> SSL (Port 465)</li>
        </ul>
      </div>

      <div style="text-align: center; margin: 25px 0;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://gemini-lms.vercel.app'}/dashboard" class="button">Visit LMS Dashboard</a>
      </div>

      <p style="font-size: 14px; margin: 20px 0 0 0; color: #64748b;">
        If you received this in your inbox, your email configuration is completely healthy and operating!
      </p>
      <p style="font-size: 14px; margin: 15px 0 0 0; color: #94a3b8;">
        The Gemini LMS Team
      </p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Gemini LMS. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

async function sendTest() {
    console.log(`Initializing test send to ${recipient}...`);
    
    const info = await transporter.sendMail({
        from: `"Gemini LMS" <${fromEmail}>`,
        to: recipient,
        subject: '✨ Premium Email Test - Gemini LMS',
        html: premiumHtml
    });
    
    console.log('✓ Success! Message ID:', info.messageId);
}

sendTest().catch(err => {
    console.error('✗ Test failed:', err);
});
