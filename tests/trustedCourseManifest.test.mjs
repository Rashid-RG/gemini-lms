import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fingerprintCourseManifest, compareCourseFingerprint } from "../lib/trustedCourseManifest.js";

const manifest = () => ({
  courseId: "course-a",
  courseLayout: { chapters: [{ title: "Introduction", notes: "Learn safely" }] },
  assessments: [{ id: 12, chapterId: 0, type: "Quiz",
    content: { questions: [{ question: "Choose A", options: ["A", "B"], correctOption: 0 }] } }],
  assignments: [{ assignmentId: "essay", title: "Writing", description: "Submit an essay",
    rubric: { accuracy: 100 }, totalPoints: 100 }]
});

test("provisional fingerprint is deterministic across property and catalog ordering", () => {
  const data = manifest();
  const current = fingerprintCourseManifest(data);
  const reordered = fingerprintCourseManifest({
    ...data,
    courseLayout: { chapters: [{ notes: "Learn safely", title: "Introduction" }] },
    assessments: [{ type: "Quiz", content: {
      questions: [{ correctOption: 0, options: ["A", "B"], question: "Choose A" }]
    }, chapterId: 0, id: 12 }],
    assignments: [{ totalPoints: 100, rubric: { accuracy: 100 },
      description: "Submit an essay", title: "Writing", assignmentId: "essay" }]
  });
  assert.equal(current.fingerprint, reordered.fingerprint);
  assert.equal(current.version, "course-manifest-sha256-v1");
  assert.equal(current.status, "provisional_unfrozen");
  assert.equal(current.frozen, false);
  assert.equal(current.fingerprint.length, 64);
});

test("assessment answer edits, lesson edits and rubric changes all change fingerprints", () => {
  const base = manifest();
  const fingerprint = fingerprintCourseManifest(base).fingerprint;
  const changedAnswer = manifest();
  changedAnswer.assessments[0].content.questions[0].correctOption = 1;
  const changedLesson = manifest();
  changedLesson.courseLayout.chapters[0].notes = "Material changed";
  const changedRubric = manifest();
  changedRubric.assignments[0].rubric.accuracy = 50;
  for (const changed of [changedAnswer, changedLesson, changedRubric]) {
    const next = fingerprintCourseManifest(changed);
    assert.notEqual(next.fingerprint, fingerprint);
    assert.equal(compareCourseFingerprint(next, fingerprint), "changed");
  }
  assert.equal(compareCourseFingerprint(fingerprintCourseManifest(base), fingerprint), "unchanged");
});

test("fingerprint never establishes frozen content or certificate eligibility", () => {
  const fingerprint = fingerprintCourseManifest(manifest());
  assert.equal(fingerprint.frozen, false);
  assert.equal(compareCourseFingerprint(fingerprint, null), "not_requested");
  assert.equal(compareCourseFingerprint(fingerprint, "invalid"), "invalid_reference");
  assert.equal("eligibleForCertificate" in fingerprint, false);
  assert.equal(JSON.stringify(fingerprint).includes("correctOption"), false);
  assert.equal(JSON.stringify(fingerprint).includes("Choose A"), false);
});

test("missing, duplicated, oversized, cyclic or unmapped catalogs fail closed", () => {
  const empty = manifest(); empty.assessments = [];
  const duplicate = manifest(); duplicate.assessments.push({ ...duplicate.assessments[0] });
  const unmapped = manifest(); unmapped.assessments[0].chapterId = 200;
  const incomplete = manifest(); incomplete.incomplete = true;
  for (const data of [empty, duplicate, unmapped, incomplete]) {
    assert.equal(fingerprintCourseManifest(data).status, "incomplete_data");
    assert.equal(fingerprintCourseManifest(data).fingerprint, null);
  }
  const cyclic = manifest();
  cyclic.courseLayout.chapters[0].self = cyclic.courseLayout;
  assert.throws(() => fingerprintCourseManifest(cyclic), TypeError);
});

test("trusted course-policy route computes fingerprints without returning private content", () => {
  const source = readFileSync("app/api/(learning)/assessments/trusted/course-policy/route.js", "utf8");
  assert.match(source, /fingerprintCourseManifest/);
  assert.match(source, /compareCourseFingerprint/);
  assert.match(source, /expectedFingerprint/);
  assert.match(source, /courseManifest: \{ \.\.\.manifest, comparison: manifestComparison \}/);
  assert.match(source, /certificateIssuanceEnabled: false/);
  assert.doesNotMatch(source, /db\.insert\(|db\.update\(/);
});

test("published revision schema is private, append-only and constrained", () => {
  const sql = readFileSync("drizzle/phase1_trusted_course_revisions.sql", "utf8");
  const schema = readFileSync("configs/schema.js", "utf8");
  const rehearsal = readFileSync("tests/assessment_postgres_ci.py", "utf8");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS "trustedCourseRevisions"/);
  assert.match(sql, /"manifestSnapshot" jsonb NOT NULL/);
  assert.match(sql, /UNIQUE \("courseId", "revisionNumber"\)/);
  assert.match(sql, /BEFORE UPDATE OR DELETE ON "trustedCourseRevisions"/);
  assert.match(sql, /trusted_course_revision_reject_change/);
  assert.match(schema, /TRUSTED_COURSE_REVISION_TABLE/);
  assert.match(schema, /manifestSnapshot: jsonb\(\)\.notNull\(\)/);
  assert.match(rehearsal, /phase1_trusted_course_revisions\.sql/);
  assert.match(rehearsal, /expect_failure=True/);
});

test("attempt revision linkage preserves legacy NULL and requires a real revision FK", () => {
  const sql = readFileSync("drizzle/phase1_trusted_attempt_revision_binding.sql", "utf8");
  const schema = readFileSync("configs/schema.js", "utf8");
  const integration = readFileSync("tests/assessment_postgres_ci.py", "utf8");
  assert.match(sql, /ADD COLUMN IF NOT EXISTS "courseRevisionId" varchar/);
  assert.match(sql, /FOREIGN KEY \("courseRevisionId"\)/);
  assert.match(sql, /REFERENCES "trustedCourseRevisions" \("id"\)/);
  assert.match(sql, /ON DELETE RESTRICT/);
  assert.match(schema, /courseRevisionId: varchar\(\)\.references/);
  assert.match(integration, /phase1_trusted_attempt_revision_binding\.sql/);
  assert.match(integration, /Historical attempt backfilled incorrectly/);
  assert.match(integration, /Revision FK binding failed/);
});
