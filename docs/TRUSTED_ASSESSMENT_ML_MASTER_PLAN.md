# Gemini LMS — Trusted Assessment and ML Data Master Plan (development phase)

## Goal
Provide auditable, server-graded quiz attempts for commercial education and future machine-learning research. **No production rollout is authorized.** Work remains on `security/phase1-payments-auth-tests`.

## 1. Threat model
- A browser is untrusted. A user can manipulate request bodies, quiz answer keys, scores, timestamps, and repeated submissions.
- A quiz score is trusted only when calculated by the server from an immutable per-attempt snapshot of the server-stored question bank.
- Do not expose stored correct answers through student-facing APIs before submission.
- Completed grade records must be attributable to an authenticated learner, content version, grading version, attempt ID and time.
- Research features must distinguish verified events from legacy client-reported outcomes.

## 2. Architecture and delivery stages
1. **Trusted bank:** Existing `studyTypeContent` remains the source for a new feature-gated prototype. The new start endpoint validates and snapshots the record, then emits only question text/options/indices. Before rollout, migrate the legacy study-type, MCQ, Quiz and admin APIs to prevent disclosure of answer keys.
2. **Attempt lifecycle:** UUID attempt IDs; authenticated owner; course ownership/enrollment/public access checks; 5–60 minute expiry; frozen question snapshot; one-time submission claim. New `trustedAssessmentAttempts` table with indexed student/course/content fields.
3. **Server grading:** A pure function scores exact normalized string answers against the server-stored keys. No trust in browser percentages or answer key fields. Question-level correctness is stored without returning correct answers. Provide instructor review/override in a later version.
4. **Adaptive projection:** Only verified submissions may update adaptive performance. A failed adaptive update is recorded as `pending` for reconciliation. Legacy `/api/submit-quiz` and `/api/adaptive-performance` POSTs are disabled when trusted mode is enabled.
5. **ML research:** Use only `mlEligibility = server_verified` attempts as candidate records, subject to separate consent and data-governance criteria. Train/test partition by learner/time, compare baseline rule-driven approaches and learned models, report calibration and bias. No claimed performance gains without independent evaluation.

## 3. API contract (planned pilot only)
- `POST /api/assessments/trusted/start`: authenticated { courseId, assessmentId }; returns { attemptId, expiresAt, questionCount, questions }. Never includes `answer`.
- `POST /api/assessments/trusted/submit`: authenticated { attemptId, responses: string[] }; returns { score, correctCount, totalQuestions, questionOutcomes, verified: true }. Calculates on server and atomically transitions from started to submitted.
- Both routes respond 503 unless `TRUSTED_ASSESSMENTS_ENABLED=true`. **The flag MUST remain off** until the migration is validated, legacy question exposure is eliminated, and the UI is migrated.
- New table is defined in `configs/schema.js`; the proposed SQL is `drizzle/phase1_trusted_assessment_attempts.sql`. **No migration was executed.**

## 4. Release blockers / non-goals for this initial milestone
- The existing `/api/study-type` and course quiz/MCQ pages can reveal the answer keys and/or evaluate answers locally. A secure bank requires migrating **all** such routes/components, not merely creating a new grading endpoint.
- The current legacy quiz/MCQ pages have not been migrated to the new API, so do not enable the feature flag yet.
- Server-stored generated answers may be invalid or ambiguous; add rubric moderation and a trustworthy assessment version/hash and dedicated question IDs before high-stakes examinations.
- The start API currently uses existing public/enrollment/creator access semantics. Add course-level scheduling and attempt-rate caps; current implementation does not enforce an attempt limit.
- Cross-request `recordAdaptivePerformance` projection may race; add idempotent repair worker and reviewed database uniqueness constraints.
- Database migration and actual concurrent submissions must be validated on an isolated Neon test database. Test recovery, timeout, cancellation, replay, and course isolation. Never run migration against production without explicit approval.
- Review privacy, student consent, retention, access controls, research exports, and deletion policy. Student scores are personal educational data.
- The prototype uses exact normalized string matches; free-text answers, partial credit, multilingual equivalence, and manual overrides need validated grading policies.

