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

test("student catalog exposes metadata only and requires course access", () => {
  const code = readFileSync("app/api/(learning)/assessments/trusted/catalog/route.js", "utf8");
  assert.match(code, /TRUSTED_ASSESSMENTS_ENABLED !== "true"/);
  assert.match(code, /requireUserAuth\(req\)/);
  assert.match(code, /eq\(STUDY_MATERIAL_TABLE\.createdBy, access\.email\)/);
  assert.match(code, /STUDY_MATERIAL_TABLE\.isPublic/);
  assert.match(code, /courseEnrollments/);
  assert.doesNotMatch(code, /STUDY_TYPE_CONTENT_TABLE\.content/);
});

test("trusted mode redacts legacy Quiz and MCQ answer banks", () => {
  const code = readFileSync("app/api/(learning)/study-type/route.jsx", "utf8");
  assert.match(code, /function redactAssessmentKeys\(item\)/);
  assert.match(code, /TRUSTED_ASSESSMENTS_ENABLED !== "true"/);
  assert.match(code, /content: null/);
  assert.match(code, /map\(redactAssessmentKeys\)/);
  assert.match(code, /redactAssessmentKeys\(result\[0\]\)/);
});

test("isolated pilot consumes only trusted assessment APIs", () => {
  const code = readFileSync("app/course/[courseId]/trusted-quiz/page.jsx", "utf8");
  assert.match(code, /\/api\/assessments\/trusted\/catalog/);
  assert.match(code, /\/api\/assessments\/trusted\/start/);
  assert.match(code, /\/api\/assessments\/trusted\/submit/);
  assert.doesNotMatch(code, /\/api\/submit-quiz|\/api\/adaptive-performance/);
});

test("untrusted option objects cannot smuggle grading keys to learners", () => {
  assert.throws(() => parseAssessmentQuestions({
    questions: [{
      question: "Which answer?", answer: "A",
      options: [{ text: "A", answer: "A", isCorrect: true }, "B"]
    }]
  }), TypeError);
  assert.throws(() => parseAssessmentQuestions({
    questions: [{ question: "Which answer?", answer: "A", options: ["A", ""] }]
  }), TypeError);
  const publicQuestions = publicAssessmentQuestions(parseAssessmentQuestions(stored));
  assert.deepEqual(Object.keys(publicQuestions[0]).sort(), ["id", "options", "question"]);
});

test("paid public courses are not assessment-accessible without enrollment", () => {
  for (const path of [
    "app/api/(learning)/assessments/trusted/start/route.js",
    "app/api/(learning)/assessments/trusted/catalog/route.js"
  ]) {
    const source = readFileSync(path, "utf8");
    assert.match(source, /COALESCE\(\$\{STUDY_MATERIAL_TABLE\.price\}, 0\) = 0/);
    assert.match(source, /courseEnrollments/);
    assert.match(source, /STUDY_MATERIAL_TABLE\.createdBy/);
  }
});

test("attempt creation is throttled before database writes", () => {
  const source = readFileSync("app/api/(learning)/assessments/trusted/start/route.js", "utf8");
  assert.match(source, /checkRateLimit\(access\.userId \|\| access\.email, "assignment"\)/);
  assert.match(source, /status: 429/);
  assert.match(source, /"Retry-After"/);
  assert.ok(source.indexOf("checkRateLimit(") < source.indexOf("db.insert(TRUSTED_ASSESSMENT_ATTEMPT_TABLE)"));
});

test("trusted mode reroutes old Quiz, MCQ and manual Quiz pages", () => {
  const middleware = readFileSync("middleware.js", "utf8");
  assert.match(middleware, /TRUSTED_ASSESSMENTS_ENABLED === 'true'/);
  assert.match(middleware, /quiz\|mcq\|manual-quiz/);
  assert.match(middleware, /\/trusted-quiz/);
  assert.match(middleware, /await auth\.protect\(\)/);
  assert.ok(middleware.indexOf("await auth.protect()") < middleware.indexOf("legacyQuizPath"));
});

test("trusted submission does not double-count adaptive projections on retries", () => {
  const source = readFileSync("app/api/(learning)/assessments/trusted/submit/route.js", "utf8");
  assert.doesNotMatch(source, /recordAdaptivePerformance\(/);
  assert.match(source, /adaptiveSyncStatus = "pending"/);
  assert.match(source, /status: "submitted"/);
  assert.match(source, /mlEligibility: "server_verified"/);
});
