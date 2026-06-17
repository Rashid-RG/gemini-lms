# Advanced GradeBook Features - Complete Documentation

## Overview

Comprehensive advanced GradeBook system with 10 enterprise-grade features for grade management, analytics, and student support.

---

## ✅ Features Implemented

### 1. **Assignment Breakdown** 📋
Show individual assignment scores and feedback within each course.

**Endpoint:** `GET /api/grades/assignment-breakdown?courseId=xxx&studentEmail=xxx`

**Response:**
```json
{
  "courseId": "course-id",
  "courseName": "Course Name",
  "assignments": [
    {
      "assignmentId": "assign-1",
      "title": "Assignment 1",
      "totalPoints": 100,
      "submitted": true,
      "submissionDetails": {
        "score": 85,
        "percentage": 85,
        "status": "Graded",
        "feedback": "Great work!",
        "isLate": false,
        "strengths": ["clear_logic"],
        "improvements": ["add_comments"]
      }
    }
  ],
  "statistics": {
    "totalAssignments": 5,
    "submittedAssignments": 4,
    "totalPoints": 500,
    "earnedPoints": 410,
    "overallPercentage": 82
  }
}
```

---

### 2. **Grade Comments & Feedback** 💬
Instructors can add detailed comments to student grades.

**Endpoints:**

- `POST /api/grades/comments` - Add comment
- `GET /api/grades/comments?courseId=xxx&studentEmail=xxx` - Get comments
- `DELETE /api/grades/comments?id=xxx` - Delete comment

**POST Request:**
```json
{
  "courseId": "course-id",
  "studentEmail": "student@example.com",
  "assessmentType": "assignment",
  "assessmentId": "assign-1",
  "comment": "Great effort! Consider improving X...",
  "isPrivate": false
}
```

**Features:**
- ✅ Public and private comments
- ✅ Pinned important comments
- ✅ Timestamp tracking
- ✅ Instructor attribution

---

### 3. **CSV/PDF Export** 📊
Download grades in spreadsheet format for record-keeping or analysis.

**Endpoint:** `GET /api/grades/export-csv?type=student|instructor&courseId=xxx`

**Types:**
- `student` - Export own grades across all courses
- `instructor` - Export all students' grades for a course (instructor only)

**Output Format:**
```
Student Email: student@example.com
Export Date: 2025-06-15T10:30:00Z

Course Name,Progress %,Quiz Avg,Assignment Avg,MCQ Avg,Final Grade,Status,Started,Completed
"Course A",85,88,90,82,87,"In Progress","2025-01-15",
"Course B",100,92,95,89,92,"Completed","2025-02-01","2025-06-01"
```

---

### 4. **Grade Curves** 📈
Apply grade adjustments to entire classes or specific student groups.

**Endpoints:**
- `POST /api/grades/curves` - Create/update curve
- `GET /api/grades/curves?courseId=xxx` - Get curve
- `PUT /api/grades/curves/apply` - Apply curve to all students

**Curve Types:**
1. **Flat Bonus** - Add fixed points (e.g., +5 points for all)
2. **Percentage Increase** - Add percentage boost (e.g., +10%)
3. **Scale Compression** - Boost lower grades more generously
4. **Replacement** - Replace with new grade

**Application Rules:**
- `all_students` - Apply to everyone
- `below_threshold` - Apply only if score < threshold
- `low_performers` - Apply only to struggling students

**POST Request:**
```json
{
  "courseId": "course-id",
  "curveType": "flat_bonus",
  "curveValue": 5,
  "appliedTo": "all_students",
  "description": "Bonus for strong participation"
}
```

**Features:**
- ✅ Automatic grade history recording
- ✅ Preview before applying
- ✅ Revert capability
- ✅ Audit trail of all changes

---

### 5. **Late Submission Penalties** ⏰
Automatically deduct points for late submissions with configurable policies.

**Endpoints:**
- `POST /api/grades/late-penalties` - Create penalty policy
- `GET /api/grades/late-penalties?assignmentId=xxx&courseId=xxx` - Get policy
- `PUT /api/grades/late-penalties/calculate` - Apply penalties

**Penalty Types:**
1. **Percentage Deduction** - Deduct % per day/hour
2. **Points Deduction** - Deduct fixed points per day/hour
3. **No Submission Allowed** - Block submissions after deadline

**POST Request:**
```json
{
  "assignmentId": "assign-1",
  "courseId": "course-id",
  "penaltyType": "percentage_deduction",
  "penaltyValue": 5,
  "penaltyPeriod": "per_day",
  "gracePeriodMinutes": 15,
  "maxPenalty": 30
}
```

**Example:**
- Assignment due: June 15, 11:59 PM
- Submission: June 16, 2:00 PM (2+ hours late)
- Grace period: 15 minutes
- Penalty: 5% per day = 5% deducted
- Max penalty: 30%

---

### 6. **Bulk Grade Upload** 📁
Import grades from CSV file for efficient batch processing.

