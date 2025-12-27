export function buildReminderEmailHTML({ studentName, courseName, overallMastery, topicsMastered, topicsNeedingWork, nextActionTopic, weakTopics }) {
  const weakTopicsHTML = (weakTopics || [])
    .map(
      (t) => `
      <div style="padding: 10px; background-color: #fef3c7; border-radius: 4px; margin-bottom: 8px;">
        <strong>${t.topicName}</strong> - Score: ${t.score?.toFixed(1) || 'N/A'}% (${t.recommendedDifficulty})
      </div>
    `,
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; background-color: #f5f5f5; color: #333; }
          .container { max-width: 600px; margin: 0 auto; background-color: #fff; padding: 20px; border-radius: 8px; }
          .header { background-color: #4f46e5; color: white; padding: 20px; border-radius: 8px; text-align: center; }
          .section { margin: 20px 0; }
          .card { padding: 15px; background-color: #f9fafb; border-radius: 6px; border-left: 4px solid #4f46e5; }
          .progress-bar { width: 100%; height: 20px; background-color: #e5e7eb; border-radius: 10px; overflow: hidden; }
          .progress-fill { height: 100%; background-color: #10b981; }
          .cta-button { display: inline-block; padding: 12px 20px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 6px; margin-top: 15px; }
          .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Your Learning Progress Summary</h1>
            <p>Course: <strong>${courseName}</strong></p>
          </div>

          <div class="section">
            <h2>Hello ${studentName},</h2>
            <p>Here's your weekly progress summary:</p>
          </div>

          <div class="section">
            <h3>Overall Mastery: ${overallMastery?.toFixed(1) || 'N/A'}%</h3>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${Math.min(overallMastery || 0, 100)}%;"></div>
            </div>
            <p>Topics Mastered: <strong>${topicsMastered}</strong> | Topics Needing Work: <strong>${topicsNeedingWork}</strong></p>
          </div>

          <div class="section">
            <div class="card">
              <h3>📚 Topics Needing Attention:</h3>
              ${weakTopicsHTML || '<p>Great job! All topics are progressing well.</p>'}
            </div>
          </div>

          <div class="section">
            <div class="card">
              <h3>🎯 Next Action:</h3>
              ${
                nextActionTopic
                  ? `
                <p><strong>${nextActionTopic.topicName}</strong> (Current Score: ${nextActionTopic.score?.toFixed(1) || 'N/A'}%)</p>
                <p>${nextActionTopic.suggestion}</p>
              `
                  : '<p>Keep up the great work! All topics are on track.</p>'
              }
            </div>
          </div>

          <div style="text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard" class="cta-button">
              Continue Learning →
            </a>
          </div>

          <div class="footer">
            <p>This is an automated email from Gemini LMS. Please do not reply to this email.</p>
            <p>&copy; 2025 Gemini LMS. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}
