import { boolean, integer, json, pgTable, serial, text, timestamp, varchar, decimal, index } from "drizzle-orm/pg-core";

export const USER_TABLE=pgTable('users',{
    id:serial().primaryKey(),
    name:varchar().notNull(),
    email:varchar().notNull(),
    isMember:boolean().default(false),
    customerId:varchar(),
    credits:integer().default(5), // Available credits for course creation
    totalCreditsUsed:integer().default(0), // Lifetime credits used
    createdAt:timestamp().defaultNow(),
    updatedAt:timestamp().defaultNow()
}, (table) => ({
    emailIdx: index('user_email_idx').on(table.email),
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
    createdAt:timestamp().defaultNow()
}, (table) => ({
    courseIdIdx: index('study_material_course_id_idx').on(table.courseId),
    createdByIdx: index('study_material_created_by_idx').on(table.createdBy),
    statusIdx: index('study_material_status_idx').on(table.status),
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
    content:json(),
    type:varchar().notNull(),
    status:varchar().default('Generating')
}, (table) => ({
    courseIdTypeIdx: index('study_type_content_course_id_type_idx').on(table.courseId, table.type),
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
    paymentMethod:varchar(), // 'card', 'paypal', etc.
    stripePaymentId:varchar(), // Stripe payment intent ID
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
    name: varchar().notNull(),
    role: varchar().default('admin'), // 'admin', 'super_admin'
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