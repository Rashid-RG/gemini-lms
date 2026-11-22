import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseAssessmentQuestions, publicAssessmentQuestions, gradeAssessment } from "../lib/trustedAssessment.js";
import { summarizeVerifiedAttempts } from "../lib/verifiedAssessmentSummary.js";
import { matchesVerifiedProjection } from "../lib/verifiedProjection.js";

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

test("verified mastery read model ignores legacy and pending grades", () => {
  const attempts = [
    { id: "a", studyTypeContentId: 9, status: "submitted", mlEligibility: "server_verified", score: 80, submittedAt: "2026-11-20T10:00:00Z" },
    { id: "b", studyTypeContentId: 9, status: "submitted", mlEligibility: "server_verified", score: 100, submittedAt: "2026-11-21T10:00:00Z" },
    { id: "b", studyTypeContentId: 9, status: "submitted", mlEligibility: "server_verified", score: 100, submittedAt: "2026-11-21T10:00:00Z" },
    { id: "c", studyTypeContentId: 9, status: "started", mlEligibility: "pending", score: 100, submittedAt: "2026-11-21T10:00:00Z" },
    { id: "d", studyTypeContentId: 10, status: "submitted", mlEligibility: "legacy_unverified", score: 100, submittedAt: "2026-11-21T10:00:00Z" },
    { id: "e", studyTypeContentId: 11, status: "submitted", mlEligibility: "server_verified", score: 40, submittedAt: "2026-11-22T10:00:00Z" }
  ];
  const summary = summarizeVerifiedAttempts(attempts);
  assert.deepEqual(summary.map(x => [x.assessmentId, x.totalAttempts, x.averageScore, x.masteryLevel]), [
    [9, 2, 90, "expert"], [11, 1, 40, "novice"]
  ]);
  assert.equal(summary[0].provenance, "server_verified");
  assert.equal(summary[1].needsReview, true);
  assert.deepEqual(summarizeVerifiedAttempts([...attempts].reverse()).map(x => x.averageScore), [90, 40]);
});

test("verified read model rejects corrupted submitted assessments", () => {
  assert.throws(() => summarizeVerifiedAttempts([
    { id: "x", studyTypeContentId: 1, status: "submitted", mlEligibility: "server_verified", score: Infinity, submittedAt: new Date() }
  ]), TypeError);
  assert.throws(() => summarizeVerifiedAttempts({}), TypeError);
});