**Endpoint:** `POST /api/grades/bulk-upload`

**CSV Format:**
```csv
Student Email,Assignment ID,Score
student1@example.com,assign-1,85
student2@example.com,assign-1,92
student1@example.com,assign-2,78
```

**Response:**
```json
{
  "uploadId": 1,
  "status": "completed",
  "totalRecords": 3,
  "successCount": 3,
  "failedCount": 0,
  "errors": []
}
```

**Features:**
- ✅ Automatic validation
- ✅ Detailed error reporting
- ✅ Progress tracking
- ✅ Automatic grade history creation
- ✅ Rejection/retry handling

---

### 7. **Grade Trends & History** 📉
Track and visualize grade changes over time with progression analysis.

**Endpoints:**
- `GET /api/grades/trends?courseId=xxx&studentEmail=xxx&days=30` - Get history
- `POST /api/grades/trends/predict` - Predict final grade based on trends

**Trend Analysis:**
```json
{
  "trends": {
    "quiz": {
      "avgScore": 85,
      "minScore": 72,
      "maxScore": 95,
      "totalChanges": 5,
      "trend": 8,
      "trendDirection": "improving",
      "lastScore": 92,
      "firstScore": 84
    }
  }
}
```

**Trend Directions:**
- ↗️ **Improving** - Score increasing over time
- → **Stable** - Consistent performance
- ↘️ **Declining** - Score decreasing

---

### 8. **Predictive Analytics** 🔮
ML-powered predictions for student success and risk identification.

**Endpoint:** `GET /api/grades/analytics/predict?courseId=xxx&studentEmail=xxx`

**Response:**
```json
{
  "courseId": "course-id",
  "studentEmail": "student@example.com",
  "predictedFinalGrade": 78,
  "predictedGradeLetter": "A-",
  "riskLevel": "medium",
  "confidenceScore": 0.92,
  "currentScores": {
    "quizAvg": 80,
    "assignmentAvg": 85,
    "mcqAvg": 75
  },
  "strengths": ["Assignment"],
  "weakAreas": ["MCQ"],
  "recommendedInterventions": [
    "Focus on improving MCQ scores",
    "Join study groups",
    "Practice more problems"
  ],
  "completionPercentage": 85
}
```

**Risk Levels:**
- 🟢 **Low** (≥75) - On track
- 🟡 **Medium** (60-74) - Monitor closely
- 🟠 **High** (35-59) - Intervention needed
- 🔴 **Critical** (<35) - Immediate action required

**Bulk Prediction:**
```
POST /api/grades/analytics/predict?courseId=xxx
```
Calculate predictions for all students in course.

---

### 9. **Email Notifications** 📧
Automated notifications for grade changes to students and parents.

**Endpoints:**
- `POST /api/grades/notifications/send` - Send notification
- `GET /api/grades/notifications?studentEmail=xxx` - Get notifications
- `PUT /api/grades/notifications/mark-read?id=xxx` - Mark as read

**Notification Types:**
1. **Grade Posted** - New grade available
2. **Grade Changed** - Grade was adjusted
3. **Comment Added** - Instructor left feedback
4. **Assignment Due** - Upcoming deadline reminder
5. **Grade Alert** - Grade warning (low score)

**POST Request:**
```json
{
  "courseId": "course-id",
  "studentEmail": "student@example.com",
  "notificationType": "grade_posted",
  "assessmentType": "assignment",
  "assessmentId": "assign-1",
  "message": "Your assignment score: 92/100",
  "relatedGrade": 92,
  "notifyParents": true
}
```

**Features:**
- ✅ Send to students and parents
- ✅ Configurable recipients
- ✅ Read/unread tracking
- ✅ Email + in-app delivery
- ✅ Batch notifications

---

### 10. **Parent Portal** 👨‍👩‍👧
Secure grade sharing with parents and guardians.

**Endpoints:**
- `POST /api/grades/parent-portal/grant-access` - Grant access
- `GET /api/grades/parent-portal/verify?token=xxx` - Verify access
- `DELETE /api/grades/parent-portal/revoke?id=xxx` - Revoke access

**Grant Access Request:**
```json
{
  "parentEmail": "parent@example.com",
  "parentName": "John Parent",
  "relationshipToStudent": "father",
  "expiresInDays": 365
}
```

**Response:**
```json
{
  "accessToken": "secure-token-here",
  "accessUrl": "https://app.com/parent-portal/secure-token-here",
  "parentEmail": "parent@example.com",
  "grantedAt": "2025-06-15T10:30:00Z",
  "expiresAt": "2026-06-15T10:30:00Z"
}
```

**Parent Portal Features:**
- ✅ View child's grades by course
- ✅ Progress tracking
- ✅ Performance analytics
- ✅ Secure token-based access
- ✅ Expiration control
- ✅ Revokable at any time

**Parent Permissions:**
- `canViewGrades` - View grade details
- `canViewAssignments` - View assignment list
- `canViewProgress` - View course progress
- `canViewComments` - View instructor comments (optional)

