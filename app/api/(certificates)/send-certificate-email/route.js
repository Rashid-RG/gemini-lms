import { NextResponse } from "next/server";
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * POST /api/send-certificate-email
 * Send certificate notification email to student using Resend
 */
export async function POST(req) {
  try {
    const { studentEmail, studentName, courseName, certificateId, finalScore, courseId } = await req.json();

    if (!studentEmail || !studentName || !courseName || !certificateId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const certificateUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/course/${courseId}/certificate`;

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: [studentEmail],
      subject: `🎉 Congratulations! Your ${courseName} Certificate is Ready`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .cert-details { background: white; padding: 20px; border-left: 4px solid #10B981; margin: 20px 0; }
            .footer { text-align: center; color: #6B7280; font-size: 14px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎓 Congratulations, ${studentName}!</h1>
            </div>
            <div class="content">
              <h2>You've Earned Your Certificate!</h2>
              <p>We're thrilled to inform you that you have successfully completed the course:</p>
              
              <div class="cert-details">
                <h3 style="color: #4F46E5; margin-top: 0;">${courseName}</h3>
                <p><strong>Certificate ID:</strong> ${certificateId}</p>
                <p><strong>Final Score:</strong> ${finalScore}%</p>
                <p><strong>Issue Date:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>

              <p>Your dedication and hard work have paid off! This certificate validates your knowledge and skills in this subject area.</p>

              <center>
                <a href="${certificateUrl}" class="button">
                  View & Download Certificate
                </a>
              </center>

              <h3>What's Next?</h3>
              <ul>
                <li>Download your certificate and add it to your portfolio</li>
                <li>Share your achievement on social media</li>
                <li>Explore more courses to continue your learning journey</li>
              </ul>

              <p>Keep up the great work, and we look forward to seeing you achieve even more!</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Gemini LMS. All rights reserved.</p>
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Congratulations ${studentName}!
        
        You've successfully completed: ${courseName}
        Certificate ID: ${certificateId}
        Final Score: ${finalScore}%
        
        View your certificate at: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/course/certificate
        
        Keep up the great work!
      `
    });

    if (error) {
      console.error("Resend API Error:", error);
      return NextResponse.json(
        { error: "Failed to send email", details: error },
        { status: 500 }
      );
    }

    console.log('Certificate email sent successfully via Resend:', data);

    return NextResponse.json({ 
      success: true,
      message: "Certificate email sent successfully",
      emailId: data?.id
    });
  } catch (err) {
    console.error("Email Send Error:", err);
    return NextResponse.json(
      { error: "Failed to send email", details: err.message },
      { status: 500 }
    );
  }
}