## 5. Required CI and QA gates
- Unit tests: parse bank; hide answers; score; reject forged/malformed submissions; verify one-time claim condition structurally.
- Integration tests: server start -> submit -> retry -> expiry -> cross-account denial; assert only one completed attempt and one downstream projection.
- Static/API audit: no public response exposes `questionSnapshot` or `answer`; old endpoints blocked when pilot enabled.
- E2E: student quiz, tutor review, gradebook, certificate and ML pipeline read only verified attempts.
- Release: human approval, non-destructive migration, limited staging pilot, rollback plan and data isolation verification.

## 6. Research instrumentation specification
Capture: opaque learner identifier, course/assessment/question version, topic tag, difficulty, server start/submitted times, question-level correctness, score, grading version, trusted provenance, consent cohort. Do not export direct emails, raw answers, or unverified legacy scores to ML datasets by default. Define consent, minimization and retention before any research extraction.

## 7. Initial pilot implementation (committed, disabled)
- `GET /api/assessments/trusted/catalog?courseId=...`: authenticated answer-free metadata listing with course access checks.
- `/course/[courseId]/trusted-quiz`: isolated learner-facing pilot. Existing quiz/MCQ pages remain unchanged and are not yet migrated.
- Legacy `/api/study-type` now **redacts** Quiz/MCQ `content` in trusted mode; the main legacy Quiz/MCQ screens may show unavailable content if this feature flag is enabled before migration.
- The trusted pilot UI supports straightforward option text and free-text entry. AI-generated question formats and partial-credit policies need verification before rollout.
- Do not enable `TRUSTED_ASSESSMENTS_ENABLED` merely because tests pass. Migration, course-level access controls, cross-route answer-leak audit, stage data isolation and manual review are release gates.

## 8. Security hardening after pilot review
- Generated question `options` must be a small array of plain non-empty strings. Objects, which might contain `answer` or `isCorrect` metadata, fail closed rather than reaching the student API.
- Public courses priced above zero are **not** enough to authorize assessment access. Start/catalog now require course creator access or an active enrollment for paid courses. Free public courses remain accessible to authenticated learners.
- These are source safeguards, not proof that every other endpoint is answer-free. Audit legacy course export, instructor/admin content review, caches, and study-type generation before enabling the pilot.
- New unit and structural regression tests cover option-object leakage and the paid-course access condition.

## 9. Attempt-start throttling
- An authenticated student is rate limited through the existing `assignment` limiter before an attempt record is inserted; excess requests receive HTTP 429 and a `Retry-After` header.
- The limiter is **in-memory only**. Distributed production limits, per-course attempt caps and atomic database enforcement remain mandatory before enabling the feature for commercial use.

## 10. Legacy page transition (feature gated)
- With trusted mode enabled, Clerk-protected requests to `/course/:courseId/quiz`, `/course/:courseId/mcq`, and `/course/:courseId/manual-quiz` redirect to the isolated `trusted-quiz` pilot through server-side middleware. With the flag disabled, original pages remain untouched.
- This prevents those three old pages from using their local answer-key grading logic after pilot activation, but **does not prove absence of answer keys in other endpoints**. Audit exports, manually generated questions, instructor interfaces, any API that returns `studyTypeContent`, and any alternate results-writing routes.
- A global redirect means some legacy UX (chapter completion, MCQ progress, quiz timer) is temporarily replaced rather than fully reproduced. Restore and validate these workflows through trusted APIs before broad rollout.

## 11. Reliable adaptive projection requirement
- The first implementation attempted to update `adaptivePerformance` immediately after the attempt was marked submitted. That was unsafe: if the projection succeeded but the sync-marker update failed, retrying projection could count the same attempt twice.
- Trusted submission now persists the authoritative grade **once** and leaves `adaptiveSyncStatus = pending`. It does not directly increment adaptive metrics.
- Before enabling adaptive learning on the verified dataset, create an attempt-ID idempotent projection ledger, with a uniqueness constraint and a recovery queue, and verify crash/retry behavior against isolated PostgreSQL. Until then, the pilot demonstrates server-grading, not end-to-end verified adaptive updates.

