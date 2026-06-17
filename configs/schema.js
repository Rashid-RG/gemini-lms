import { boolean, integer, json, pgTable, serial, text, timestamp, varchar, decimal, index, uniqueIndex } from "drizzle-orm/pg-core";

export const USER_TABLE=pgTable('users',{
    id:serial().primaryKey(),
    name:varchar().notNull(),
    email:varchar().notNull(),
    studentIdentifier:varchar(),
    phoneNumber:varchar(),
    address:text(),
    city:varchar(),
    country:varchar(),
    postalCode:varchar(),
    dateOfBirth:timestamp(),
    emergencyContactName:varchar(),
    emergencyContactPhone:varchar(),
    guardianEmail:varchar(),
    guardianRelationship:varchar(),
    isMember:boolean().default(false),
    customerId:varchar(),
    credits:integer().default(5), // Available credits for course creation
    totalCreditsUsed:integer().default(0), // Lifetime credits used
    createdAt:timestamp().defaultNow(),
    updatedAt:timestamp().defaultNow()
}, (table) => ({
    emailIdx: index('user_email_idx').on(table.email),
    emailUniqueIdx: uniqueIndex('user_email_unique_idx').on(table.email),
    studentIdentifierUniqueIdx: uniqueIndex('user_student_identifier_unique_idx').on(table.studentIdentifier),
}))

// Credit Transaction Table - audit log for all credit changes
export const CREDIT_TRANSACTION_TABLE=pgTable('creditTransactions',{
    id:serial().primaryKey(),
    userEmail:varchar().notNull(),
    amount:integer().notNull(), // positive = add, negative = deduct
    type:varchar().notNull(), // 'course_creation', 'refund', 'purchase', 'bonus', 'admin_adjustment'
    reason:varchar(), // Human-readable reason
    courseId:varchar(), // Related course if applicable
    balanceBefore:integer().notNull(),
    balanceAfter:integer().notNull(),
    createdAt:timestamp().defaultNow(),
    createdBy:varchar() // 'system', 'admin:email', or 'user'
}, (table) => ({
    userEmailIdx: index('credit_tx_user_email_idx').on(table.userEmail),
    typeIdx: index('credit_tx_type_idx').on(table.type),
}))

export const STUDY_MATERIAL_TABLE=pgTable('studyMaterial',{
    id:serial().primaryKey(),
    courseId:varchar().notNull(),
    courseType:varchar().notNull(),
    topic:varchar().notNull(),
    description:text(), // Course description
    difficultyLevel:varchar().default('Easy'),
    courseLayout:json(),
    createdBy:varchar().notNull(),
    status:varchar().default('Generating'),
    includeVideos:boolean().default(false),
    videos:json(),
    hasAssignments:boolean().default(false),
    assignmentCount:integer().default(0),
    isPublic:boolean().default(false),
    category:varchar().default('General'),
    tags:json(),
    enrolledUsers:json(),
    averageRating:decimal('3,2').default('0'),
    reviewCount:integer().default(0),
    totalStudents:integer().default(0),
    // Advanced Features - Scheduling
    publishDate:timestamp(), // When course becomes available
    startDate:timestamp(), // Course start date
    endDate:timestamp(), // Course end date
    // Advanced Features - Pricing & Enrollment
    price:decimal({ precision: 10, scale: 2 }).default('0'), // Course price (0 = free)
    currency:varchar().default('usd'),
    enrollmentLimit:integer(), // Max students allowed (null = unlimited)
    prerequisites:json(), // Array of prerequisite course IDs
    // Advanced Features - Media
    courseImage:text(), // Course cover image URL
    // Advanced Features - Quiz Types
    quizTypes:json().default('["multiple-choice"]'), // Supported quiz types
    createdAt:timestamp().defaultNow(),
    updatedAt:timestamp().defaultNow()
}, (table) => ({
    courseIdIdx: index('study_material_course_id_idx').on(table.courseId),
    createdByIdx: index('study_material_created_by_idx').on(table.createdBy),
    statusIdx: index('study_material_status_idx').on(table.status),
    publishDateIdx: index('study_material_publish_date_idx').on(table.publishDate),
}))

export const CHAPTER_NOTES_TABLE=pgTable('chapterNotes',{
    id:serial().primaryKey(),
    courseId:varchar().notNull(),
    chapterId:integer().notNull(),
    notes:text()
}, (table) => ({
    courseIdIdx: index('chapter_notes_course_id_idx').on(table.courseId),
}))