test("verified performance API is read-only, identity-scoped and bounded", () => {
  const code = readFileSync("app/api/(learning)/assessments/trusted/performance/route.js", "utf8");
  assert.match(code, /requireUserAuth\(req\)/);
  assert.match(code, /TRUSTED_ASSESSMENTS_ENABLED !== "true"/);
  assert.match(code, /studentEmail, access\.email/);
  assert.match(code, /mlEligibility, "server_verified"/);
  assert.match(code, /limit\(501\)/);
  assert.match(code, /truncated/);
  assert.doesNotMatch(code, /db\.update\(|db\.insert\(|questionSnapshot|gradeDetails|\.answers/);
});

test("trusted pilot displays student-scoped verified performance after grading", () => {
  const page = readFileSync("app/course/[courseId]/trusted-quiz/page.jsx", "utf8");
  assert.match(page, /\/api\/assessments\/trusted\/performance/);
  assert.match(page, /Verified learning history/);
  assert.match(page, /performance\.truncated/);
});

test("attempt-ID projection matches the canonical grade and rejects conflicts", () => {
  const attempt = {
    id: "attempt-1", studentEmail: "student@example.com", courseId: "course-1",
    studyTypeContentId: 7, score: 80, submittedAt: "2026-11-22T07:00:00Z",
    status: "submitted", mlEligibility: "server_verified"
  };
  const ledger = {
    attemptId: attempt.id, studentEmail: attempt.studentEmail,
    courseId: attempt.courseId, studyTypeContentId: attempt.studyTypeContentId,
    score: attempt.score, submittedAt: new Date(attempt.submittedAt)
  };
  assert.equal(matchesVerifiedProjection(attempt, ledger), true);
  assert.equal(matchesVerifiedProjection(attempt, { ...ledger, score: 100 }), false);
  assert.equal(matchesVerifiedProjection(attempt, { ...ledger, studentEmail: "other@example.com" }), false);
  assert.equal(matchesVerifiedProjection(attempt, { ...ledger, courseId: "other-course" }), false);
  assert.equal(matchesVerifiedProjection({ ...attempt, status: "started" }, ledger), false);
  assert.equal(matchesVerifiedProjection({ ...attempt, mlEligibility: "pending" }, ledger), false);
  assert.equal(matchesVerifiedProjection({ ...attempt, submittedAt: "invalid" }, ledger), false);
  assert.equal(matchesVerifiedProjection(attempt, null), false);
});

test("projection reconciliation requires super-admin, flags and idempotent database key", () => {
  const route = readFileSync("app/api/(admin)/admin/assessments/reconcile/route.js", "utf8");
  const migration = readFileSync("drizzle/phase1_verified_assessment_projection.sql", "utf8");
  assert.match(route, /requireSuperAdmin\(\)/);
  assert.match(route, /TRUSTED_ASSESSMENT_SYNC_ENABLED !== "true"/);
  assert.match(route, /TRUSTED_ASSESSMENTS_ENABLED !== "true"/);
  assert.match(route, /ON CONFLICT \("attemptId"\) DO NOTHING/);
  assert.match(route, /matchesVerifiedProjection\(attempt, projection\)/);
  assert.match(route, /SET "adaptiveSyncStatus" = 'ledgered'/);
  assert.match(route, /limit\(25\)/);
  assert.doesNotMatch(route, /recordAdaptivePerformance\(|ADAPTIVE_PERFORMANCE_TABLE/);
  assert.match(migration, /"attemptId" varchar PRIMARY KEY NOT NULL/);
});

test("reconciliation only marks matching canonical database rows", () => {
  const route = readFileSync("app/api/(admin)/admin/assessments/reconcile/route.js", "utf8");
  for (const fragment of [
    'UPDATE "trustedAssessmentAttempts" a',
    'AND EXISTS (',
    'p."attemptId" = a."id"',
    'p."studentEmail" = a."studentEmail"',
    'p."courseId" = a."courseId"',
    'p."studyTypeContentId" = a."studyTypeContentId"',
    'p."score" = a."score"',
    'p."submittedAt" = a."submittedAt"',
    'RETURNING a."id"',
    '(transition.rows || transition).length === 1'
  ]) assert.ok(route.includes(fragment), "Missing concurrency guard: " + fragment);
  assert.ok(route.indexOf('RETURNING a."id"') < route.indexOf('ledgered++;'));
});

test("projection ledger cannot become orphaned from its trusted attempt", () => {
  const schema = readFileSync("configs/schema.js", "utf8");
  const migration = readFileSync("drizzle/phase1_verified_assessment_projection.sql", "utf8");
  assert.match(schema, /references\(\(\) => TRUSTED_ASSESSMENT_ATTEMPT_TABLE\.id, \{ onDelete: "restrict" \}\)/);
  assert.ok(migration.includes('REFERENCES "trustedAssessmentAttempts"("id") ON DELETE RESTRICT'));
});

test("PostgreSQL integration suite is opt-in and never uses default DB credentials", () => {
  const source = readFileSync("tests/trustedAssessment.postgres.integration.mjs", "utf8");
  assert.match(source, /ASSESSMENT_TEST_DATABASE_URL/);
  assert.match(source, /ASSESSMENT_TEST_DATABASE_HOST/);
  assert.match(source, /ASSESSMENT_TEST_DATABASE_ACK/);
  assert.match(source, /ISOLATED_NONPRODUCTION/);
  assert.match(source, /parsedHost !== productionHost/);
  assert.match(source, /CREATE SCHEMA/);
  assert.match(source, /DROP SCHEMA/);
  assert.match(source, /Promise\.all\(\[insert\(\), insert\(\), insert\(\), insert\(\)\]\)/);
  assert.match(source, /Promise\.all\(\[mark\(\), mark\(\), mark\(\)\]\)/);
});

test("isolated PostgreSQL rehearsal includes concurrent grading, owner scope and expiry", () => {
  const source = readFileSync("tests/trustedAssessment.postgres.integration.mjs", "utf8");
  assert.match(source, /Concurrent student submissions can claim an attempt only once/);
  assert.match(source, /Another authenticated learner cannot submit this attempt/);
  assert.match(source, /Expired assessments must never transition to submitted/);
  assert.match(source, /"studentEmail"=\$2/);
  assert.match(source, /"expiresAt" > NOW\(\)/);
  assert.match(source, /"status"='started'/);
});

test("trusted mode preserves legacy grade maps instead of accepting browser scores", () => {
  const source = readFileSync("app/api/(assignments)/student-progress/route.js", "utf8");
  assert.match(source, /TRUSTED_ASSESSMENTS_ENABLED === "true"/);
  assert.match(source, /storedProgress\?\.quizScores/);
  assert.match(source, /storedProgress\?\.mcqScores/);
  assert.match(source, /storedProgress\?\.assignmentScores/);
  assert.match(source, /const finalScore = trustedMode \? \(prev\.finalScore \?\? 0\)/);
  assert.match(source, /encodeScoreMap\(acceptedQuizScores\)/);
  assert.match(source, /encodeScoreMap\(acceptedAssignmentScores\)/);
  assert.match(source, /encodeScoreMap\(acceptedMcqScores\)/);
});

test("CI PostgreSQL suite never accepts external or application database URLs", () => {
  const workflow = readFileSync(".github/workflows/security-tests.yml", "utf8");
  const script = readFileSync("tests/assessment_postgres_ci.py", "utf8");
  assert.match(workflow, /image: postgres:16/);
  assert.match(workflow, /ASSESSMENT_PG_CI_ACK: EPHEMERAL_LOCALHOST_ONLY/);
  assert.match(script, /DATABASE_URL/);
  assert.match(script, /PGHOST/);
  assert.match(script, /127\.0\.0\.1/);
  assert.match(script, /phase1_trusted_assessment_attempts\.sql/);
  assert.match(script, /phase1_verified_assessment_projection\.sql/);
  assert.match(script, /DROP SCHEMA/);
});

test("student gradebook annotates verified attempts and defers legacy pass awards", () => {
  const route = readFileSync("app/api/(assignments)/grades/student/route.js", "utf8");
  assert.match(route, /TRUSTED_ASSESSMENTS_ENABLED === "true"/);
  assert.match(route, /TRUSTED_ASSESSMENT_ATTEMPT_TABLE/);
  assert.match(route, /studentEmail, studentEmail/);
  assert.match(route, /mlEligibility, "server_verified"/);
  assert.match(route, /gradeProvenance:/);
  assert.match(route, /verifiedQuizAverage/);
  assert.match(route, /verifiedQuizWindowTruncated/);
  assert.match(route, /resultStatus = "Pending Verification"/);
});

test("both public certificate issuance routes fail closed in trusted mode", () => {
  for (const path of [
    "app/api/(certificates)/generate-certificate/route.js",
    "app/api/student/generate-certificate/route.js"
  ]) {
    const source = readFileSync(path, "utf8");
    assert.match(source, /TRUSTED_ASSESSMENTS_ENABLED === "true"/);
    assert.match(source, /Certificate issuance is pending verified gradebook/);
    assert.match(source, /status: 409/);
    assert.ok(source.indexOf("TRUSTED_ASSESSMENTS_ENABLED") < source.indexOf("await db"));
    assert.match(source, /export async function GET/);
  }
});

test("instructor gradebook shows only authorized student verified grades", () => {
  const code = readFileSync("app/api/(assignments)/grades/instructor/route.js", "utf8");
  assert.match(code, /Only course instructor can view grades/);
  assert.match(code, /TRUSTED_ASSESSMENTS_ENABLED === "true"/);
  assert.match(code, /TRUSTED_ASSESSMENT_ATTEMPT_TABLE/);
  assert.match(code, /studentEmail, progress\.studentEmail/);
  assert.match(code, /mlEligibility, "server_verified"/);
  assert.match(code, /verifiedQuizAverage/);
  assert.match(code, /gradeProvenance/);
  assert.match(code, /verifiedWindowTruncated/);
});

test("admin certificate eligibility defers to verified policy in trusted mode", () => {
  const source = readFileSync("app/api/(admin)/admin/gradebook/route.js", "utf8");
  assert.match(source, /TRUSTED_ASSESSMENTS_ENABLED === "true"/);
  assert.match(source, /\? false : chaptersCompleted && passedQuizzes && allAssignmentsPassed/);
  assert.match(source, /certificateEligibilityStatus:/);
  assert.match(source, /Pending Verification/);
});