## 12. Deterministic verified-performance read model
- `lib/verifiedAssessmentSummary.js` derives assessment-level attempts, average score, mastery labels, and last submission time from server-verified, completed attempt records. Duplicate input IDs are ignored. No mutable counters are incremented by this function.
- `GET /api/assessments/trusted/performance?courseId=...` is authenticated, self-scoped and read-only. It returns a bounded window of the latest 500 verified attempts, including a `truncated` indicator if older attempts were excluded. It does not return answers, answer keys or unverified legacy grades.
- The isolated trusted quiz pilot displays the summary after a successful server-grade submission. This is a temporary verified read model and **not** a completed, durable adaptive-learning synchronization worker.
- The bounded window is for student UX only, not a complete research dataset. A consent-controlled, paginated export and an attempt-ID-idempotent materialization mechanism are still needed before training ML models or relying on globally complete trends.

## 13. Idempotent verified projection ledger (implemented in source, OFF)
- New proposed table `verifiedAssessmentProjection` uses **attemptId as its primary key**. Proposed non-destructive migration: `drizzle/phase1_verified_assessment_projection.sql`; not executed against any database.
- A super-admin-only, manually invoked `POST /api/admin/assessments/reconcile` processes up to 25 pending, server-verified submissions. Requires both `TRUSTED_ASSESSMENTS_ENABLED=true` and `TRUSTED_ASSESSMENT_SYNC_ENABLED=true`.
- `INSERT ... SELECT` rechecks submitted/server-verified assessment status in PostgreSQL. `ON CONFLICT ("attemptId") DO NOTHING` prevents duplicate projection rows even with concurrent retry attempts.
- Before changing the source record's marker to `ledgered`, the server compares the persisted projection with the authoritative attempt (learner, course, assessment, score and timestamp). An existing conflicting projection is never silently accepted.
- Insertion and marking are separate operations by design: interruption after insertion leaves a pending record that can safely be retried. Failed/conflicting attempts remain pending and are counted in the endpoint response.
- **This is a durable verified projection ledger, not complete adaptiveDifficulty synchronization**: legacy adaptive counters and predictive model parameters are not modified. A future projection should compute knowledge-state from ledger records or use an atomic attempt-ID ledger with aggregation and unique constraints.
- The endpoint is not scheduled and has not been run. Enable only in an isolated database with approved migrations, run concurrent request tests, crash/retry tests, tenant access checks and review logs before scheduling it.

## 14. Ledger integrity and accurate concurrent reconciliation
- The ledger schema and planned SQL now define `attemptId` as a foreign key to `trustedAssessmentAttempts.id` with `ON DELETE RESTRICT`, preventing an orphan ledger row or silent deletion of a projected attempt. This is **proposed only**, not applied to Neon.
- After inserting or finding the unique ledger entry, reconciliation compares the ledger against the fetched attempt and then executes a **conditional PostgreSQL UPDATE with EXISTS** that rechecks the current canonical attempt's learner, course, assessment, score, and submission timestamp against the committed projection row.
- Only the request that actually transitions `pending → ledgered` receives a successful `RETURNING` row and increments the `ledgered` count. Concurrent requests that find already-transitioned or mismatched records are counted as unresolved instead of claiming another successful transition.
- This protects the marker from stale application reads, but is **not a substitute for real concurrent PostgreSQL integration testing**. Before activation, simulate two workers, a crash between insertion/marker update, failed network requests, and changed/mismatched projection content against an isolated Neon database.

## 15. Opt-in isolated PostgreSQL concurrency integration suite
- Added `tests/trustedAssessment.postgres.integration.mjs`. This file **does not run in `npm test`**; normal CI only checks its syntax. No database was accessed during development.
- Only run against a **separate disposable Neon PostgreSQL test branch or database** with an explicit `ASSESSMENT_TEST_DATABASE_URL`, `ASSESSMENT_TEST_DATABASE_HOST` (must equal the parsed URL host) and `ASSESSMENT_TEST_DATABASE_ACK=ISOLATED_NONPRODUCTION`.
- If `DATABASE_URL` exists and exactly matches the test URL, the integration test will skip. Do not assume this check identifies every production connection; independently confirm the selected host/database is nonproduction and contains no customer records.
- The test creates a cryptographically random isolated schema, exercises simultaneous one-time INSERT/UPDATE logic, retry after a simulated interruption, ledger score conflicts, restrictive foreign keys and student-scoped selects, then drops that schema in a `finally` block.
- This is a **SQL integration rehearsal of the projection contract**, not a fully deployed Next.js API/Clerk E2E test and not a complete assessment-gradebook test. A later stage must verify route authentication and side effects in a dedicated staging environment.
- To execute manually from an authorized disposable test database, set the three test-only environment variables locally and run:
  `node --test tests/trustedAssessment.postgres.integration.mjs`