export const STUDY_TYPE_CONTENT_TABLE=pgTable('studyTypeContent',{
    id:serial().primaryKey(),
    courseId:varchar().notNull(),
    chapterId:integer(), // Chapter number for better organization
    content:json(),
    type:varchar().notNull(), // 'flashcards', 'quiz', 'summary'
    quizType:varchar(), // For quizzes: 'multiple-choice', 'true-false', 'short-answer', 'matching', 'fill-blank'
    status:varchar().default('Generating'),
    difficulty:varchar().default('Medium'), // Quiz difficulty level
    createdAt:timestamp().defaultNow()
}, (table) => ({
    courseIdTypeIdx: index('study_type_content_course_id_type_idx').on(table.courseId, table.type),
    courseChapterIdx: index('study_type_content_course_chapter_idx').on(table.courseId, table.chapterId),
}))

// Course Media Files - for advanced rich media support
export const COURSE_MEDIA_TABLE=pgTable('courseMedia',{
    id:serial().primaryKey(),
    courseId:varchar().notNull(),
    chapterId:integer(), // Optional: specific chapter
    fileName:varchar().notNull(),
    fileType:varchar().notNull(), // 'video', 'pdf', 'image', 'document'
    fileUrl:text().notNull(), // Cloud storage URL (S3, CloudStorage, etc.)
    fileSize:integer(), // File size in bytes
    duration:integer(), // For videos: duration in seconds
    uploadedBy:varchar().notNull(), // Email of uploader
    isPublic:boolean().default(true),
    metadata:json(), // Custom metadata
    createdAt:timestamp().defaultNow()
}, (table) => ({
    courseIdIdx: index('course_media_course_id_idx').on(table.courseId),
    fileTypeIdx: index('course_media_file_type_idx').on(table.fileType),
}))

// Course Enrollments & Analytics
export const COURSE_ENROLLMENT_TABLE=pgTable('courseEnrollments',{
    id:serial().primaryKey(),
    courseId:varchar().notNull(),
    studentEmail:varchar().notNull(),
    enrolledAt:timestamp().defaultNow(),
    completionPercentage:integer().default(0),
    status:varchar().default('Active'), // 'Active', 'Completed', 'Dropped'
    lastAccessedAt:timestamp(),
    totalTimeSpent:integer().default(0), // in minutes
    performanceScore:decimal('3,2'), // Average quiz/assignment score
    certificateIssued:boolean().default(false),
    certificateIssuedAt:timestamp()
}, (table) => ({
    courseStudentIdx: index('course_enrollment_course_student_idx').on(table.courseId, table.studentEmail),
    courseStatusIdx: index('course_enrollment_course_status_idx').on(table.courseId, table.status),
}))

// Course Analytics (aggregated stats)
export const COURSE_ANALYTICS_TABLE=pgTable('courseAnalytics',{
    id:serial().primaryKey(),
    courseId:varchar().notNull().unique(),
    totalEnrollments:integer().default(0),
    totalCompleted:integer().default(0),
    totalDropped:integer().default(0),
    averageCompletionTime:integer(), // in minutes
    averageScore:decimal('3,2').default('0'),
    totalRevenue:decimal({ precision: 10, scale: 2 }).default('0'),
    lastUpdatedAt:timestamp().defaultNow()
}, (table) => ({
    courseIdIdx: index('course_analytics_course_id_idx').on(table.courseId),
}))

export const PAYMENT_RECORD_TABLE=pgTable('paymentRecord',{
    id:serial().primaryKey(),
    customerId:varchar(),
    sessionId:varchar(),
    userEmail:varchar().notNull(),
    amount:decimal({ precision: 10, scale: 2 }).notNull(), // Amount in LKR
    currency:varchar().default('lkr'),
    plan:varchar().notNull(), // 'basic', 'pro', 'enterprise', 'credits_10', 'credits_50', etc.
    planType:varchar().default('subscription'), // 'subscription', 'one_time', 'credits'
    creditsAdded:integer().default(0), // Number of credits added by this payment
    status:varchar().default('completed'), // 'pending', 'completed', 'failed', 'refunded'
    paymentMethod:varchar(), // 'card', 'paypal', 'payhere', etc.
    gatewayPaymentId:varchar(), // Payment gateway transaction ID (PayHere, etc.)
    invoiceUrl:varchar(), // Link to invoice
    metadata:json(), // Additional data
    createdAt:timestamp().defaultNow(),
    updatedAt:timestamp().defaultNow()
}, (table) => ({
    userEmailIdx: index('payment_user_email_idx').on(table.userEmail),
    statusIdx: index('payment_status_idx').on(table.status),
    createdAtIdx: index('payment_created_at_idx').on(table.createdAt),
}))

