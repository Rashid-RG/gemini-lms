-- PLANNED NON-DESTRUCTIVE FOLLOW-ON MIGRATION. DO NOT APPLY TO PRODUCTION.
-- Explicit nullable binding is required for newly started revision-bound attempts.
-- Historical attempts intentionally stay NULL and must never be backfilled
-- based on a mutable current course manifest.
ALTER TABLE "trustedAssessmentAttempts"
  ADD COLUMN IF NOT EXISTS "courseRevisionId" varchar;

-- Nullable FK: old attempts continue to exist but cannot be mistaken for
-- revision-bound attempts; deletion of an immutable published revision is blocked.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'trusted_attempt_course_revision_fk'
      AND conrelid = '"trustedAssessmentAttempts"'::regclass
  ) THEN
    ALTER TABLE "trustedAssessmentAttempts"
      ADD CONSTRAINT "trusted_attempt_course_revision_fk"
      FOREIGN KEY ("courseRevisionId")
      REFERENCES "trustedCourseRevisions" ("id")
      ON DELETE RESTRICT;
  END IF;
END;
$$;
CREATE INDEX IF NOT EXISTS "trusted_attempt_course_revision_idx"
  ON "trustedAssessmentAttempts" ("courseRevisionId");
