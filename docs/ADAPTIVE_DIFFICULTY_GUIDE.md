# Adaptive Difficulty Feature - Integration Guide

## Overview
The **Adaptive Difficulty** system automatically adjusts quiz/MCQ difficulty based on student performance and identifies weak topics for spaced repetition. This keeps learners engaged at the right challenge level.

## How It Works

### 1. Performance Tracking
After each quiz/MCQ submission:
- Score is recorded
- Average performance calculated across attempts
- Mastery level determined (novice → expert)
- Weak topics identified (score < 60% after 2+ attempts)

### 2. Automatic Difficulty Adjustment
Difficulty transitions based on performance:
- **Score ≥ 85% + 2+ attempts** → Increase difficulty (Easy → Medium → Hard)
- **Score 70-84%** → Keep current difficulty
- **Score < 60% + 2+ attempts** → Decrease difficulty

### 3. Mastery Levels
- **Novice**: 0-60%, <2 attempts
- **Beginner**: 60-70%, attempted
- **Intermediate**: 70-80%, 1+ attempt
- **Proficient**: 80-90%, 2+ attempts
- **Expert**: 90%+, 3+ attempts

## Integration Points

### Quiz Submission Handler
```javascript
// In your quiz submission logic, call:
const response = await fetch('/api/adaptive-performance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        courseId: '...',
        studentEmail: '...',
        topicId: `chapter_${chapterId}`,
        topicName: 'Chapter Name',
        score: percentageScore,
        assessmentType: 'quiz'
    })
})

const { result } = await response.json()
console.log(`Recommended difficulty: ${result.recommendedDifficulty}`)
```

### Generate Difficulty-Adjusted Quizzes
```javascript
// Import the helper
import { getQuizDifficulty } from '@/lib/adaptiveDifficulty'

// Get current performance record
const performanceRecords = await fetchPerformance(courseId, studentEmail)
const topicRecord = performanceRecords.find(r => r.topicId === topicId)

// Get recommended difficulty
const difficulty = getQuizDifficulty(topicRecord) // Easy, Medium, Hard

// Pass to AI model
const PROMPT = `Generate ${difficulty} quiz questions on ${topicName}...`
const quiz = await aiModel.generate(PROMPT)
```

### Display Insights Dashboard
```javascript
// In course dashboard
import AdaptiveInsights from '@/components/AdaptiveInsights'

export default function Dashboard() {
    return (
        <AdaptiveInsights 
            courseId={courseId}
            studentEmail={studentEmail}
        />
    )
}
```

### Use Adaptive Hook in Quiz Pages
```javascript
import { useAdaptiveDifficulty } from '@/app/course/[courseId]/_hooks/useAdaptiveDifficulty'

export default function QuizPage({ courseId, chapterId, topicName }) {
    const { 
        difficulty, 
        masteryLevel, 
        isWeakTopic, 
        loadCurrentDifficulty,
        submitScore 
    } = useAdaptiveDifficulty(courseId, userEmail)

    useEffect(() => {
        loadCurrentDifficulty(`chapter_${chapterId}`)
    }, [chapterId])

    const handleQuizSubmit = async (answers) => {
        const score = calculateScore(answers)
        const updated = await submitScore(`chapter_${chapterId}`, topicName, score)
        
        // Show feedback
        if (updated.recommendedDifficulty !== difficulty) {
            toast(`Difficulty adjusted to ${updated.recommendedDifficulty}!`)
        }
    }
}
```

## Database Schema

### ADAPTIVE_PERFORMANCE_TABLE Fields
```javascript
{
    id: serial,
    courseId: varchar,
    studentEmail: varchar,
    topicId: varchar,
    topicName: varchar,
    totalAttempts: integer,           // How many times attempted
    correctAnswers: integer,          // Passed attempts (≥45%)
    averageScore: integer,            // Running average %
    currentDifficulty: varchar,       // Current level (Easy/Medium/Hard)
    recommendedDifficulty: varchar,   // Next recommended level
    masteryLevel: varchar,            // novice/beginner/intermediate/proficient/expert
    isWeakTopic: boolean,             // True if needs review
    reviewCount: integer,             // Times reviewed via spaced rep
    lastAttemptAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp
}
```

## API Endpoints

### POST /api/adaptive-performance
Track quiz/MCQ submission and get difficulty recommendation.

**Request:**
```json
{
    "courseId": "course-123",
    "studentEmail": "student@example.com",
    "topicId": "chapter_1",
    "topicName": "Introduction to Physics",
    "score": 78,
    "assessmentType": "quiz"
}
```