// Progress Tracking Table - tracks student progress per course
export const STUDENT_PROGRESS_TABLE=pgTable('studentProgress',{
    id:serial().primaryKey(),
    courseId:varchar().notNull(),
    studentEmail:varchar().notNull(),
    completedChapters:json().default(JSON.stringify([])), // array of chapter IDs
    totalChapters:integer().default(0),
    progressPercentage:integer().default(0),
    quizScores:json(), // {chapterId: score}
    assignmentScores:json(), // {assignmentId: score}
    mcqScores:json(), // {chapterId: score}
    finalScore:integer().default(0),
    streakCount:integer().default(0),
    longestStreak:integer().default(0),
    lastStreakAt:timestamp(),
    badges:json().default(JSON.stringify([])),
    status:varchar().default('In Progress'), // In Progress, Completed, Dropped
    startedAt:timestamp().defaultNow(),
    completedAt:timestamp(),
    lastActivityAt:timestamp().defaultNow(),
    // Notes and Flashcards tracking for badges
    completedNotes:integer().default(0),
    totalNotes:integer().default(0),
    completedFlashcards:integer().default(0),
    totalFlashcards:integer().default(0)
}, (table) => ({
    courseEmailIdx: index('student_progress_course_email_idx').on(table.courseId, table.studentEmail),
}))

// Certificates Table - course completion certificates
export const CERTIFICATES_TABLE=pgTable('certificates',{
    id:serial().primaryKey(),
    certificateId:varchar().notNull().unique(),
    courseId:varchar().notNull(),
    studentEmail:varchar().notNull(),
    studentName:varchar().notNull(),
    courseName:varchar().notNull(),
    completedAt:timestamp().defaultNow(),
    finalScore:integer(),
    issueDate:timestamp().defaultNow()
})

// Assignments Table - course assignments
export const COURSE_ASSIGNMENTS_TABLE=pgTable('courseAssignments',{
    id:serial().primaryKey(),
    courseId:varchar().notNull(),
    assignmentId:varchar().notNull(),
    title:varchar().notNull(),
    description:text().notNull(),
    dueDate:timestamp(),
    totalPoints:integer().default(100),
    rubric:json(), // grading rubric from AI
    createdAt:timestamp().defaultNow()
})

// Assignment Submissions Table - student submissions
export const ASSIGNMENT_SUBMISSIONS_TABLE=pgTable('assignmentSubmissions',{
    id:serial().primaryKey(),
    assignmentId:varchar().notNull(),
    courseId:varchar().notNull(),
    studentEmail:varchar().notNull(),
    submission:text().notNull(), // main text content
    submissionType:varchar().default('text'), // 'text', 'code', 'document', 'url'
    language:varchar(), // for code submissions: 'javascript', 'python', 'java', etc.
    fileUrl:varchar(), // for document submissions: URL to file
    metadata:json(), // additional data (line count, code snippets, etc)
    submittedAt:timestamp().defaultNow(),
    status:varchar().default('Submitted'), // Submitted, Graded, Feedback, ReviewRequested, ManuallyGraded
    score:integer(),
    feedback:text(),
    strengths:json(), // array of strengths identified by AI
    improvements:json(), // array of improvements suggested by AI
    gradedBy:varchar().default('AI'), // 'AI' or instructor email
    gradedAt:timestamp(),
    // Manual Review Fields
    reviewRequested:boolean().default(false),
    reviewRequestedAt:timestamp(),
    reviewReason:text(), // reason for requesting manual review
    reviewedBy:varchar(), // instructor who reviewed
    reviewedAt:timestamp(),
    originalAiScore:integer(), // preserve original AI score if overridden
    instructorNotes:text() // notes from instructor after manual review
})

// Adaptive Difficulty Tracking Table - tracks performance per topic for difficulty adjustment
export const ADAPTIVE_PERFORMANCE_TABLE=pgTable('adaptivePerformance',{
    id:serial().primaryKey(),
    courseId:varchar().notNull(),
    studentEmail:varchar().notNull(),
    topicId:varchar().notNull(), // chapterId or topic identifier
    topicName:varchar().notNull(),
    totalAttempts:integer().default(0),
    correctAnswers:integer().default(0),
    averageScore:integer().default(0), // percentage
    currentDifficulty:varchar().default('Easy'), // Easy, Medium, Hard
    recommendedDifficulty:varchar().default('Easy'),
    lastAttemptAt:timestamp(),
    masteryLevel:varchar().default('novice'), // novice, beginner, intermediate, proficient, expert
    isWeakTopic:boolean().default(false), // true if score < 60% and attempted > 2 times
    reviewCount:integer().default(0), // how many times reviewed
    createdAt:timestamp().defaultNow(),
    updatedAt:timestamp().defaultNow()
})

