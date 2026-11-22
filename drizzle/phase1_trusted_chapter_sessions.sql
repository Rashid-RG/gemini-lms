-- PLANNED NON-DESTRUCTIVE MIGRATION. DO NOT APPLY TO PRODUCTION.
-- Requires independent review, backup and an isolated database rehearsal.
-- Session evidence records authenticated activity only; NOT verified reading.
CREATE TABLE IF NOT EXISTS "trustedChapterSessions" (
  "id" varchar PRIMARY KEY NOT NULL,
  "studentEmail" varchar NOT NULL,
  "courseId" varchar NOT NULL,
  "chapterIndex" integer NOT NULL,
  "startedAt" timestamp NOT NULL DEFAULT NOW(),
  "lastHeartbeatAt" timestamp NOT NULL DEFAULT NOW(),
  "expiresAt" timestamp NOT NULL,
  "closedAt" timestamp,
  "heartbeatCount" integer NOT NULL DEFAULT 0,
  CONSTRAINT "trusted_chapter_index_valid" CHECK ("chapterIndex" >= 0),
  CONSTRAINT "trusted_chapter_heartbeat_valid" CHECK ("heartbeatCount" >= 0),
  CONSTRAINT "trusted_chapter_session_window" CHECK ("expiresAt" > "startedAt")
);
CREATE INDEX IF NOT EXISTS "trusted_chapter_sessions_owner_course_idx"
  ON "trustedChapterSessions" ("studentEmail", "courseId", "startedAt");