- A successful result is not release approval; stage-only migration, real API integration, audit of all legacy grade writers, and approval are still needed.

- Additional fail-closed protection: if the usual `DATABASE_URL` is present, the integration suite rejects a test URL with the same hostname, even when credentials or query strings differ. This is a defense in depth check, not a substitute for independently checking the target environment.

## 16. SQL rehearsal for submission replay, isolation and expiry
- The opt-in SQL integration suite now also creates started attempts and exercises **four concurrent, authenticated-learner-equivalent update claims** against the same attempt. The expected outcome is exactly one successful `started → submitted` transition.
- It separately asserts that an attempt cannot be resubmitted, that a different learner's email cannot claim the attempt, and that an already-expired attempt cannot be submitted.
- These are SQL predicate tests in a disposable schema, not Clerk-backed HTTP authentication tests. Independent integration tests must still validate actual session binding and server-side grade calculation before release.
- Normal CI checks the test source but does not connect to PostgreSQL or execute these database assertions. Running the suite requires separately authorized non-production credentials and explicit confirmation of isolation.

## 17. Disposable PostgreSQL service in GitHub Actions
- The normal security workflow now includes an **ephemeral PostgreSQL 16 service** with fixed, nonproduction CI-only credentials and a separate `assessment_ci` database. It does not use a Neon connection or the application's `DATABASE_URL`.
- `tests/assessment_postgres_ci.py` refuses execution unless it sees the expected GitHub Actions marker, loopback `PGHOST=127.0.0.1`, fixed CI database/user, and explicit `ASSESSMENT_PG_CI_ACK=EPHEMERAL_LOCALHOST_ONLY`. It also refuses execution if application database URL environment variables are supplied.
- It creates a randomly named schema, applies the **actual two proposed SQL migration scripts**, checks parallel grading and ledger claims, student ownership, expiration, duplicate retries, marker integrity, restrictive foreign keys and transaction rollback, and drops the temporary schema.
- These tests are executable on GitHub-hosted disposable PostgreSQL. A failure in CI must be corrected before claiming they passed. The suite remains a **database contract test**, not a live Neon verification or actual Clerk-authenticated browser/API E2E test.
- The student progress endpoint now preserves existing score maps and final score when trusted mode is enabled, rather than accepting changes from browser-supplied Quiz/MCQ/assignment grade maps. This maintains legacy data without representing it as verified. A trusted gradebook projection and course completion policy still require design and end-to-end validation.

## 18. Student gradebook provenance overlay (source committed, feature OFF)
- When `TRUSTED_ASSESSMENTS_ENABLED=true`, `GET /api/grades/student` now queries only the authenticated student's completed, server-verified attempts for each existing course progress record and returns `verifiedQuizAverage`, `verifiedQuizAttemptCount`, `verifiedQuizWindowTruncated`, and `gradeProvenance`.
- The gradebook currently retains existing legacy quiz/assignment displays for compatibility, but sets `resultStatus = Pending Verification` in trusted mode. It does **not** award official pass/certificate status from unverified grade maps.
- The verified summary is bounded to the newest 500 attempts per course. This is not a complete final grade, not an instructor-reviewed assignment score and not the official certificate eligibility engine.
- The legacy `student-progress` POST preserves stored grade fields in trusted mode, ignoring browser-supplied grade changes while allowing note/activity progress. Other completion/certificate write endpoints require further review.
- A safe final gradebook will need server-verified quiz weighting, trusted assignment rubrics, course policy versions and a full authorization/audit review. Do not treat legacy rank/final-grade or certificates as research-quality training labels.