// Support Tickets - captures help/support requests from users
export const SUPPORT_TICKETS_TABLE=pgTable('supportTickets',{
    id:serial().primaryKey(),
    userEmail:varchar().notNull(),
    subject:varchar().notNull(),
    message:text().notNull(),
    category:varchar().default('General'),
    status:varchar().default('Open'),
    source:varchar().default('app'),
    aiIssue:boolean().default(false),
    metadata:json(),
    adminMessage:text(),
    userReply:text(),
    createdAt:timestamp().defaultNow(),
    updatedAt:timestamp().defaultNow()
}, (table) => ({
    userEmailIdx: index('support_tickets_user_email_idx').on(table.userEmail),
    statusIdx: index('support_tickets_status_idx').on(table.status),
}))

// Leaderboard standings
export const LEADERBOARD_TABLE=pgTable('leaderboard',{
    id:serial().primaryKey(),
    studentEmail:varchar().notNull(),
    studentName:varchar().notNull(),
    totalCoursesCompleted:integer().default(0),
    totalPoints:integer().default(0),
    averageRating:decimal('3,2').default('0'),
    badge:varchar(),
    isAnonymous:boolean().default(false),
    rank:integer().default(0),
    createdAt:timestamp().defaultNow(),
    updatedAt:timestamp().defaultNow()
})

// Chatbot Conversations
export const CHAT_CONVERSATIONS_TABLE = pgTable('chatConversations', {
    id: serial().primaryKey(),
    userEmail: varchar().notNull(),
    title: varchar(),
    createdAt: timestamp().defaultNow(),
    updatedAt: timestamp().defaultNow(),
}, (table) => ({
    userEmailIdx: index('chat_conversations_user_email_idx').on(table.userEmail),
}));

export const CHAT_MESSAGES_TABLE = pgTable('chatMessages', {
    id: serial().primaryKey(),
    conversationId: integer().notNull(),
    sender: varchar().notNull(), // 'user' | 'bot'
    content: text().notNull(),
    createdAt: timestamp().defaultNow(),
}, (table) => ({
    conversationIdIdx: index('chat_messages_conversation_id_idx').on(table.conversationId),
}));

// Global User Streak - tracks learning streak across all courses
export const USER_STREAK_TABLE = pgTable('userStreak', {
    id: serial().primaryKey(),
    studentEmail: varchar().notNull().unique(),
    streakCount: integer().default(0),
    longestStreak: integer().default(0),
    lastStreakAt: timestamp(),
    lastActivityAt: timestamp().defaultNow(),
    badges: json().default(JSON.stringify([])),
    totalActivities: integer().default(0), // total chapters/quizzes/assignments completed
    createdAt: timestamp().defaultNow(),
    updatedAt: timestamp().defaultNow()
}, (table) => ({
    studentEmailIdx: index('user_streak_student_email_idx').on(table.studentEmail),
}));

// Course Reviews Table - user reviews for courses
export const COURSE_REVIEWS_TABLE = pgTable('courseReviews', {
    id: serial().primaryKey(),
    courseId: varchar().notNull(),
    studentEmail: varchar().notNull(),
    studentName: varchar(),
    rating: integer().notNull(), // 1-5 stars
    review: text(),
    createdAt: timestamp().defaultNow(),
    updatedAt: timestamp().defaultNow()
}, (table) => ({
    courseIdIdx: index('course_reviews_course_id_idx').on(table.courseId),
    studentEmailIdx: index('course_reviews_student_email_idx').on(table.studentEmail),
}));

// Social Shares Table - tracks when users share courses
export const SOCIAL_SHARES_TABLE = pgTable('socialShares', {
    id: serial().primaryKey(),
    courseId: varchar().notNull(),
    studentEmail: varchar().notNull(),
    platform: varchar().notNull(), // 'twitter', 'linkedin', 'facebook', 'copy_link'
    sharedAt: timestamp().defaultNow()
}, (table) => ({
    courseIdIdx: index('social_shares_course_id_idx').on(table.courseId),
}));

