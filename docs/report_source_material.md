# Gemini-LMS — Final Report Source Material & System Knowledge Base (v2)

> Master reference for writing the **final-year dissertation** and **presentation**.
> Compiled from: (a) a direct code-level review of the system, (b) the University of
> Moratuwa report guide, (c) the original project proposal, (d) the interim report, and
> (e) real UI screenshots. Code-verified figures are safe to cite. Where documents
> disagree with the built system, the **built system is the truth** and the gap is flagged
> as "plan → built evolution" to be reconciled in the report.

---

## 0. Submission metadata  ⚠️ CONFIRM IDENTITY BEFORE WRITING

| Field | Value (from documents) |
|---|---|
| Project title (proposal) | "Artificial Intelligence in Learning Management System (LMS)" |
| Project title (interim) | "Artificial Intelligence-Powered Learning Management System (Gemini AI – LMS)" |
| Candidate name (proposal/interim) | **M.S. Fathima Sajeefa** ("MSF Sajeefa"; certificate signature "M.S.F. Sajeefa, Founder of Gemini LMS") |
| Index number | **E2240212** |
| Degree | Bachelor of Information Technology (External) in IT |
| Institution | Faculty of Information Technology, University of Moratuwa, Sri Lanka |
| Supervisor | Mr. Menon Velayutahan |
| Unit | Centre for Open & Distance Learning (CODL) |
| Interim declaration date | 24/08/2025 · Proposal submitted 7 July 2025 |
| Live deployment | https://gemini-lms.vercel.app |
| Repo | github.com/Rashid-RG/gemini-lms |

> ⚠️ **Identity inconsistency to resolve:** the proposal/interim/certificate are under
> **M.S. Fathima Sajeefa, E2240212**, but the GitHub account is **Rashid-RG**, the working
> session email is **e2145286@bit.uom.lk**, and the sample certificate recipient/test user is
> **"Mohammed Rashid" (rashid001mrm@gmail.com)**. The dissertation name, index number, and
> declaration MUST match the official enrolment. **Confirm which name + index go on the final
> report before drafting the cover/title/declaration pages.**

---

## 1. One-line description (for abstract / intro)

An AI-native Learning Management System that turns a topic or PDF into a structured
multi-chapter course (notes, curated YouTube lectures, quizzes, flashcards), then supports
the learner with adaptive difficulty, SM-2 spaced-repetition review, a context-locked
voice/chat tutor, a multi-language code playground, automated grading, gamification, and
QR-verifiable certificates — with a full admin/tutor back office. New users get 5 free
credits; continued access is via a subscription/credit model.

---

## 2. UNIVERSITY OF MORATUWA — report requirements (authoritative; follow exactly)

### 2.1 Mandatory structure (software-implementation project)
Pre-pages (Roman numerals, centered headings): **Declaration → Dedication (optional) →
Acknowledgements → Abstract (one page) → Table of Contents → List of Figures → List of Tables.**
Title page has **no** page number.

Main body (Arabic numerals), each chapter **starts with an "Introduction" and ends with a
"Summary"**:
1. **Introduction** — aim(s)/goal(s), beneficiaries/audience, scope, approach, assumptions, summary of outcomes.
2. **Background / Literature Review** — wider context, problem, stakeholders, theory, constraints, existing solutions and *why they are insufficient*, methods/tools; **ends with explicit research questions**.
3. **Specification & Design (Methodology)** — requirements (what), then design (how) from multiple viewpoints (business model, UI, dynamic behaviour, data flow, data types, algorithms, static architecture). **Justify design choices.** Use ER/UML/state diagrams heavily.
4. **Implementation** — finer detail down to code level; describe only *critical/interesting/novel* code (no large dumps; full source in appendix); describe problems encountered and how solved.
5. **Results and Evaluation** — how you demonstrated it works; summaries of critical tests; reasoning behind the tests; critically evaluate strengths/weaknesses; critical appraisal of methodology/tools.
6. **Future Work** — unrealized ideas; a starting point for someone continuing the work.
7. **Conclusions** — restate aims + main results; no new material; honest and objective.
8. **Reflection** — "double-loop learning": impact on the assumptions/concepts used to make decisions, transferable learning.

Support: Glossary, Table of Abbreviations (optional), **Appendices**, **References**.

