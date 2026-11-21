-- DEVELOPMENT ONLY: DO NOT RUN AGAINST PRODUCTION WITHOUT APPROVAL.
-- Apply in an isolated Neon branch after trustedAssessmentAttempts migration.
-- The attempt ID is the durable, idempotent projection key.
CREATE TABLE IF NOT EXISTS "verifiedAssessmentProjection" (
  "attemptId" varchar PRIMARY KEY NOT NULL REFERENCES "trustedAssessmentAttempts"("id") ON DELETE RESTRICT,
  "studentEmail" varchar NOT NULL,
  "courseId" varchar NOT NULL,
  "studyTypeContentId" integer NOT NULL,
  "score" integer NOT NULL,
  "submittedAt" timestamp NOT NULL,
  "projectedAt" timestamp NOT NULL DEFAULT NOW(),
  CONSTRAINT "verified_projection_score_range" CHECK ("score" BETWEEN 0 AND 100)
);
CREATE INDEX IF NOT EXISTS "verified_projection_student_course_idx"
 ON "verifiedAssessmentProjection" ("studentEmail", "courseId");
CREATE INDEX IF NOT EXISTS "verified_projection_assessment_idx"
 ON "verifiedAssessmentProjection" ("studyTypeContentId");