// Admin Users Table - separate admin authentication
export const ADMIN_TABLE = pgTable('admins', {
    id: serial().primaryKey(),
    email: varchar().notNull().unique(),
    passwordHash: varchar().notNull(),
    temporaryPassword: varchar(), // Plain password shown to user after approval
    passwordSetAt: timestamp(), // When password was last set
    name: varchar().notNull(),
    role: varchar().default('admin'), // 'admin', 'super_admin', 'tutor'
    profilePic: text(), // base64 data URL for profile picture
    isActive: boolean().default(true),
    lastLoginAt: timestamp(),
    createdAt: timestamp().defaultNow(),
    updatedAt: timestamp().defaultNow()
}, (table) => ({
    emailIdx: index('admin_email_idx').on(table.email),
}));

// Admin Sessions Table - for session management
export const ADMIN_SESSION_TABLE = pgTable('adminSessions', {
    id: serial().primaryKey(),
    adminId: integer().notNull(),
    sessionToken: varchar().notNull().unique(),
    expiresAt: timestamp().notNull(),
    createdAt: timestamp().defaultNow(),
    ipAddress: varchar(),
    userAgent: varchar()
}, (table) => ({
    tokenIdx: index('admin_session_token_idx').on(table.sessionToken),
    adminIdIdx: index('admin_session_admin_id_idx').on(table.adminId),
}));

// Password Reset Tokens Table
export const PASSWORD_RESET_TABLE = pgTable('passwordResetTokens', {
    id: serial().primaryKey(),
    adminId: integer().notNull(),
    token: varchar().notNull().unique(),
    expiresAt: timestamp().notNull(),
    used: boolean().default(false),
    createdAt: timestamp().defaultNow(),
}, (table) => ({
    tokenIdx: index('password_reset_token_idx').on(table.token),
    adminIdIdx: index('password_reset_admin_id_idx').on(table.adminId),
}));

// Admin Activity Log Table - tracks all admin actions for audit
export const ADMIN_ACTIVITY_LOG_TABLE = pgTable('adminActivityLog', {
    id: serial().primaryKey(),
    adminEmail: varchar().notNull(),
    action: varchar().notNull(), // 'grade_submission', 'update_grade', 'dismiss_review', 'adjust_credits', etc.
    targetType: varchar().notNull(), // 'submission', 'user', 'course', 'review'
    targetId: varchar().notNull(), // ID of the affected record
    details: json(), // Additional context (old value, new value, reason, etc.)
    studentEmail: varchar(), // Affected student if applicable
    courseId: varchar(), // Related course if applicable
    ipAddress: varchar(),
    createdAt: timestamp().defaultNow()
}, (table) => ({
    adminEmailIdx: index('admin_activity_log_admin_email_idx').on(table.adminEmail),
    actionIdx: index('admin_activity_log_action_idx').on(table.action),
    createdAtIdx: index('admin_activity_log_created_at_idx').on(table.createdAt),
}));

// Content Review Table - manual review of AI-generated content
export const CONTENT_REVIEW_TABLE = pgTable('contentReview', {
    id: serial().primaryKey(),
    courseId: varchar().notNull(),
    contentType: varchar().notNull(), // 'course_outline', 'notes', 'flashcards', 'quiz', 'mcq', 'assignment'
    contentId: varchar(), // chapterId, studyTypeContent id, etc.
    status: varchar().default('pending'), // 'pending', 'approved', 'rejected', 'edited'
    originalContent: json(), // snapshot of AI-generated content
    editedContent: json(), // admin-edited version (null if approved as-is)
    reviewedBy: varchar(), // admin email
    reviewNotes: text(), // admin comments about changes
    priority: varchar().default('normal'), // 'low', 'normal', 'high', 'urgent'
    flaggedBy: varchar(), // 'system' or student email
    flagReason: text(), // why it was flagged
    autoFlagged: boolean().default(false), // true if system detected potential issue
    createdAt: timestamp().defaultNow(),
    reviewedAt: timestamp(),
    updatedAt: timestamp().defaultNow()
}, (table) => ({
    courseIdIdx: index('content_review_course_id_idx').on(table.courseId),
    statusIdx: index('content_review_status_idx').on(table.status),
    contentTypeIdx: index('content_review_content_type_idx').on(table.contentType),
    priorityIdx: index('content_review_priority_idx').on(table.priority),
}));

