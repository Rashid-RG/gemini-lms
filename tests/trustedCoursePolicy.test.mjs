import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { evaluateTrustedCourseAssessments as evaluate } from "../lib/trustedCoursePolicy.js";

const assessment = { id: 15, type: "Quiz" };
const attempt = (id, score, date = "2026-11-22T09:00:00Z") => ({
  id, studyTypeContentId: 15, score, submittedAt: date,
  status: "submitted", mlEligibility: "server_verified"
});
const reviewed = (score, date = "2026-11-22T10:00:00Z") => ({
  id: 1, assignmentId: "essay-1", score, status: "ManuallyGraded",
  gradedBy: "teacher@example.invalid", reviewedBy: "teacher@example.invalid",
  gradedAt: date, reviewedAt: date
});
const run = (options = {}) => evaluate({
  assessments: [assessment], attempts: [attempt("a", 80)],
  assignments: [], submissions: [], ...options
});

test("latest server-verified quiz result wins, never legacy or client score", () => {
  const outcome = run({ attempts: [
    attempt("old", 100, "2026-11-21T09:00:00Z"),
    attempt("new", 40),
    { ...attempt("forged", 100, "2026-11-23T09:00:00Z"), mlEligibility: "pending" }
  ] });
  assert.equal(outcome.assessments[0].score, 40);
  assert.equal(outcome.assessments[0].passed, false);
  assert.equal(outcome.eligibleForCertificate, false);
  assert.equal(outcome.readyForCompletionReview, false);
});
test("each required quiz and MCQ must have a verified passing attempt", () => {
  const outcome = run({ assessments: [assessment, {id: 16, type: "MCQ"}] });
  assert.equal(outcome.reason, "quiz_requirements_incomplete");
  assert.equal(outcome.assessments.find(a => a.assessmentId === 16).score, null);
});
test("human review is required for assignment grades, not AI-only grades", () => {
  const options = {
    assignments: [{ assignmentId: "essay-1" }],
    submissions: [{ ...reviewed(95), gradedBy: "AI" }]
  };
  assert.equal(run(options).reason, "assignment_review_incomplete");
  assert.equal(run({ ...options, submissions: [reviewed(75)] }).readyForCompletionReview, true);
  assert.equal(run({ ...options, submissions: [reviewed(55)] }).readyForCompletionReview, false);
  assert.equal(run({ ...options, submissions: [{ ...reviewed(95), reviewedAt: null }] }).readyForCompletionReview, false);
});
test("passing assessments never automatically issue a certificate", () => {
  const outcome = run({ assignments: [{assignmentId:"essay-1"}], submissions:[reviewed(88)] });
  assert.equal(outcome.status, "assessment_requirements_met");
  assert.equal(outcome.reason, "chapter_completion_unverified");
  assert.equal(outcome.eligibleForCertificate, false);
  assert.equal(outcome.policyVersion, "trusted-course-v1");
});
test("empty or truncated catalogs fail closed", () => {
  assert.equal(run({ assessments: [] }).reason, "no_ready_assessments");
  assert.equal(run({ truncated: true }).reason, "incomplete_data");
  assert.equal(run({ truncated: true }).readyForCompletionReview, false);
});
test("malformed authoritative grades and duplicate required IDs are rejected", () => {
  assert.throws(() => run({ attempts: [attempt("x", Infinity)] }), TypeError);
  assert.throws(() => run({ assessments: [assessment, assessment] }), TypeError);
  assert.throws(() => run({ assignments: [{assignmentId:"a"}, {assignmentId:"a"}] }), TypeError);
});
test("course-policy API is feature gated, signed-in scoped and read-only", () => {
  const source = readFileSync("app/api/(learning)/assessments/trusted/course-policy/route.js", "utf8");
  assert.match(source, /TRUSTED_ASSESSMENTS_ENABLED !== "true"/);
  assert.match(source, /requireUserAuth\(req\)/);
  assert.match(source, /STUDY_MATERIAL_TABLE\.createdBy, access\.email/);
  assert.match(source, /courseEnrollments/);
  assert.match(source, /TRUSTED_ASSESSMENT_ATTEMPT_TABLE\.studentEmail, access\.email/);
  assert.match(source, /ASSIGNMENT_SUBMISSIONS_TABLE\.studentEmail, access\.email/);
  assert.match(source, /officialGrade: null/);
  assert.match(source, /certificateIssuanceEnabled: false/);
  assert.doesNotMatch(source, /db\.insert\(|db\.update\(|questionSnapshot|answers:/);
});
