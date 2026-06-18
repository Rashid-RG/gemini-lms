<div align="center">
  <img src="public/logo.svg" alt="Gemini LMS Logo" width="100" />
  <h1>🎓 GEMINI LMS</h1>
  <p><strong>A Next-Generation, AI-Powered Learning Management System</strong></p>
</div>

---

Gemini LMS is a robust, production-ready Learning Management System that uses AI to dynamically generate courses, grade assignments, conduct voice-based tutoring, and adaptively track student progress using scientifically backed spaced repetition (SM-2). 

It features a comprehensive multi-tier role system (Student, Tutor, Admin, Super Admin), background job orchestration for heavy processing, and an intelligent token-based credit economy.

---

## 🌟 Key Features

### 👨‍🎓 For Students
* **AI Course Generation**: Upload a topic or PDF, and the system dynamically generates a full course with chapters, YouTube video curation, and flashcards.
* **Spaced Repetition (SM-2)**: Scientifically-backed flashcard system that adapts to how quickly you learn.
* **Intelligent Grader & Quizzes**: Take MCQ quizzes and written assignments. The AI grades written assignments with line-by-line feedback.
* **Live AI Chat & Voice Tutor**: A floating context-aware ChatBot and Voice Tutor that answer questions directly related to your current course material.
* **Code Playground**: Built-in Monaco code editor supporting 9 languages (Python, JS, TS, C++, Java, Rust, Go, PHP, Ruby) with isolated runtime execution.
* **Gamification**: Earn credits, daily learning streaks, and 8 unique achievement badges.
* **Premium Certificates**: Downloadable, QR-verifiable, beautifully designed academic certificates with founder signatures upon course completion.
* **Dark Mode**: Fully responsive UI with a seamless Dark/Light mode toggle.

### 🛡️ For Admins & Tutors
* **Role-Based Access Control**: Secure routes separated for `super_admin`, `admin`, and `tutor`.
* **Deep Analytics**: Course tracking, revenue/credit metrics, and student activity logs.
* **Review Requests & Assignment Unlocking**: Manually review edge-case student grades and unlock retries.
* **Mass Communication**: Send platform-wide announcements or bulk-email filtered groups of students via Resend.

---

## 🛠️ Tech Stack

This project is built using the most modern, edge-ready React framework tools available:

* **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
* **Authentication**: [Clerk](https://clerk.dev/)
* **Database**: Serverless Postgres via [NeonDB](https://neon.tech/)
* **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
* **AI Engine**: Google [Gemini API](https://ai.google.dev/) (`@google/generative-ai`)
* **Background Jobs**: [Inngest](https://www.inngest.com/)
* **Emails**: [Resend](https://resend.com/) + React Email
* **Styling**: Tailwind CSS + Shadcn UI (Radix)
* **Code Editor**: Monaco Editor (`@monaco-editor/react`)

---

## 🏗️ System Architecture

1. **Frontend**: Next.js Server Components for SEO/Speed + Client Components for interactivity. Global state managed via React Context (`CourseCountContext`). Data fetching powered by Axios + React Query.
2. **Backend**: Next.js Route Handlers (`app/api/`) secured by Clerk's `auth()`.
3. **Async Processing**: Heavy AI generation, grading tasks, badge syncing, and mass emails are pushed to Inngest to prevent Vercel 15s timeout limits and ensure robust retry logic.
4. **Database**: Drizzle ORM ensures end-to-end type safety directly into our Serverless PostgreSQL instance.

---

## 🚀 Getting Started

### 1. Prerequisites
Ensure you have **Node.js (v20+)** installed.

### 2. Clone & Install
```bash
git clone https://github.com/Rashid-RG/gemini-lms.git
cd gemini-lms
npm install
```

### 3. Environment Variables
Create a `.env.local` file in the root directory. You will need to provision API keys for the following services:

```env
# CLERK AUTHENTICATION
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# DATABASE (NEON POSTGRES)
NEXT_PUBLIC_DATABASE_URL=postgresql://...

# GOOGLE GEMINI AI
NEXT_PUBLIC_GEMINI_API_KEY=AIza...

# INNGEST (BACKGROUND JOBS)
INNGEST_EVENT_KEY=local
INNGEST_SIGNING_KEY=local

# RESEND (EMAILS)
RESEND_API_KEY=re_...

# ADMIN CONTROL
NEXT_PUBLIC_ADMIN_EMAILS=admin@yourdomain.com
NEXT_PUBLIC_HOST_NAME=http://localhost:3000
```

### 4. Database Setup
Push the Drizzle schema to your Neon database:
```bash
npx drizzle-kit push
```

### 5. Run the Application
You will need to run the Next.js dev server and the Inngest local dev server simultaneously.

**Terminal 1: Next.js**
```bash
npm run dev
```

**Terminal 2: Inngest**
```bash
npx inngest-cli@latest dev
```

The application will be running at `http://localhost:3000` and the Inngest Dev UI will be at `http://localhost:8288`.

---

## 📄 Documentation & Workflows

### Background Jobs (Inngest)
All functions that might exceed standard API limits (like generating a 10-chapter course using Gemini) are sent to `app/api/inngest/route.js`. The Inngest client (`configs/inngest.js`) manages retries and concurrency.

### Spaced Repetition (Flashcards)
The flashcard component calculates the next review date using a variation of the SuperMemo-2 (SM-2) algorithm based on user self-evaluation (Easy, Good, Hard).

### PDF Certificate Generation
Certificates use `html2pdf.js` alongside standard HTML5 Canvas. We explicitly lock the render thread using `document.fonts.ready` to ensure high-end Google Fonts (like *Cinzel* and *Great Vibes*) load before the canvas converts to a PNG/PDF blob.

---

## 🤝 Contributing
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request
