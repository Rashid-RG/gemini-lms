import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseAssessmentQuestions, publicAssessmentQuestions, gradeAssessment } from "../lib/trustedAssessment.js";

const stored = {
  topic: "Algebra",
  questions: [
    { question: "2 + 2?", options: ["3", "4"], answer: "4" },
    { question: "3 + 3?", options: ["5", "6"], answer: "6" }
  ]
};

test("server question snapshot hides answer keys from student response", () => {
  const snapshot = parseAssessmentQuestions(JSON.stringify(stored));
  assert.equal(snapshot[0].answer, "4");
  const visible = publicAssessmentQuestions(snapshot);
  assert.deepEqual(visible, [
    { id: 0, question: "2 + 2?", options: ["3", "4"] },
    { id: 1, question: "3 + 3?", options: ["5", "6"] }
  ]);
  assert.equal(JSON.stringify(visible).includes('"answer"'), false);
});

test("server grades using immutable stored answers, not browser-supplied scores", () => {
  const snapshot = parseAssessmentQuestions(stored);
  const result = gradeAssessment(snapshot, ["4", "5"]);
  assert.equal(result.score, 50);
  assert.equal(result.correctCount, 1);
  assert.equal(result.totalQuestions, 2);
  assert.deepEqual(result.details.map(x => x.isCorrect), [true, false]);
  assert.equal(gradeAssessment(snapshot, ["4", "6"]).score, 100);
  assert.equal(gradeAssessment(snapshot, ["wrong", "wrong"]).score, 0);
});

test("invalid stored assessment and malformed student submissions are rejected", () => {
  for (const content of [[], {questions: []}, {questions: [{question: "X", answer: ""}]}, "{invalid"]) {
    assert.throws(() => parseAssessmentQuestions(content), TypeError);
  }
  const snapshot = parseAssessmentQuestions(stored);
  for (const responses of [[], ["4"], ["4", 6], ["4", "x".repeat(2001)]]) {
    assert.throws(() => gradeAssessment(snapshot, responses), TypeError);
  }
});

test("trusted start and submit APIs require authentication and feature opt-in", () => {
  const start = readFileSync("app/api/(learning)/assessments/trusted/start/route.js", "utf8");
  const submit = readFileSync("app/api/(learning)/assessments/trusted/submit/route.js", "utf8");
  for (const code of [start, submit]) {
    assert.match(code, /TRUSTED_ASSESSMENTS_ENABLED !== "true"/);
    assert.match(code, /requireUserAuth\(req\)/);
    assert.match(code, /access\.email/);
    assert.match(code, /Cache-Control": "no-store"/);
  }
  assert.match(start, /publicAssessmentQuestions\(snapshot\)/);
  assert.match(start, /questionSnapshot: snapshot/);
  assert.match(submit, /gradeAssessment\(attempt\.questionSnapshot, responses\)/);
  assert.match(submit, /eq\(TRUSTED_ASSESSMENT_ATTEMPT_TABLE\.status, "started"\)/);
  assert.match(submit, /gt\(TRUSTED_ASSESSMENT_ATTEMPT_TABLE\.expiresAt, new Date\(\)\)/);
  assert.match(submit, /mlEligibility: "server_verified"/);
});

test("legacy score APIs block untrusted submissions in trusted mode", () => {
  const quiz = readFileSync("app/api/(assignments)/submit-quiz/route.js", "utf8");
  const adaptive = readFileSync("app/api/(learning)/adaptive-performance/route.js", "utf8");
  for (const code of [quiz, adaptive]) {
    assert.match(code, /TRUSTED_ASSESSMENTS_ENABLED === "true"/);
    assert.match(code, /status: 409/);
  }
});
