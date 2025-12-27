import React from 'react'

export const ProgressReminderEmail = ({ 
  studentName = 'Student', 
  courseName = 'Your Course',
  overallMastery = 0,
  topicsMastered = 0,
  topicsNeedingWork = 0,
  nextActionTopic = null,
  weakTopics = []
}) => {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto', padding: '20px', backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#3b82f6', color: 'white', padding: '20px', borderRadius: '8px 8px 0 0', textAlign: 'center' }}>
        <h1 style={{ margin: '0 0 10px 0', fontSize: '24px' }}>📚 Your Weekly Learning Summary</h1>
        <p style={{ margin: '0', fontSize: '14px' }}>Progress update for {courseName}</p>
      </div>

      {/* Content */}
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '0 0 8px 8px' }}>
        <p style={{ margin: '0 0 20px 0', color: '#1f2937' }}>Hi {studentName},</p>

        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
          <div style={{ backgroundColor: '#dbeafe', padding: '12px', borderRadius: '6px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1e40af' }}>{overallMastery}%</div>
            <div style={{ fontSize: '12px', color: '#1e3a8a' }}>Overall Mastery</div>
          </div>
          <div style={{ backgroundColor: '#dcfce7', padding: '12px', borderRadius: '6px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#15803d' }}>{topicsMastered}</div>
            <div style={{ fontSize: '12px', color: '#166534' }}>Topics Mastered</div>
          </div>
          <div style={{ backgroundColor: '#fed7aa', padding: '12px', borderRadius: '6px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#b45309' }}>{topicsNeedingWork}</div>
            <div style={{ fontSize: '12px', color: '#92400e' }}>Need Review</div>
          </div>
        </div>

        {/* Weak Topics */}
        {weakTopics.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#1f2937' }}>🎯 Topics to Focus On</h3>
            {weakTopics.map((topic, idx) => (
              <div key={idx} style={{ backgroundColor: '#fef3c7', padding: '10px', borderRadius: '4px', marginBottom: '8px', fontSize: '14px', color: '#78350f' }}>
                <strong>{topic.topicName}</strong> - {topic.score}% (Recommended: {topic.recommendedDifficulty})
              </div>
            ))}
          </div>
        )}

        {/* Next Action */}
        {nextActionTopic && (
          <div style={{ backgroundColor: '#ecfdf5', border: '2px solid #10b981', padding: '15px', borderRadius: '6px', marginBottom: '20px' }}>
            <h3 style={{ margin: '0 0 8px 0', color: '#047857' }}>📌 Your Next Step</h3>
            <p style={{ margin: '0', color: '#065f46', fontSize: '14px' }}>
              {nextActionTopic.suggestion || `Review ${nextActionTopic.topicName} at ${nextActionTopic.recommendedDifficulty} difficulty to boost mastery.`}
            </p>
          </div>
        )}

        {/* CTA */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <a href="#" style={{
            backgroundColor: '#3b82f6',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '6px',
            textDecoration: 'none',
            fontWeight: 'bold',
            fontSize: '14px',
            display: 'inline-block'
          }}>
            Continue Learning →
          </a>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '20px 0' }} />

        <p style={{ margin: '0', color: '#6b7280', fontSize: '12px', lineHeight: '1.6' }}>
          Keep up the momentum! Consistent practice improves retention. Check your dashboard for detailed insights and personalized recommendations.
        </p>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', marginTop: '20px', color: '#9ca3af', fontSize: '12px' }}>
        <p style={{ margin: '0' }}>You're receiving this because you enabled progress reminders.</p>
        <p style={{ margin: '0' }}>© 2025 Gemini LMS. All rights reserved.</p>
      </div>
    </div>
  )
}