// Student Content Feedback Table - students report AI mistakes
export const CONTENT_FEEDBACK_TABLE = pgTable('contentFeedback', {
    id: serial().primaryKey(),
    courseId: varchar().notNull(),
    contentType: varchar().notNull(), // 'notes', 'flashcards', 'quiz', 'mcq'
    contentId: varchar(), // chapterId or studyTypeContent id
    studentEmail: varchar().notNull(),
    issueType: varchar().notNull(), // 'inaccurate', 'unclear', 'incomplete', 'wrong_answer', 'inappropriate', 'other'
    description: text().notNull(), // student's explanation of the issue
    specificContent: text(), // the specific piece of content with the issue
    status: varchar().default('open'), // 'open', 'acknowledged', 'fixed', 'dismissed'
    adminResponse: text(), // admin's response to the feedback
    resolvedBy: varchar(), // admin email
    resolvedAt: timestamp(),
    createdAt: timestamp().defaultNow()
}, (table) => ({
    courseIdIdx: index('content_feedback_course_id_idx').on(table.courseId),
    statusIdx: index('content_feedback_status_idx').on(table.status),
    studentEmailIdx: index('content_feedback_student_email_idx').on(table.studentEmail),
}));

// Tutor Course Assignments Table - maps tutors/reviewers to courses they can review
export const TUTOR_ASSIGNMENT_TABLE = pgTable('tutorAssignments', {
    id: serial().primaryKey(),
    adminId: integer().notNull(), // references ADMIN_TABLE.id (tutor)
    courseId: varchar().notNull(), // references STUDY_MATERIAL_TABLE.courseId
    assignedBy: varchar().notNull(), // email of admin who assigned
    canReview: boolean().default(true),
    canEdit: boolean().default(true),
    canApprove: boolean().default(false), // only if super_admin grants
    createdAt: timestamp().defaultNow(),
}, (table) => ({
    adminIdIdx: index('tutor_assignment_admin_id_idx').on(table.adminId),
    courseIdIdx: index('tutor_assignment_course_id_idx').on(table.courseId),
    uniqueAssignment: index('tutor_assignment_unique_idx').on(table.adminId, table.courseId),
}));

// Announcements Table - platform-wide announcements from admins
export const ANNOUNCEMENTS_TABLE = pgTable('announcements', {
    id: serial().primaryKey(),
    title: varchar().notNull(),
    content: text().notNull(),
    type: varchar().default('info'), // 'info', 'warning', 'success', 'update', 'maintenance'
    priority: varchar().default('normal'), // 'low', 'normal', 'high', 'urgent'
    targetAudience: varchar().default('all'), // 'all', 'students', 'creators'
    isActive: boolean().default(true),
    isPinned: boolean().default(false),
    expiresAt: timestamp(), // null = never expires
    viewCount: integer().default(0),
    dismissedBy: json().default(JSON.stringify([])), // array of user emails who dismissed
    createdBy: varchar().notNull(),
    createdAt: timestamp().defaultNow(),
    updatedAt: timestamp().defaultNow()
}, (table) => ({
    isActiveIdx: index('announcements_is_active_idx').on(table.isActive),
    priorityIdx: index('announcements_priority_idx').on(table.priority),
    createdAtIdx: index('announcements_created_at_idx').on(table.createdAt),
}));

// Tutor Requests Table - users applying to become tutors
export const TUTOR_REQUESTS_TABLE = pgTable('tutorRequests', {
    id: serial().primaryKey(),
    userEmail: varchar().notNull(),
    userName: varchar().notNull(),
    experienceLevel: varchar().notNull(), // 'beginner', 'intermediate', 'advanced', 'expert'
    subjectExpertise: text().notNull(), // areas they can teach
    motivation: text().notNull(), // why they want to be a tutor
    certifications: text(), // qualifications/certs
    status: varchar().default('pending'), // 'pending', 'approved', 'rejected'
    reviewedBy: varchar(), // admin email who reviewed
    reviewedAt: timestamp(),
    rejectionReason: text(), // if rejected, why
    requestedAt: timestamp().defaultNow(),
    updatedAt: timestamp().defaultNow()
}, (table) => ({
    userEmailIdx: index('tutor_requests_user_email_idx').on(table.userEmail),
    statusIdx: index('tutor_requests_status_idx').on(table.status),
    requestedAtIdx: index('tutor_requests_requested_at_idx').on(table.requestedAt),
}));

// ============================================
// ADVANCED GRADEBOOK FEATURES - NEW TABLES
// ============================================

