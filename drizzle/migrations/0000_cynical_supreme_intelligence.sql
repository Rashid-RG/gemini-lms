CREATE TABLE IF NOT EXISTS "adaptivePerformance" (
	"id" serial PRIMARY KEY NOT NULL,
	"courseId" varchar NOT NULL,
	"studentEmail" varchar NOT NULL,
	"topicId" varchar NOT NULL,
	"topicName" varchar NOT NULL,
	"totalAttempts" integer DEFAULT 0,
	"correctAnswers" integer DEFAULT 0,
	"averageScore" integer DEFAULT 0,
	"currentDifficulty" varchar DEFAULT 'Easy',
	"recommendedDifficulty" varchar DEFAULT 'Easy',
	"lastAttemptAt" timestamp,
	"masteryLevel" varchar DEFAULT 'novice',
	"isWeakTopic" boolean DEFAULT false,
	"reviewCount" integer DEFAULT 0,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "adminActivityLog" (
	"id" serial PRIMARY KEY NOT NULL,
	"adminEmail" varchar NOT NULL,
	"action" varchar NOT NULL,
	"targetType" varchar NOT NULL,
	"targetId" varchar NOT NULL,
	"details" json,
	"studentEmail" varchar,
	"courseId" varchar,
	"ipAddress" varchar,
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "adminSessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"adminId" integer NOT NULL,
	"sessionToken" varchar NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now(),
	"ipAddress" varchar,
	"userAgent" varchar,
	CONSTRAINT "adminSessions_sessionToken_unique" UNIQUE("sessionToken")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "admins" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar NOT NULL,
	"passwordHash" varchar NOT NULL,
	"temporaryPassword" varchar,
	"passwordSetAt" timestamp,
	"name" varchar NOT NULL,
	"role" varchar DEFAULT 'admin',
	"profilePic" text,
	"isActive" boolean DEFAULT true,
	"lastLoginAt" timestamp,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now(),
	CONSTRAINT "admins_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "announcements" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar NOT NULL,
	"content" text NOT NULL,
	"type" varchar DEFAULT 'info',
	"priority" varchar DEFAULT 'normal',
	"targetAudience" varchar DEFAULT 'all',
	"isActive" boolean DEFAULT true,
	"isPinned" boolean DEFAULT false,
	"expiresAt" timestamp,
	"viewCount" integer DEFAULT 0,
	"dismissedBy" json DEFAULT '[]',
	"createdBy" varchar NOT NULL,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "assignmentSubmissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"assignmentId" varchar NOT NULL,
	"courseId" varchar NOT NULL,
	"studentEmail" varchar NOT NULL,
	"submission" text NOT NULL,
	"submissionType" varchar DEFAULT 'text',
	"language" varchar,
	"fileUrl" varchar,
	"metadata" json,
	"submittedAt" timestamp DEFAULT now(),
	"status" varchar DEFAULT 'Submitted',
	"score" integer,
	"feedback" text,
	"strengths" json,
	"improvements" json,
	"gradedBy" varchar DEFAULT 'AI',
	"gradedAt" timestamp,
	"reviewRequested" boolean DEFAULT false,
	"reviewRequestedAt" timestamp,
	"reviewReason" text,
	"reviewedBy" varchar,
	"reviewedAt" timestamp,
	"originalAiScore" integer,
	"instructorNotes" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "certificates" (
	"id" serial PRIMARY KEY NOT NULL,
	"certificateId" varchar NOT NULL,
	"courseId" varchar NOT NULL,
	"studentEmail" varchar NOT NULL,
	"studentName" varchar NOT NULL,
	"courseName" varchar NOT NULL,
	"completedAt" timestamp DEFAULT now(),
	"finalScore" integer,
	"issueDate" timestamp DEFAULT now(),
	CONSTRAINT "certificates_certificateId_unique" UNIQUE("certificateId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chapterNotes" (
	"id" serial PRIMARY KEY NOT NULL,
	"courseId" varchar NOT NULL,
	"chapterId" integer NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chatConversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"userEmail" varchar NOT NULL,
	"title" varchar,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chatMessages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversationId" integer NOT NULL,
	"sender" varchar NOT NULL,
	"content" text NOT NULL,
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contentFeedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"courseId" varchar NOT NULL,
	"contentType" varchar NOT NULL,
	"contentId" varchar,
	"studentEmail" varchar NOT NULL,
	"issueType" varchar NOT NULL,
	"description" text NOT NULL,
	"specificContent" text,
	"status" varchar DEFAULT 'open',
	"adminResponse" text,
	"resolvedBy" varchar,
	"resolvedAt" timestamp,
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contentReview" (
	"id" serial PRIMARY KEY NOT NULL,
	"courseId" varchar NOT NULL,
	"contentType" varchar NOT NULL,
	"contentId" varchar,
	"status" varchar DEFAULT 'pending',
	"originalContent" json,
	"editedContent" json,
	"reviewedBy" varchar,
	"reviewNotes" text,
	"priority" varchar DEFAULT 'normal',
	"flaggedBy" varchar,
	"flagReason" text,
	"autoFlagged" boolean DEFAULT false,
	"createdAt" timestamp DEFAULT now(),
	"reviewedAt" timestamp,
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "courseAnalytics" (
	"id" serial PRIMARY KEY NOT NULL,
	"courseId" varchar NOT NULL,
	"totalEnrollments" integer DEFAULT 0,
	"totalCompleted" integer DEFAULT 0,
	"totalDropped" integer DEFAULT 0,
	"averageCompletionTime" integer,
	"3,2" numeric DEFAULT '0',
	"totalRevenue" numeric(10, 2) DEFAULT '0',
	"lastUpdatedAt" timestamp DEFAULT now(),
	CONSTRAINT "courseAnalytics_courseId_unique" UNIQUE("courseId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "courseAssignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"courseId" varchar NOT NULL,
	"assignmentId" varchar NOT NULL,
	"title" varchar NOT NULL,
	"description" text NOT NULL,
	"dueDate" timestamp,
	"totalPoints" integer DEFAULT 100,
	"rubric" json,
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "courseEnrollments" (
	"id" serial PRIMARY KEY NOT NULL,
	"courseId" varchar NOT NULL,
	"studentEmail" varchar NOT NULL,
	"enrolledAt" timestamp DEFAULT now(),
	"completionPercentage" integer DEFAULT 0,
	"status" varchar DEFAULT 'Active',
	"lastAccessedAt" timestamp,
	"totalTimeSpent" integer DEFAULT 0,
	"3,2" numeric,
	"certificateIssued" boolean DEFAULT false,
	"certificateIssuedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "courseMedia" (
	"id" serial PRIMARY KEY NOT NULL,
	"courseId" varchar NOT NULL,
	"chapterId" integer,
	"fileName" varchar NOT NULL,
	"fileType" varchar NOT NULL,
	"fileUrl" text NOT NULL,
	"fileSize" integer,
	"duration" integer,
	"uploadedBy" varchar NOT NULL,
	"isPublic" boolean DEFAULT true,
	"metadata" json,
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "courseReviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"courseId" varchar NOT NULL,
	"studentEmail" varchar NOT NULL,
	"studentName" varchar,
	"rating" integer NOT NULL,
	"review" text,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "creditTransactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"userEmail" varchar NOT NULL,
	"amount" integer NOT NULL,
	"type" varchar NOT NULL,
	"reason" varchar,
	"courseId" varchar,
	"balanceBefore" integer NOT NULL,
	"balanceAfter" integer NOT NULL,
	"createdAt" timestamp DEFAULT now(),
	"createdBy" varchar
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "leaderboard" (
	"id" serial PRIMARY KEY NOT NULL,
	"studentEmail" varchar NOT NULL,
	"studentName" varchar NOT NULL,
	"totalCoursesCompleted" integer DEFAULT 0,
	"totalPoints" integer DEFAULT 0,
	"3,2" numeric DEFAULT '0',
	"badge" varchar,
	"isAnonymous" boolean DEFAULT false,
	"rank" integer DEFAULT 0,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "passwordResetTokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"adminId" integer NOT NULL,
	"token" varchar NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"used" boolean DEFAULT false,
	"createdAt" timestamp DEFAULT now(),
	CONSTRAINT "passwordResetTokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "paymentRecord" (
	"id" serial PRIMARY KEY NOT NULL,
	"customerId" varchar,
	"sessionId" varchar,
	"userEmail" varchar NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar DEFAULT 'lkr',
	"plan" varchar NOT NULL,
	"planType" varchar DEFAULT 'subscription',
	"creditsAdded" integer DEFAULT 0,
	"status" varchar DEFAULT 'completed',
	"paymentMethod" varchar,
	"stripePaymentId" varchar,
	"invoiceUrl" varchar,
	"metadata" json,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "socialShares" (
	"id" serial PRIMARY KEY NOT NULL,
	"courseId" varchar NOT NULL,
	"studentEmail" varchar NOT NULL,
	"platform" varchar NOT NULL,
	"sharedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "studentProgress" (
	"id" serial PRIMARY KEY NOT NULL,
	"courseId" varchar NOT NULL,
	"studentEmail" varchar NOT NULL,
	"completedChapters" json DEFAULT '[]',
	"totalChapters" integer DEFAULT 0,
	"progressPercentage" integer DEFAULT 0,
	"quizScores" json,
	"assignmentScores" json,
	"mcqScores" json,
	"finalScore" integer DEFAULT 0,
	"streakCount" integer DEFAULT 0,
	"longestStreak" integer DEFAULT 0,
	"lastStreakAt" timestamp,
	"badges" json DEFAULT '[]',
	"status" varchar DEFAULT 'In Progress',
	"startedAt" timestamp DEFAULT now(),
	"completedAt" timestamp,
	"lastActivityAt" timestamp DEFAULT now(),
	"completedNotes" integer DEFAULT 0,
	"totalNotes" integer DEFAULT 0,
	"completedFlashcards" integer DEFAULT 0,
	"totalFlashcards" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "studyMaterial" (
	"id" serial PRIMARY KEY NOT NULL,
	"courseId" varchar NOT NULL,
	"courseType" varchar NOT NULL,
	"topic" varchar NOT NULL,
	"description" text,
	"difficultyLevel" varchar DEFAULT 'Easy',
	"courseLayout" json,
	"createdBy" varchar NOT NULL,
	"status" varchar DEFAULT 'Generating',
	"includeVideos" boolean DEFAULT false,
	"videos" json,
	"hasAssignments" boolean DEFAULT false,
	"assignmentCount" integer DEFAULT 0,
	"isPublic" boolean DEFAULT false,
	"category" varchar DEFAULT 'General',
	"tags" json,
	"enrolledUsers" json,
	"3,2" numeric DEFAULT '0',
	"reviewCount" integer DEFAULT 0,
	"totalStudents" integer DEFAULT 0,
	"publishDate" timestamp,
	"startDate" timestamp,
	"endDate" timestamp,
	"price" numeric(10, 2) DEFAULT '0',
	"currency" varchar DEFAULT 'usd',
	"enrollmentLimit" integer,
	"prerequisites" json,
	"courseImage" text,
	"quizTypes" json DEFAULT '["multiple-choice"]',
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "studyTypeContent" (
	"id" serial PRIMARY KEY NOT NULL,
	"courseId" varchar NOT NULL,
	"chapterId" integer,
	"content" json,
	"type" varchar NOT NULL,
	"quizType" varchar,
	"status" varchar DEFAULT 'Generating',
	"difficulty" varchar DEFAULT 'Medium',
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "supportTickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"userEmail" varchar NOT NULL,
	"subject" varchar NOT NULL,
	"message" text NOT NULL,
	"category" varchar DEFAULT 'General',
	"status" varchar DEFAULT 'Open',
	"source" varchar DEFAULT 'app',
	"aiIssue" boolean DEFAULT false,
	"metadata" json,
	"adminMessage" text,
	"userReply" text,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tutorAssignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"adminId" integer NOT NULL,
	"courseId" varchar NOT NULL,
	"assignedBy" varchar NOT NULL,
	"canReview" boolean DEFAULT true,
	"canEdit" boolean DEFAULT true,
	"canApprove" boolean DEFAULT false,
	"createdAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tutorRequests" (
	"id" serial PRIMARY KEY NOT NULL,
	"userEmail" varchar NOT NULL,
	"userName" varchar NOT NULL,
	"experienceLevel" varchar NOT NULL,
	"subjectExpertise" text NOT NULL,
	"motivation" text NOT NULL,
	"certifications" text,
	"status" varchar DEFAULT 'pending',
	"reviewedBy" varchar,
	"reviewedAt" timestamp,
	"rejectionReason" text,
	"requestedAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "userStreak" (
	"id" serial PRIMARY KEY NOT NULL,
	"studentEmail" varchar NOT NULL,
	"streakCount" integer DEFAULT 0,
	"longestStreak" integer DEFAULT 0,
	"lastStreakAt" timestamp,
	"lastActivityAt" timestamp DEFAULT now(),
	"badges" json DEFAULT '[]',
	"totalActivities" integer DEFAULT 0,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now(),
	CONSTRAINT "userStreak_studentEmail_unique" UNIQUE("studentEmail")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"email" varchar NOT NULL,
	"isMember" boolean DEFAULT false,
	"customerId" varchar,
	"credits" integer DEFAULT 5,
	"totalCreditsUsed" integer DEFAULT 0,
	"createdAt" timestamp DEFAULT now(),
	"updatedAt" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "admin_activity_log_admin_email_idx" ON "adminActivityLog" USING btree ("adminEmail");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "admin_activity_log_action_idx" ON "adminActivityLog" USING btree ("action");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "admin_activity_log_created_at_idx" ON "adminActivityLog" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "admin_session_token_idx" ON "adminSessions" USING btree ("sessionToken");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "admin_session_admin_id_idx" ON "adminSessions" USING btree ("adminId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "admin_email_idx" ON "admins" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "announcements_is_active_idx" ON "announcements" USING btree ("isActive");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "announcements_priority_idx" ON "announcements" USING btree ("priority");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "announcements_created_at_idx" ON "announcements" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chapter_notes_course_id_idx" ON "chapterNotes" USING btree ("courseId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_conversations_user_email_idx" ON "chatConversations" USING btree ("userEmail");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_messages_conversation_id_idx" ON "chatMessages" USING btree ("conversationId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_feedback_course_id_idx" ON "contentFeedback" USING btree ("courseId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_feedback_status_idx" ON "contentFeedback" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_feedback_student_email_idx" ON "contentFeedback" USING btree ("studentEmail");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_review_course_id_idx" ON "contentReview" USING btree ("courseId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_review_status_idx" ON "contentReview" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_review_content_type_idx" ON "contentReview" USING btree ("contentType");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_review_priority_idx" ON "contentReview" USING btree ("priority");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "course_analytics_course_id_idx" ON "courseAnalytics" USING btree ("courseId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "course_enrollment_course_student_idx" ON "courseEnrollments" USING btree ("courseId","studentEmail");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "course_enrollment_course_status_idx" ON "courseEnrollments" USING btree ("courseId","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "course_media_course_id_idx" ON "courseMedia" USING btree ("courseId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "course_media_file_type_idx" ON "courseMedia" USING btree ("fileType");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "course_reviews_course_id_idx" ON "courseReviews" USING btree ("courseId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "course_reviews_student_email_idx" ON "courseReviews" USING btree ("studentEmail");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "credit_tx_user_email_idx" ON "creditTransactions" USING btree ("userEmail");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "credit_tx_type_idx" ON "creditTransactions" USING btree ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "password_reset_token_idx" ON "passwordResetTokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "password_reset_admin_id_idx" ON "passwordResetTokens" USING btree ("adminId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_user_email_idx" ON "paymentRecord" USING btree ("userEmail");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_status_idx" ON "paymentRecord" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_created_at_idx" ON "paymentRecord" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "social_shares_course_id_idx" ON "socialShares" USING btree ("courseId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "student_progress_course_email_idx" ON "studentProgress" USING btree ("courseId","studentEmail");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "study_material_course_id_idx" ON "studyMaterial" USING btree ("courseId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "study_material_created_by_idx" ON "studyMaterial" USING btree ("createdBy");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "study_material_status_idx" ON "studyMaterial" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "study_material_publish_date_idx" ON "studyMaterial" USING btree ("publishDate");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "study_type_content_course_id_type_idx" ON "studyTypeContent" USING btree ("courseId","type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "study_type_content_course_chapter_idx" ON "studyTypeContent" USING btree ("courseId","chapterId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "support_tickets_user_email_idx" ON "supportTickets" USING btree ("userEmail");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "support_tickets_status_idx" ON "supportTickets" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tutor_assignment_admin_id_idx" ON "tutorAssignments" USING btree ("adminId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tutor_assignment_course_id_idx" ON "tutorAssignments" USING btree ("courseId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tutor_assignment_unique_idx" ON "tutorAssignments" USING btree ("adminId","courseId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tutor_requests_user_email_idx" ON "tutorRequests" USING btree ("userEmail");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tutor_requests_status_idx" ON "tutorRequests" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tutor_requests_requested_at_idx" ON "tutorRequests" USING btree ("requestedAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_streak_student_email_idx" ON "userStreak" USING btree ("studentEmail");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_email_idx" ON "users" USING btree ("email");