### 2.2 Appendices expected
SRS · Use Case Diagrams · Activity Diagrams · ERD · Software test plan/procedure/reports ·
User Manual. (Most already exist in the interim report — see §5.)

### 2.3 Formatting rules (exact)
- Font **Times New Roman**; chapter headings **18pt bold**, section/subsection headings **12pt bold**.
- **1.5 line spacing** in body and references (single spacing allowed for footnotes, quotes, table/figure captions).
- Margins: **left 1.5"**, top/bottom/right **1"**. A4, single side, laser print, no colour in print.
- All tables/figures captioned, numbered, and **cited in text**.
- Page numbers centered at bottom; Roman for pre-pages, Arabic for body.
- **Referencing: IEEE or APA** (UoM standards). IEEE = numbered square brackets, references in alphabetical order by first author, every reference cited in text.
- **Plagiarism: must be < 10% similarity index** (automated detection).
- Cover page (16pt bold title, name, index, faculty, university, Month Year); declaration sample provided in guide Appendix D; final binding dark blue with gold lettering (3 hard-bound copies).
- Abstract: one page; problem, approach (users/input/output/process), analysis & design, implementation, evaluation, conclusion; **no citations/abbreviations**.

---

## 3. Verified system facts (safe to cite — from the actual code)

| Metric | Value | Source |
|---|---|---|
| Application code | ~71,000 lines | `wc -l` over source dirs |
| Database tables | 43 | `configs/schema.js` (`pgTable` count) |
| API route handlers | 116 | `app/api/**/route.js` |
| User roles | 4 (`super_admin`, `admin`, `tutor`, `student`) | `middleware.js`, admin auth |
| Code playground runtimes | 9 (Python, JS, TS, C++, Java, Rust, Go, PHP, Ruby) | `CodePlayground`, screenshot |
| Unit tests | 51, all passing (`npm test`) | `tests/` (added in review) |

### Tech stack (as actually built — final state)
- **Framework:** Next.js 15 (App Router, Server Actions, Route Handlers), JavaScript/JSX.
- **Auth:** Clerk (students) **+** custom `admins` table (bcrypt + JWT) with a role picker
  (Super Admin / Admin / Tutor) on a dedicated Admin Portal.
- **Database:** Neon serverless PostgreSQL via **Drizzle ORM** (`neon-http`, connection pooling).
- **AI:** Google Gemini (`@google/generative-ai`) + multi-key rotation (`lib/apiKeyRotation.js`).
- **Background jobs:** Inngest (course generation split-worker, assignment grading, reminders).
- **Payments:** **PayHere** gateway (initiate + webhook notify) + records + verification.
- **Certificates:** `html2pdf.js` canvas + `qrcode` QR; public verify route; founder signature.
- **UI:** Tailwind + shadcn/ui (Radix), framer-motion, recharts, Monaco editor, react-query.
- **Email:** Nodemailer (Gmail SMTP) + Resend; React Email templates.

---

## 4. ⚠️ Plan → Built evolution (reconcile these in the report; do NOT describe the old plan as current)

The proposal/interim describe an earlier design. The **built** system differs. The guide
explicitly allows describing design evolution — frame these as justified decisions, but make
sure the final report's "current system" sections describe what was actually built.

| Aspect | Proposal / Interim (plan) | **Built system (truth)** |
|---|---|---|
| Backend/CMS | **Strapi CMS** for content + APIs | **Next.js API routes + Drizzle ORM** (no Strapi) |
| Payments | **OnePay** | **PayHere** |
| Spaced repetition rating | 0/1/2 scale, 6-day 2nd interval (notes) | **1–5 scale, 3-day 2nd interval** (code) |
| Scope | MVP, 5–7 objectives | Much broader (43 tables; gradebook, tutor system, certificates, gamification, voice tutor) |

Recommended report framing: "The initial design proposed Strapi/OnePay; during implementation
these were replaced by Next.js API routes + Drizzle ORM and PayHere respectively, for [reasons:
tighter type-safety, serverless fit, regional payment support]." Then describe the final stack.

---

## 5. What the proposal & interim already give you (reuse — don't rewrite from scratch)

### From the PROPOSAL (good for Intro + Background)
- **Aim:** transform the LMS from static content delivery into an intelligent platform that
  actively contributes to teaching/learning via Gemini AI.