// Grade Comments Table - instructors can add feedback/comments to grades
export const GRADE_COMMENTS_TABLE = pgTable('gradeComments', {
    id: serial().primaryKey(),
    courseId: varchar().notNull(),
    studentEmail: varchar().notNull(),
    assessmentType: varchar().notNull(), // 'quiz', 'assignment', 'mcq'
    assessmentId: varchar().notNull(), // quiz/assignment/mcq ID
    instructorEmail: varchar().notNull(),
    comment: text().notNull(),
    isPrivate: boolean().default(false), // true = only visible to instructor
    isPinned: boolean().default(false), // pinned comments show first
    createdAt: timestamp().defaultNow(),
    updatedAt: timestamp().defaultNow()
}, (table) => ({
    courseStudentIdx: index('grade_comments_course_student_idx').on(table.courseId, table.studentEmail),
    assessmentIdx: index('grade_comments_assessment_idx').on(table.assessmentType, table.assessmentId),
    instructorIdx: index('grade_comments_instructor_idx').on(table.instructorEmail),
}));

// Grade History Table - tracks grade changes over time
export const GRADE_HISTORY_TABLE = pgTable('gradeHistory', {
    id: serial().primaryKey(),
    courseId: varchar().notNull(),
    studentEmail: varchar().notNull(),
    assessmentType: varchar().notNull(), // 'quiz', 'assignment', 'mcq', 'overall'
    assessmentId: varchar(), // null for overall grades
    oldScore: integer(),
    newScore: integer().notNull(),
    oldGrade: varchar(),
    newGrade: varchar(),
    changedBy: varchar().notNull(), // 'system', 'AI', or instructor email
    reason: varchar(), // 'initial', 'curve_applied', 'late_penalty', 'manual_override', 'regrade'
    details: json(), // additional context
    createdAt: timestamp().defaultNow()
}, (table) => ({
    courseStudentIdx: index('grade_history_course_student_idx').on(table.courseId, table.studentEmail),
    assessmentIdx: index('grade_history_assessment_idx').on(table.assessmentType, table.assessmentId),
    changedByIdx: index('grade_history_changed_by_idx').on(table.changedBy),
    createdAtIdx: index('grade_history_created_at_idx').on(table.createdAt),
}));

// Grade Curves Table - store grade curve adjustments per course
export const GRADE_CURVES_TABLE = pgTable('gradeCurves', {
    id: serial().primaryKey(),
    courseId: varchar().notNull().unique(),
    curveType: varchar().notNull(), // 'flat_bonus', 'percentage_increase', 'scale_compression', 'replacement'
    curveValue: integer().notNull(), // bonus points or percentage
    appliedTo: varchar().notNull(), // 'all_students', 'below_threshold', 'low_performers'
    threshold: integer(), // score threshold if applicable
    isActive: boolean().default(false),
    appliedBy: varchar().notNull(), // instructor email
    description: text(),
    appliedAt: timestamp(),
    createdAt: timestamp().defaultNow(),
    updatedAt: timestamp().defaultNow()
}, (table) => ({
    courseIdIdx: index('grade_curves_course_id_idx').on(table.courseId),
}));

// Late Submission Penalties Table - configure late penalties per course/assignment
export const LATE_SUBMISSION_PENALTIES_TABLE = pgTable('lateSubmissionPenalties', {
    id: serial().primaryKey(),
    assignmentId: varchar().notNull(),
    courseId: varchar().notNull(),
    penaltyType: varchar().notNull(), // 'percentage_deduction', 'points_deduction', 'no_submission_allowed'
    penaltyValue: integer().notNull(), // percentage or points to deduct
    penaltyPeriod: varchar().notNull(), // 'per_day', 'per_hour', 'flat'
    maxPenalty: integer(), // max deduction allowed (null = no limit)
    gracePeriodMinutes: integer().default(0), // grace period before penalty applies
    isEnabled: boolean().default(true),
    createdBy: varchar().notNull(),
    createdAt: timestamp().defaultNow(),
    updatedAt: timestamp().defaultNow()
}, (table) => ({
    assignmentCourseIdx: index('late_penalty_assignment_course_idx').on(table.assignmentId, table.courseId),
}));

