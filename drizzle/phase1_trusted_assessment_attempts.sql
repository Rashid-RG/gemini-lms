-- PLANNED NON-DESTRUCTIVE MIGRATION. DO NOT APPLY TO PRODUCTION WITHOUT APPROVAL.
-- Apply only after backup, isolated Neon test, schema review, and rollout verification.
CREATE TABLE IF NOT EXISTS "trustedAssessmentAttempts" (
    "id" varchar PRIMARY KEY NOT NULL,
    "studentEmail" varchar NOT NULL,
    "courseId" varchar NOT NULL,
    "studyTypeContentId" integer NOT NULL,
    "questionSnapshot" json NOT NULL,
    "questionCount" integer NOT NULL,
    "status" varchar NOT NULL DEFAULT 'started',
    "answers" json,
    "gradeDetails" json,
    "score" integer,
    "correctCount" integer,
    "gradingVersion" varchar NOT NULL DEFAULT 'trusted-v1',
    "mlEligibility" varchar NOT NULL DEFAULT 'pending',
    "adaptiveSyncStatus" varchar NOT NULL DEFAULT 'pending',
    "startedAt" timestamp NOT NULL DEFAULT NOW(),
    "expiresAt" timestamp NOT NULL,
    "submittedAt" timestamp,
    CONSTRAINT "trusted_attempt_question_count" CHECK ("questionCount" BETWEEN 1 AND 100),
    CONSTRAINT "trusted_attempt_score" CHECK ("score" IS NULL OR "score" BETWEEN 0 AND 100),
    CONSTRAINT "trusted_attempt_status" CHECK ("status" IN ('started', 'submitted'))
);
CREATE INDEX IF NOT EXISTS "trusted_attempt_student_idx"
 ON "trustedAssessmentAttempts" ("studentEmail");
CREATE INDEX IF NOT EXISTS "trusted_attempt_course_idx"
 ON "trustedAssessmentAttempts" ("courseId");
CREATE INDEX IF NOT EXISTS "trusted_attempt_assessment_idx"
 ON "trustedAssessmentAttempts" ("studyTypeContentId");