- **7 objectives:** (1) AI-generated course content; (2) personalized learning paths;
  (3) interactive AI quizzes + instant feedback; (4) secure user management + payments;
  (5) student/instructor dashboards & analytics; (6) scalability/performance (serverless);
  (7) compliance & security (access control, encryption, human-in-the-loop content approval).
- **Related work (ready-made literature review):** Canvas + **Gemini LTI** (Instructure×Google,
  2025); **D2L Brightspace "Lumi"** assistant (2024) + Creator+; **Blackboard/Anthology AI
  Design Assistant** (2023, multilingual, >1M items); **Moodle AI** + MoodleSense, SAMCares,
  CogniLMS. Each is compared and its deficiency vs Gemini-LMS noted.

### From the INTERIM REPORT (good for Background + Design + Appendices)
- **Literature review** with figures: Moodle, Google Classroom, Canvas, Blackboard Learn,
  D2L Brightspace (Lumi) + **LMS comparison table** + **comparison bar chart** + "gaps in
  existing systems" + "how Gemini-LMS bridges the gaps".
- **Methodology:** **Unified Software Development Process (USDP)**, iterative with feedback
  integration; development phases; QA; test & deployment plan.
- **Diagrams already produced (reuse as appendices/figures):** UI flow diagram; Use Case
  (overall + Payment/Subscription + Authentication + AI features); Activity diagrams (AI study
  material generation, assessment & progress, enrollment, payment); Sequence diagrams
  (subscription/billing, authentication/Clerk); **ER diagram (system-level) + simplified ERD**;
  Gantt chart; SRS.
  > Note: existing diagrams show OnePay/Strapi — **update them to PayHere / Drizzle** before reuse.

---

## 6. Core algorithms (exact logic — verify before writing)

### 6.1 Spaced repetition — SM-2 (`lib/spacedRepetition.js`, extracted + unit-tested)
Default `repetitions=0, interval=1, easeFactor=2.5`. Rating in code: `1=Again, 3=Hard, 4=Good,
5=Easy`. On Again: reset (`reps=0, interval=1`). Else interval = 1 (1st), 3 (2nd), then
`round(interval×EF)`; `reps++`; `EF = max(1.3, EF + (0.1 − (5−score)(0.08 + (5−score)·0.02)))`.
⚠️ Align report to code (1–5 scale, 3-day 2nd interval).

### 6.2 Grading engine (`lib/gradingEngine.js`)
6 question types (MCQ, true/false, short-answer keyword/partial, fill-blank multi-answer,
matching partial, essay→manual/AI review). `gradeQuiz` averages auto-graded items, excludes
essays, pass = 60%. Plus `calculateProgress` (chapters 50% / quizzes 50%) and
`shouldIssueCertificate` (100% completion AND average ≥ min).

### 6.3 Adaptive difficulty (`lib/adaptiveDifficulty.js`)
Mastery tiers (novice→expert), `recommendDifficulty` (Easy/Medium/Hard up/down), weak-topic
detection feeding spaced repetition, running-average metrics, mastery summary.

---

## 7. Evaluation evidence (Results & Evaluation chapter)

1. **Automated test suite — 51 tests, 100% pass** (`npm test`, Node built-in runner, zero deps).
   Covers grading (all 6 types, partial credit, pass/fail, certificate eligibility), adaptive
   difficulty, and SM-2 (interval progression, reset, EF floor, exact formula). Include a
   screenshot of passing output as a figure.
2. **Refactor equivalence proof** — old vs new SM-2 across **1,344** combinations → **0**
   differences (regression-safety evidence).
3. **Security audit** — `NEXT_PUBLIC_*` secrets are server-side only (not bundled to browser);
   recommend renaming to `GEMINI_API_KEY` / `DATABASE_URL`.
4. **Still to add (raises grade):** small **user study** (5–10 testers + questionnaire) and the
   **LMS comparison table/bar chart** already drafted in the interim report.

---

## 8. Honest critical appraisal (write in report — earns marks)
Strengths: coherent event-driven serverless architecture; type-safe data layer; clean, modular,
documented core logic; broad delivered feature set; real payments/auth/certificates/background jobs.
Gaps / future work: testing & CI (starter suite now exists — extend + add GitHub Actions);
distributed rate limiting (in-memory `Map` → Redis/Upstash); auth consolidation (Clerk + custom
admin = two surfaces); observability (Sentry + alerting); API resiliency (Gemini/YouTube fallback);
feature focus (defend 3–4 core contributions deeply).