// Parent Portal Access Table - allow parents to view student grades
export const PARENT_PORTAL_ACCESS_TABLE = pgTable('parentPortalAccess', {
    id: serial().primaryKey(),
    parentEmail: varchar().notNull(),
    parentName: varchar().notNull(),
    studentEmail: varchar().notNull(),
    relationshipToStudent: varchar(), // 'mother', 'father', 'guardian', 'other'
    accessToken: varchar().notNull().unique(), // secure token for access
    isActive: boolean().default(true),
    grantedBy: varchar().notNull(), // student email who granted access
    canViewGrades: boolean().default(true),
    canViewAssignments: boolean().default(true),
    canViewProgress: boolean().default(true),
    canViewComments: boolean().default(false),
    lastAccessedAt: timestamp(),
    grantedAt: timestamp().defaultNow(),
    expiresAt: timestamp(), // when access expires (null = never)
    createdAt: timestamp().defaultNow()
}, (table) => ({
    parentEmailIdx: index('parent_portal_parent_email_idx').on(table.parentEmail),
    studentEmailIdx: index('parent_portal_student_email_idx').on(table.studentEmail),
    accessTokenIdx: index('parent_portal_access_token_idx').on(table.accessToken),
    isActiveIdx: index('parent_portal_is_active_idx').on(table.isActive),
}));

// Bulk Grade Upload Table - track CSV imports and batch updates
export const BULK_GRADE_UPLOAD_TABLE = pgTable('bulkGradeUpload', {
    id: serial().primaryKey(),
    courseId: varchar().notNull(),
    uploadedBy: varchar().notNull(), // instructor email
    fileName: varchar().notNull(),
    fileUrl: text(), // link to uploaded file
    totalRecords: integer().notNull(),
    successfulRecords: integer().default(0),
    failedRecords: integer().default(0),
    status: varchar().default('processing'), // 'processing', 'completed', 'failed', 'partial'
    errorDetails: json(), // array of errors for failed records
    processingLog: json(), // detailed log of what happened
    createdAt: timestamp().defaultNow(),
    completedAt: timestamp(),
    updatedAt: timestamp().defaultNow()
}, (table) => ({
    courseIdIdx: index('bulk_upload_course_id_idx').on(table.courseId),
    uploadedByIdx: index('bulk_upload_uploaded_by_idx').on(table.uploadedBy),
    statusIdx: index('bulk_upload_status_idx').on(table.status),
}));

// Grade Notifications Table - track notification history for grade changes
export const GRADE_NOTIFICATIONS_TABLE = pgTable('gradeNotifications', {
    id: serial().primaryKey(),
    courseId: varchar().notNull(),
    studentEmail: varchar().notNull(),
    notificationType: varchar().notNull(), // 'grade_posted', 'grade_changed', 'comment_added', 'assignment_due_soon', 'grade_alert'
    assessmentType: varchar(), // 'quiz', 'assignment', 'mcq'
    assessmentId: varchar(),
    message: text().notNull(),
    relatedGrade: integer(),
    relatedGradeLetter: varchar(),
    recipientEmail: varchar().notNull(), // student or parent email
    recipientType: varchar().notNull(), // 'student', 'parent'
    sentVia: varchar().notNull(), // 'email', 'in_app', 'both'
    wasRead: boolean().default(false),
    readAt: timestamp(),
    createdAt: timestamp().defaultNow()
}, (table) => ({
    courseStudentIdx: index('grade_notif_course_student_idx').on(table.courseId, table.studentEmail),
    recipientIdx: index('grade_notif_recipient_idx').on(table.recipientEmail),
    notificationTypeIdx: index('grade_notif_type_idx').on(table.notificationType),
    createdAtIdx: index('grade_notif_created_at_idx').on(table.createdAt),
}));

// Predictive Analytics Cache Table - store ML predictions for students
export const PREDICTIVE_ANALYTICS_TABLE = pgTable('predictiveAnalytics', {
    id: serial().primaryKey(),
    courseId: varchar().notNull(),
    studentEmail: varchar().notNull(),
    predictedFinalGrade: decimal('5,2'),
    predictedGradeLetter: varchar(),
    riskLevel: varchar(), // 'low', 'medium', 'high', 'critical'
    confidenceScore: decimal('3,2'), // 0-1 confidence in prediction
    strengths: json(), // array of strong areas
    weakAreas: json(), // array of weak areas
    recommendedInterventions: json(), // suggested help/actions
    lastUpdatedAt: timestamp().defaultNow(),
    updatedAt: timestamp().defaultNow()
}, (table) => ({
    courseStudentIdx: index('predictive_analytics_course_student_idx').on(table.courseId, table.studentEmail),
    riskLevelIdx: index('predictive_analytics_risk_level_idx').on(table.riskLevel),
}));