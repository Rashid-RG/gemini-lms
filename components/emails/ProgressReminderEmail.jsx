import React from 'react'
import { EmailLayout, EmailSection, EmailButton, StatCard, StatsRow } from './EmailLayout'

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
    <EmailLayout preheader={`Your weekly progress summary for ${courseName}`}>
      <div style={{ color: '#1f2937', lineHeight: '1.6' }}>
        <p style={{ fontSize: '16px', margin: '0 0 20px 0' }}>
          Hi <strong>{studentName}</strong>,
        </p>

        <p style={{ fontSize: '14px', margin: '0 0 20px 0' }}>
          Here's your weekly learning summary for <strong>{courseName}</strong>. Keep up the momentum!
        </p>

        {/* Summary Stats */}
        <StatsRow>
          <StatCard
            label="Overall Mastery"
            value={`${overallMastery}%`}
            icon="📚"
            color="#3b82f6"
          />
          <StatCard
            label="Topics Mastered"
            value={topicsMastered}
            icon="⭐"
            color="#10b981"
          />
          <StatCard
            label="Needs Review"
            value={topicsNeedingWork}
            icon="📌"
            color="#f59e0b"
          />
        </StatsRow>

        {/* Weak Topics Section */}
        {weakTopics.length > 0 && (
          <EmailSection 
            title="Topics to Focus On" 
            icon="🎯"
            backgroundColor="#fef3c7"
            borderColor="#f59e0b"
          >
            {weakTopics.map((topic, idx) => (
              <div key={idx} style={{ 
                padding: '12px', 
                backgroundColor: '#fffbeb', 
                borderRadius: '4px', 
                marginBottom: '8px', 
                fontSize: '14px', 
                color: '#78350f',
                borderLeft: '3px solid #f59e0b'
              }}>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>{topic.topicName}</div>
                <div style={{ fontSize: '13px' }}>
                  Current Mastery: <strong>{topic.score}%</strong> | 
                  Recommended: <strong>{topic.recommendedDifficulty}</strong>
                </div>
              </div>
            ))}
          </EmailSection>
        )}

        {/* Next Action Section */}
        {nextActionTopic && (
          <EmailSection 
            title="Your Next Step" 
            icon="📌"
            backgroundColor="#ecfdf5"
            borderColor="#10b981"
          >
            <p style={{ margin: '0', color: '#065f46', fontSize: '14px' }}>
              {nextActionTopic.suggestion || `Review ${nextActionTopic.topicName} at ${nextActionTopic.recommendedDifficulty} difficulty to improve mastery.`}
            </p>
          </EmailSection>
        )}

        {/* CTA Button */}
        <div style={{ textAlign: 'center', margin: '25px 0' }}>
          <EmailButton 
            href={`${process.env.NEXT_PUBLIC_APP_URL}/dashboard`}
            text="Continue Learning →"
          />
        </div>

        {/* Motivation Section */}
        <EmailSection 
          title="Keep the Momentum Going" 
          icon="🔥"
          backgroundColor="#fef3c7"
          borderColor="#f59e0b"
        >
          <p style={{ margin: '0', fontSize: '14px', color: '#1f2937' }}>
            Consistent practice is the key to mastery. You're doing great! Keep pushing and you'll see amazing results.
          </p>
        </EmailSection>

        <p style={{ fontSize: '14px', margin: '15px 0 0 0', color: '#6b7280' }}>
          Keep learning and stay focused on your goals!<br />
          The Gemini LMS Team
        </p>
      </div>
    </EmailLayout>
  )
}
