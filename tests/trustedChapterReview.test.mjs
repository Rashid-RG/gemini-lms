import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildChapterCompletionReview as review } from "../lib/trustedChapterReview.js";

const evidence = {
  evidenceStatus: "assessment_evidence_only",
  chapters: [{ chapterId: 0, assessmentCheckpointsPassed: true },
             { chapterId: 1, assessmentCheckpointsPassed: false }]
};
const session = {
  chapterIndex: 0, heartbeatCount: 25,
  startedAt: "2026-11-22T09:00:00Z",
  expiresAt: "2026-11-22T09:30:00Z",
  closedAt: "2026-11-22T09:29:00Z"
};

test("many accepted heartbeats cannot establish chapter or certificate eligibility", () => {
  const result = review({ chapterEvidence: evidence, sessions: [
    session, { ...session, heartbeatCount: 900 }
  ], activityEnabled: true });
  assert.equal(result.policyVersion, "chapter-review-v1");
  assert.equal(result.chapters[0].acceptedHeartbeats, 925);
  assert.equal(result.chapters[0].chapterCompletionVerified, false);
  assert.equal(result.chapterCompletionVerified, false);
  assert.equal(result.eligibleForCertificate, false);
});

test("activity OFF returns no session counts and no award", () => {
  const result = review({ chapterEvidence: evidence, sessions: [session] });
  assert.equal(result.chapters[0].observedSessions, 0);
  assert.equal(result.chapters[0].activityEvidenceStatus, "not_enabled");
  assert.equal(result.eligibleForCertificate, false);
});

test("truncation and malformed evidence fail closed", () => {
  const truncated = review({ chapterEvidence: evidence, sessions: [session], activityEnabled: true, truncated: true });
  assert.equal(truncated.status, "incomplete_data");
  assert.deepEqual(truncated.chapters, []);
  for (const bad of [
    { ...session, heartbeatCount: -1 },
    { ...session, startedAt: "not-a-date" },
    { ...session, expiresAt: session.startedAt }
  ]) {
    assert.equal(review({ chapterEvidence: evidence, sessions: [bad], activityEnabled: true }).status, "incomplete_data");
  }
  assert.equal(review({ chapterEvidence: { evidenceStatus: "unverified_chapter_mapping", chapters: [] }, sessions: [] }).status, "incomplete_data");
});

test("activity is only fetched with separate enabled flag and scoped to learner/course", () => {
  const route = readFileSync("app/api/(learning)/assessments/trusted/course-policy/route.js", "utf8");
  assert.match(route, /TRUSTED_CHAPTER_ACTIVITY_ENABLED === "true"/);
  assert.match(route, /TRUSTED_CHAPTER_SESSION_TABLE\.studentEmail, access\.email/);
  assert.match(route, /TRUSTED_CHAPTER_SESSION_TABLE\.courseId, courseId/);
  assert.match(route, /activitySessions\.length > 500/);
  assert.match(route, /buildChapterCompletionReview/);
  assert.match(route, /certificateIssuanceEnabled: false/);
  assert.doesNotMatch(route, /db\.insert\(|db\.update\(/);
});