---

## Database Schema Summary

### 8 New Tables Added:

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `gradeComments` | Store instructor feedback | courseId, studentEmail, comment, isPinned |
| `gradeHistory` | Track grade changes over time | courseId, studentEmail, oldScore, newScore, reason |
| `gradeCurves` | Store grade adjustment policies | courseId, curveType, curveValue, appliedTo |
| `lateSubmissionPenalties` | Configure late submission rules | assignmentId, penaltyType, penaltyValue |
| `parentPortalAccess` | Manage parent access tokens | parentEmail, accessToken, isActive |
| `bulkGradeUpload` | Track CSV imports | courseId, totalRecords, status |
| `gradeNotifications` | Notification history | recipientEmail, notificationType, wasRead |
| `predictiveAnalytics` | Cache ML predictions | courseId, studentEmail, predictedFinalGrade, riskLevel |

---

## API Usage Examples

### Example 1: Add Assignment Feedback
```bash
curl -X POST http://localhost:3000/api/grades/comments \
  -H "Content-Type: application/json" \
  -d '{
    "courseId": "course-123",
    "studentEmail": "student@example.com",
    "assessmentType": "assignment",
    "assessmentId": "assign-1",
    "comment": "Excellent work! Consider adding more detail to section 3.",
    "isPrivate": false
  }'
```

### Example 2: Apply Grade Curve
```bash
curl -X POST http://localhost:3000/api/grades/curves \
  -H "Content-Type: application/json" \
  -d '{
    "courseId": "course-123",
    "curveType": "flat_bonus",
    "curveValue": 5,
    "appliedTo": "all_students",
    "description": "Bonus for exceptional participation"
  }'
```

### Example 3: Export Grades
```bash
curl http://localhost:3000/api/grades/export-csv?type=student \
  -H "Authorization: Bearer token" \
  > grades.csv
```

### Example 4: Get Student Predictions
```bash
curl http://localhost:3000/api/grades/analytics/predict?courseId=course-123&studentEmail=student@example.com
```

### Example 5: Grant Parent Access
```bash
curl -X POST http://localhost:3000/api/grades/parent-portal/grant-access \
  -H "Content-Type: application/json" \
  -d '{
    "parentEmail": "parent@example.com",
    "parentName": "Jane Parent",
    "relationshipToStudent": "mother",
    "expiresInDays": 365
  }'
```

---

## Security Features

✅ **Clerk Authentication** - All endpoints require authentication  
✅ **Role-Based Access** - Instructors can only manage their courses  
✅ **Token-Based Parent Access** - Secure 32-byte tokens  
✅ **Access Control Lists** - Fine-grained permissions  
✅ **Audit Logging** - All changes tracked in gradeHistory  
✅ **Email Verification** - Parent access requires email confirmation  
✅ **Expiring Tokens** - Parent access can be time-limited  
✅ **Permission Boundaries** - Students can't modify grades  

---

## Performance Optimizations

📊 **Predictive Analytics Caching** - Results cached for 1 minute  
🚀 **Bulk Operations** - Process multiple records in single request  
📈 **Grade History Indexing** - Fast lookups by course/student/date  
💾 **JSON Field Optimization** - Efficient storage of score arrays  
🔄 **Batch Notification Sending** - Process multiple recipients efficiently  

---

## Future Enhancements (Phase 2)

1. **Advanced Rubric Scoring** - Detailed rubric-based assessments
2. **Grade Normalization** - Statistical grade distribution analysis
3. **Student Insights** - Peer comparison and class standing
4. **Gradual Release** - Staggered grade posting schedule
5. **Custom Grading Scales** - User-defined grade ranges
6. **Attendance Integration** - Link attendance to grades
7. **Historical Tracking** - Multi-semester grade progression
8. **Mobile App Sync** - Real-time notifications on mobile
9. **Third-party Integration** - Connect with external SIS
10. **Accessibility Compliance** - ADA-compliant interfaces

---

## Testing Checklist

- [ ] Add comments to assignments
- [ ] View comment history for a student
- [ ] Delete own comments
- [ ] Export student grades as CSV
- [ ] Export instructor grades as CSV
- [ ] Create grade curve
- [ ] Apply grade curve to class
- [ ] Create late penalty policy
- [ ] Calculate and apply late penalties
- [ ] Upload grades from CSV
- [ ] View bulk upload status
- [ ] Get grade trends for student
- [ ] Predict final grade for student
- [ ] Bulk predict for all students
- [ ] Send grade notification
- [ ] Grant parent portal access
- [ ] Access parent portal with token
- [ ] Revoke parent access
- [ ] Mark notification as read

---

## Status

✅ **Complete** - All 10 advanced features fully implemented with:
- 10 API endpoints
- 8 new database tables
- Comprehensive error handling
- Security controls
- Audit logging
- Performance optimization

**Ready for:** Testing, integration, deployment