**Response:**
```json
{
    "result": {
        "topicId": "chapter_1",
        "totalAttempts": 3,
        "averageScore": 75,
        "currentDifficulty": "Medium",
        "recommendedDifficulty": "Hard",
        "masteryLevel": "intermediate",
        "isWeakTopic": false,
        "lastAttemptAt": "2025-12-07T..."
    },
    "isNew": false,
    "message": "Performance updated. Recommended difficulty: Hard"
}
```

### GET /api/adaptive-performance?courseId=X&studentEmail=Y
Fetch all performance records for a student in a course.

## Features

### Weak Topic Identification
Topics marked as weak when:
- Attempted ≥2 times AND average score < 60%
- Most recent attempt score < 70%

**Action**: Automatically recommend spaced repetition review

### Spaced Repetition Integration
```javascript
import { getTopicsNeedingReview } from '@/lib/adaptiveDifficulty'

const weakTopics = getTopicsNeedingReview(performanceRecords)
// Suggest these in "Study Plan" or "Quick Review"
```

### Engagement Scoring
```javascript
import { calculateEngagementScore } from '@/lib/adaptiveDifficulty'

const engagementScore = calculateEngagementScore(performanceRecord)
// 0-100: Show on dashboard, use for gamification
```

### Course-Level Mastery Summary
```javascript
import { getMasterySummary } from '@/lib/adaptiveDifficulty'

const summary = getMasterySummary(allPerformanceRecords)
// {
//   overallMastery: 75,
//   topicsMastered: 5,
//   topicsNeedingWork: 3,
//   weakTopics: [...]
// }
```

## Example: Quiz Page with Adaptive Logic

```javascript
'use client'

import { useState, useEffect } from 'react'
import { useAdaptiveDifficulty } from '@/app/course/[courseId]/_hooks/useAdaptiveDifficulty'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'

export default function QuizPage({ courseId, chapterId, topicName, questions }) {
    const [answers, setAnswers] = useState([])
    const [submitted, setSubmitted] = useState(false)
    const { difficulty, submitScore, masteryLevel, isWeakTopic } = useAdaptiveDifficulty(
        courseId, 
        userEmail
    )

    useEffect(() => {
        loadCurrentDifficulty(`chapter_${chapterId}`)
    }, [])

    const calculateScore = () => {
        const correct = answers.filter((ans, idx) => ans === questions[idx].answer).length
        return Math.round((correct / questions.length) * 100)
    }

    const handleSubmit = async () => {
        const score = calculateScore()
        const updated = await submitScore(`chapter_${chapterId}`, topicName, score)
        
        setSubmitted(true)

        // Show appropriate feedback
        if (isWeakTopic) {
            toast('⚠️ This topic needs more practice. Review scheduled.')
        } else if (updated.recommendedDifficulty !== difficulty) {
            toast(`🎯 Great progress! Difficulty increased to ${updated.recommendedDifficulty}`)
        } else {
            toast(`✅ Score: ${score}%`)
        }
    }

    return (
        <div>
            <div className="bg-blue-50 p-4 rounded mb-4">
                <p className="text-sm">Current Level: <strong>{difficulty}</strong></p>
                <p className="text-sm">Mastery: <strong>{masteryLevel}</strong></p>
            </div>

            {/* Quiz questions UI */}
            
            <Button onClick={handleSubmit}>Submit Quiz</Button>
        </div>
    )
}
```

## Metrics & Insights Component

The `<AdaptiveInsights />` component displays:
- **Overall Mastery %** - Running average across all topics
- **Topics Mastered** - Count with expert mastery level
- **Topics Needing Review** - Count of weak topics
- **Detailed Performance Table** - All topics with progress bars
- **Spaced Repetition Queue** - Weak topics sorted by score
- **Learning Tips** - Guidance on reaching mastery

## Benefits

✅ **Increased Engagement** - Difficulty stays challenging but achievable
✅ **Personalized Learning** - Adapt to individual learner speed
✅ **Identifies Struggling Areas** - Weak topics flagged for review
✅ **Data-Driven** - Uses performance history to recommend next steps
✅ **Transparent** - Students see mastery progress and why difficulty changed

## Future Enhancements

- Spaced repetition scheduling (review weak topics at optimal intervals)
- Predictive analytics (forecast mastery based on current pace)
- Peer benchmarking (compare performance to similar learners)
- Adaptive content generation (AI generates hints based on weak areas)
- Gamification (badges for reaching mastery levels)

---

**Implementation Status**: ✅ Ready to integrate into quiz/MCQ submission flows
