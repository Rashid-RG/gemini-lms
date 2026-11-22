import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { summarizeTrustedChapterEvidence as summarize } from "../lib/trustedChapterEvidence.js";

const quiz = { id: 9, chapterId: 0, type: "Quiz" };
const verified = (id, score, time = "2026-11-22T09:00:00Z") => ({
  id, studyTypeContentId: 9, status: "submitted",
  mlEligibility: "server_verified", submittedAt: time, score
});

test("chapter evidence uses latest verified grade and rejects earlier pass", () => {
  const result = summarize({
    chapters: [0], assessments: [quiz],
    attempts: [verified("old", 95, "2026-11-20T09:00:00Z"), verified("new", 45)]
  });
  assert.equal(result.chapters[0].checkpoints[0].latestVerifiedScore, 45);
  assert.equal(result.chapters[0].assessmentCheckpointsPassed, false);
  assert.equal(result.chapterCompletionVerified, false);
});
test("even passed assessment checkpoints never establish reading completion", () => {
  const result = summarize({
    chapters: [0, 1], assessments: [quiz, { id: 10, chapterId: 1, type: "MCQ" }],
    attempts: [verified("success", 100), {
      ...verified("second", 80), studyTypeContentId: 10
    }]
  });
  assert.equal(result.allAssessmentCheckpointsPassed, true);
  assert.equal(result.chapterCompletionVerified, false);
  assert.ok(result.chapters.every(x => x.chapterCompletionVerified === false));
});
test("missing chapter quizzes fail closed and no unverified grade is counted", () => {
  const result = summarize({
    chapters: [0, 1], assessments: [quiz],
    attempts: [{ ...verified("forged", 100), mlEligibility: "pending" }]
  });
  assert.equal(result.allAssessmentCheckpointsPassed, false);
  assert.equal(result.chapters[1].reason, "no_verifiable_chapter_assessment");
  assert.equal(result.chapters[0].checkpoints[0].latestVerifiedScore, null);
});
test("invalid mapping, duplicate chapter and malformed grade are rejected", () => {
  assert.throws(() => summarize({
    chapters: [0], assessments: [{...quiz, chapterId: 5}], attempts: []
  }), TypeError);
  assert.throws(() => summarize({
    chapters: [0, 0], assessments: [quiz], attempts: []
  }), TypeError);
  assert.throws(() => summarize({
    chapters: [0], assessments: [quiz], attempts: [verified("bad", Infinity)]
  }), TypeError);
  assert.equal(summarize({ chapters: [0], assessments: [quiz], attempts: [], truncated: true }).evidenceStatus, "incomplete_data");
});
test("chapter evidence endpoint only uses authenticated verified attempt rows", () => {
  const source = readFileSync("app/api/(learning)/assessments/trusted/course-policy/route.js", "utf8");
  assert.match(source, /requireUserAuth\(req\)/);
  assert.match(source, /TRUSTED_ASSESSMENT_ATTEMPT_TABLE\.studentEmail, access\.email/);
  assert.match(source, /mlEligibility, "server_verified"/);
  assert.match(source, /chapterEvidence/);
  assert.match(source, /unverified_chapter_mapping/);
  assert.match(source, /certificateIssuanceEnabled: false/);
  assert.doesNotMatch(source, /db\.insert\(|db\.update\(/);
});

test("activity pilot is separately gated and uses authenticated server-side identity", () => {
  const source = readFileSync("app/api/(learning)/assessments/trusted/chapter-activity/route.js", "utf8");
  assert.match(source, /TRUSTED_CHAPTER_ACTIVITY_ENABLED === "true"/);
  assert.match(source, /TRUSTED_ASSESSMENTS_ENABLED === "true"/);
  assert.match(source, /requireUserAuth\(req\)/);
  assert.match(source, /courseEnrollments/);
  assert.match(source, /studentEmail, access\.email/);
  assert.match(source, /crypto\.randomUUID\(\)/);
  assert.match(source, /sessionId !== undefined/);
  assert.match(source, /chapterCompletionVerified: false/g);
  assert.doesNotMatch(source, /STUDENT_PROGRESS_TABLE|CERTIFICATES_TABLE|db\.delete\(/);
});
test("activity pilot checks expiry, heartbeat spacing and replay-safe atomic conditions", () => {
  const source = readFileSync("app/api/(learning)/assessments/trusted/chapter-activity/route.js", "utf8");
  assert.match(source, /30 \* 60_000/);
  assert.match(source, /now\.getTime\(\) - 30_000/);
  assert.match(source, /isNull\(TRUSTED_CHAPTER_SESSION_TABLE\.closedAt\)/);
  assert.match(source, /gt\(TRUSTED_CHAPTER_SESSION_TABLE\.expiresAt, now\)/);
  assert.match(source, /lastHeartbeatAt, new Date/);
  assert.match(source, /heartbeatCount: sql/);
  assert.match(source, /Session ID is server-generated/);
  assert.match(source, /action === "heartbeat"/);
});
test("activity session has a planned migration only, separate from client progress", () => {
  const schema = readFileSync("configs/schema.js", "utf8");
  const migration = readFileSync("drizzle/phase1_trusted_chapter_sessions.sql", "utf8");
  assert.match(schema, /TRUSTED_CHAPTER_SESSION_TABLE/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS "trustedChapterSessions"/);
  assert.match(migration, /"id" varchar PRIMARY KEY/);
  assert.match(migration, /"heartbeatCount" integer NOT NULL DEFAULT 0/);
  assert.match(migration, /"closedAt" timestamp/);
  assert.match(migration, /CHECK \("chapterIndex" >= 0\)/);
});