---

## 9. Honest positioning (viva / conclusion)
**Above a typical final-year project; a production-*grade* prototype / strong MVP — not yet a
fully hardened production SaaS.** Right architecture + working features, but lacks operational
hardening (tests+CI, observability, distributed limiting, unified auth, load testing, backups).
Viva framing: *"Built to production-grade architecture standards; I can state the exact steps to
take it to production."* Do **not** claim "production-ready SaaS" or self-award scores.

---

## 10. UI screenshot inventory (figures for the report)
Two zips supplied (uploads): **user-side (~64 images + certificate PNG + gradebook PDF)** and
**admin-side (~37 images + gradebook PDF)**. Verified samples:
- **Landing page** — "Why Choose Gemini LMS" four pillars (AI-Generated Content, Smart Notes,
  Flashcards, Quizzes & Tests) + "How It Works". Live at gemini-lms.vercel.app.
- **Admin Portal** — role picker (Super Admin / Admin / Tutor), email+password, "secure admin-only area".
- **Code Playground** — Monaco editor, 9 language tabs, Console + "AI Coach", Run Code; header
  shows streak + Badges (gamification); user "Mohammed Rashid".
- **Certificate** — "Certificate of Completion", recipient name, course, "Final Evaluation Index",
  QR "Scan to verify", Certificate ID (e.g. CERT-54F128CE), founder signature "M.S.F. Sajeefa".
- Interim report figure list also covers: Login/Signup, Student Dashboard, Instructor Dashboard,
  Course Details. (Map specific timestamped PNGs to chapters when drafting.)

> When writing, request specific screenshots by area and I'll insert them as captioned, numbered figures.

---

## 11. Mapping to report chapters
- **Ch.1 Introduction** — §1 + proposal aim/objectives (§5); cite §3 metrics for ambition.
- **Ch.2 Background** — proposal/interim related work (Canvas, D2L, Blackboard, Moodle) + comparison table/chart + gaps; end with research questions.
- **Ch.3 Specification & Design** — requirements (proposal §3.2/3.3); RBAC (4 roles); architecture diagram; 43-table ERD (update OnePay→PayHere, Strapi→Drizzle); USDP methodology.
- **Ch.4 Implementation** — §6 algorithms; Inngest split-worker rationale (Vercel timeout); certificate canvas pipeline; plan→built decisions (§4).
- **Ch.5 Results & Evaluation** — §7 evidence (tests screenshot, equivalence proof, security audit) + user study + comparison.
- **Ch.6 Future Work** — §8 gaps.
- **Ch.7 Conclusions** — §9 positioning.
- **Ch.8 Reflection** — double-loop learning: e.g. the Strapi→Drizzle and OnePay→PayHere decisions and what they taught about evaluating tools.
- **Appendices** — SRS, Use Case/Activity/Sequence diagrams, ERD, test plan + the 51-test suite, user manual (all largely exist in interim report).

---

## 12. Pre-submission checklist
- [ ] **Confirm candidate name + index** for cover/title/declaration (Sajeefa E2240212 vs Rashid — see §0).
- [ ] Reconcile plan→built changes (Strapi→Drizzle, OnePay→PayHere); update diagrams accordingly.
- [ ] Fix SM-2 description to match code (1–5 scale, 3-day 2nd interval).
- [ ] Apply UoM formatting (Times New Roman, 1.5 spacing, margins, 18/12pt headings, IEEE/APA refs, Intro+Summary per chapter).
- [ ] Keep similarity < 10%.
- [ ] Rename `NEXT_PUBLIC_` secrets; confirm `.env.local` gitignored (it is).
- [ ] **Rotate the GitHub PAT** (stored plaintext in git remote URL).
- [ ] Run `npm test`; capture screenshot for evaluation chapter.
- [ ] Add user-evaluation results + reuse interim comparison table/bar chart.
- [ ] Remove self-awarded scores; replace with evidence.
- [ ] Push committed changes (`git push origin main`); decide on the ~250 CRLF line-ending churn.
