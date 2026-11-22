-- PLANNED / NON-DESTRUCTIVE. DO NOT APPLY OUTSIDE ISOLATED CI WITHOUT APPROVAL.
-- Course revisions contain PRIVATE answer keys. Never return manifestSnapshot to students.
-- Immutable records need an explicit privileged append-only publishing workflow.
CREATE TABLE IF NOT EXISTS "trustedCourseRevisions" (
  "id" varchar PRIMARY KEY NOT NULL,
  "courseId" varchar NOT NULL,
  "revisionNumber" integer NOT NULL,
  "fingerprint" varchar(64) NOT NULL,
  "manifestVersion" varchar NOT NULL DEFAULT 'course-manifest-sha256-v1',
  "manifestSnapshot" jsonb NOT NULL,
  "publishedBy" varchar NOT NULL,
  "publishedAt" timestamp NOT NULL DEFAULT NOW(),
  CONSTRAINT "trusted_course_revision_positive" CHECK ("revisionNumber" > 0),
  CONSTRAINT "trusted_course_revision_sha256" CHECK ("fingerprint" ~ '^[a-f0-9]{64}$'),
  CONSTRAINT "trusted_course_revision_manifest_object" CHECK (jsonb_typeof("manifestSnapshot") = 'object'),
  CONSTRAINT "trusted_course_revision_unique" UNIQUE ("courseId", "revisionNumber")
);
CREATE INDEX IF NOT EXISTS "trusted_course_revisions_course_idx"
  ON "trustedCourseRevisions" ("courseId", "revisionNumber");

-- Defensive immutability at database level; updates and deletes cannot silently
-- change previously published requirements even if application code regresses.
CREATE OR REPLACE FUNCTION trusted_course_revision_reject_change()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Published course revisions are immutable';
END;
$$;
DROP TRIGGER IF EXISTS trusted_course_revision_immutable ON "trustedCourseRevisions";
CREATE TRIGGER trusted_course_revision_immutable
  BEFORE UPDATE OR DELETE ON "trustedCourseRevisions"
  FOR EACH ROW EXECUTE FUNCTION trusted_course_revision_reject_change();

-- Future attempt-binding migration is intentionally separate: do not pretend
-- that historical attempts were graded against an already-published revision.
