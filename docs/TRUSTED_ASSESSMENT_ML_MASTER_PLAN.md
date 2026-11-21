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
