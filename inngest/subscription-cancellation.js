// Add this to inngest/functions.js - Subscription Cancellation Email Function

export const SubscriptionCancelledEmail = inngest.createFunction(
    { id: 'subscription-cancelled-email', retries: 2 },
    { event: 'subscription.cancelled' },
    async ({ event, step }) => {
        try {
            const { userEmail, userName, refundAmount, reason, cancelledAt } = event.data;

            if (!userEmail) {
                console.error('SubscriptionCancelledEmail: No email provided');
                throw new Error('No email provided');
            }

            // Send refund confirmation email
            const emailResult = await step.run('Send Refund Confirmation Email', async () => {
                const resend = new Resend(process.env.RESEND_API_KEY);

                const htmlContent = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="UTF-8">
                        <style>
                            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
                            .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
                            .section { margin: 20px 0; padding: 15px; background: white; border-left: 4px solid #667eea; border-radius: 4px; }
                            .amount { font-size: 24px; font-weight: bold; color: #27ae60; }
                            .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; text-align: center; }
                            .button { display: inline-block; padding: 10px 20px; background: #667eea; color: white; text-decoration: none; border-radius: 4px; margin-top: 10px; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <h1>Subscription Cancelled</h1>
                                <p>We've processed your cancellation request</p>
                            </div>

                            <div class="content">
                                <p>Hi ${userName || 'Valued User'},</p>

                                <p>Your premium membership has been successfully cancelled. Here are the details:</p>

                                <div class="section">
                                    <h3>Cancellation Details</h3>
                                    <p><strong>Cancellation Date:</strong> ${new Date(cancelledAt).toLocaleDateString()}</p>
                                    <p><strong>Status:</strong> Premium membership removed</p>
                                    ${reason ? `<p><strong>Your Feedback:</strong> "${reason}"</p>` : ''}
                                </div>

                                <div class="section">
                                    <h3>Refund Information</h3>
                                    <p>Refund Amount: <span class="amount">Rs. ${refundAmount}</span></p>
                                    <p><strong>Status:</strong> Full refund processed</p>
                                    <p>The refund will be credited to your original payment method within 3-5 business days.</p>
                                </div>

                                <div class="section" style="border-left-color: #f39c12;">
                                    <h3>What's Next?</h3>
                                    <p>Your course creation credits have been reset to 0. You can still:</p>
                                    <ul>
                                        <li>View and access your completed courses</li>
                                        <li>Purchase credit packs anytime to create new courses</li>
                                        <li>Upgrade back to premium membership</li>
                                    </ul>
                                </div>

                                <p>If you have any questions or need assistance, please don't hesitate to reach out to our support team.</p>

                                <p>
                                    <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/support" class="button">Contact Support</a>
                                </p>

                                <p>We appreciate your time with us and hope to see you again in the future!</p>

                                <div class="footer">
                                    <p>© ${new Date().getFullYear()} Gemini LMS. All rights reserved.</p>
                                    <p>This is an automated email. Please don't reply to this message.</p>
                                </div>
                            </div>
                        </div>
                    </body>
                    </html>
                `;

                return await resend.emails.send({
                    from: 'Gemini LMS <noreply@geminilms.com>',
                    to: userEmail,
                    subject: 'Subscription Cancelled - Refund Processed',
                    html: htmlContent
                });
            });

            console.log('Refund confirmation email sent to:', userEmail);
            return { success: true, emailId: emailResult.id };

        } catch (err) {
            console.error('SubscriptionCancelledEmail error:', err);
            throw err;
        }
    }
);