## 19. Instructor gradebook and certificate issuance release gate
- The instructor gradebook endpoint now returns a **separate, student-scoped verified quiz overlay** in trusted mode, alongside explicitly labeled legacy grade fields. It requires ownership of the requested course and selects only completed, server-verified attempts, bounded to 500 recent entries per student.
- The admin gradebook now reports `Pending Verification` for certificate eligibility and sets `isEligibleForCertificate=false` when trusted assessments are enabled. Legacy quiz and assignment maps cannot establish certificate eligibility.
- Both certificate POST endpoints (`/api/generate-certificate` and `/api/student/generate-certificate`) now **fail closed with HTTP 409** in trusted mode, even when a historical progress record appears to qualify. Existing certificate reads are unaffected.
- Official certificate issuance requires complete, versioned server-verified rules for every required Quiz/MCQ, instructor-reviewed assignments, course completion, unique certificate generation and revocation audit. These are not yet implemented; blocking issuance is intentional until the rules and end-to-end tests are approved.
- Legacy gradebook `finalGrade`, class ranking, and assignment-score fields remain historical/unverified even when a verified quiz overlay is returned. No official verdict, ML training label, or new certificate may rely on those fields.

## 20. Versioned, read-only course assessment policy
- Added `lib/trustedCoursePolicy.js` (`trusted-course-v1`) and authenticated `GET /api/assessments/trusted/course-policy?courseId=...` behind `TRUSTED_ASSESSMENTS_ENABLED` (OFF). The endpoint verifies the user's access to the requested course and queries only their own server-verified attempts and assignment submissions.
- The policy requires each **ready** Quiz/MCQ content record to have a passing **latest** server-verified attempt (default threshold 60%), preventing older passing attempts from overriding a newer failure. No ready assessments, duplicate IDs, invalid scores or truncated input all fail closed.
- The policy considers each course assignment only when a score of at least 60 has a `ManuallyGraded` submission with non-AI grader identity and review timestamps. AI-only submissions and unreviewed submissions remain pending.
- This is **not official certificate eligibility**: `eligibleForCertificate=false` and `certificateIssuanceEnabled=false` are always returned. Assessment completion becomes merely `assessment_requirements_met`, pending trusted chapter completion evidence, assignment-review authorization audit, course-policy approval and certificate issuance security.
- Limits are explicit (200 assessments, 200 assignments, 1000 attempts and 1000 submissions). Incomplete result sets fail closed; no certificate, grade, progress record, or ML metric is modified.
- Remaining P0 risks: audit assignment-review writers to verify human reviewer identity cannot be spoofed; require a versioned frozen exam catalog and course/chapter completion policy before using this evaluator for official awards. The current ready-content catalog may change during a student's enrollment.

## 21. Read-only course policy and strict human-grade provenance
- Added `lib/trustedCoursePolicy.js` and the student-scoped `GET /api/assessments/trusted/course-policy` route behind the existing OFF trusted-assessment flag. The policy is `trusted-course-v1` and requires every ready Quiz/MCQ to have a passing **latest** server-verified attempt. It is fail-closed for no ready assessment, malformed/duplicate catalog IDs, truncated results, or missing/failed grades.
- Course assignment requirements are derived from `courseAssignments`, not browser progress maps. Only `ManuallyGraded` submissions with bounded integer scores, review timestamps, matching human grader/reviewer identifiers and non-AI provenance can meet the provisional assignment condition.
- The result is read-only: it explicitly returns `eligibleForCertificate=false`, `certificateIssuanceEnabled=false`, and `officialGrade=null`. Even complete assessment evidence yields **assessment_requirements_met** rather than an issued award until server-trusted chapter completion, full course-policy versioning and certificate transaction controls are implemented.
- Identified the two authenticated admin manual grading endpoints using permissive `parseInt(newScore)`. Introduced `parseManualGrade` to accept only an actual integer from 0 to 100, preventing strings, partial text, negative or out-of-range values. Both admin grading writers now reject requests without an admin reviewer email.
- Regression tests cover fail-closed policy behavior, retake precedence, AI-only grades, missing reviews, invalid grade values and reviewer identity mismatch. CI syntax checks added.
- **Not yet release-ready:** confirm student-visible course policy access in actual Clerk E2E; audit additional writers and whether reviewer authorization is correct for each course; freeze required assessment/assignment catalogs and implement verifiable chapter-completion events before certificates can be enabled.

## 22. Admin manual grade input alignment
- All three existing admin manual-grading forms now require a complete whole-number string from 0 through 100 before converting it to a numeric JSON score. The server separately enforces integer-only 0–100 grades and authenticated reviewer identity.
- This prevents permissive `parseInt` coercion such as `75abc → 75`, rejects fractional/out-of-range values, and permits a legitimate grade of zero.
- The current policy still does not grant automatic certificates; successful verified assessments only establish provisional assessment completion pending course and chapter completion verification.
