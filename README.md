<p align="center">
  <a href="https://github.com/Rashid-RG/gemini-lms" target="_blank" rel="noopener noreferrer">
    <img src="https://raw.githubusercontent.com/Rashid-RG/gemini-lms/main/public/logo.svg" alt="Gemini LMS Logo" width="120" style="animation: float 4s ease-in-out infinite;" />
  </a>
</p>

<h1 align="center">🎓 Gemini LMS</h1>
<p align="center">
  <img src="https://raw.githubusercontent.com/Rashid-RG/gemini-lms/main/public/typing-header.svg" alt="Gemini LMS 3.0 — AI-First SaaS Platform" width="550" />
</p>

<div align="center">
  <p align="center">
    Enabling custom course creation, voice-based tutoring, spaced-repetition testing, and automated grading.
  </p>

  [![Framework - Next.js 15](https://img.shields.io/badge/Framework-Next.js%2015-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
  [![Database - Neon Postgres](https://img.shields.io/badge/Database-Neon%20Postgres-00E599?style=for-the-badge&logo=postgresql&logoColor=white)](https://neon.tech/)
  [![AI Core - Google Gemini](https://img.shields.io/badge/AI%20Core-Google%20Gemini-8E75C2?style=for-the-badge&logo=google-gemini&logoColor=white)](https://ai.google.dev/)
  [![Background Jobs - Inngest](https://img.shields.io/badge/Queue-Inngest-FF3E00?style=for-the-badge&logo=inngest&logoColor=white)](https://www.inngest.com/)
  [![Styling - Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind%20CSS-06B6D4?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
  [![License - Proprietary](https://img.shields.io/badge/License-Proprietary-6366F1?style=for-the-badge&logo=read-the-docs&logoColor=white)](./LICENSE)
</div>

<p align="center">
  <sub>Designed & Engineered by <strong>M.S.F. Sajeefa</strong></sub>
</p>

<p align="center">
  <a href="#-premium-saas-feature-suite">Features</a> •
  <a href="#%EF%B8%8F-system-architecture">Architecture</a> •
  <a href="#%EF%B8%8F-tech-stack--services">Tech Stack</a> •
  <a href="#-installation--local-setup">Setup</a> •
  <a href="https://gemini-lms.vercel.app/dashboard/upgrade">Pricing</a> •
  <a href="https://gemini-lms.vercel.app/terms">Terms</a> •
  <a href="https://gemini-lms.vercel.app/privacy">Privacy</a> •
  <a href="https://gemini-lms.vercel.app/refund">Refund Policy</a>
</p>

---

<p align="center">
  <img src="https://raw.githubusercontent.com/Rashid-RG/gemini-lms/main/public/animated-banner.svg" alt="Gemini LMS Banner" width="100%" />
</p>

---

## 🎬 Cinematic Product Launch Trailer
Experience the full interactive product launch trailer directly inside your browser. Featuring an adaptive high-fidelity soundtrack and active real-time AI voiceover synthesis.

<p align="center">
  <video src="https://raw.githubusercontent.com/Rashid-RG/gemini-lms/main/public/launch-video.mp4" width="100%" poster="https://raw.githubusercontent.com/Rashid-RG/gemini-lms/main/public/gemini_lms_banner.png" controls loop>
    Your browser does not support the video tag.
  </video>
</p>

<p align="center">
  <i>💡 To experience the video with interactive features and automatic voiceover:</i><br />
  <a href="https://gemini-lms.vercel.app/trailer"><strong>🚀 Launch Interactive Web-Trailer with Sound</strong></a>
</p>

---

## 🌟 Premium SaaS Feature Suite

<p align="center">
  <img src="https://raw.githubusercontent.com/Rashid-RG/gemini-lms/main/public/features-showcase.svg" alt="Gemini LMS Feature Showcase" width="100%" />
</p>

### 👩‍🎓 Student Core
- ⚡ **AI Course Generator**: Converts raw topics or uploaded PDF files into a structured course complete with curated YouTube lectures, chapters, quizzes, and dynamic flashcards.
- ⏰ **Adaptive Spaced Repetition (SM-2)**: An intelligent review scheduling core based on the SuperMemo-2 algorithm, automatically adapting interval spacing based on student feedback (Easy, Good, Hard).
- 🎙️ **Context-Aware Voice & Chat Tutor**: A context-locked interactive bot that answers questions specifically linked to current course material, supporting natural conversational speech.
- 💻 **Monaco Code Playground**: An isolated web execution container supporting 9 runtimes (Python, JS, TS, C++, Java, Rust, Go, PHP, Ruby) with instant code execution.
- 🏆 **Gamification & Badges**: Earn experience credits, maintain daily study streaks, and unlock 8 unique verifiable achievement badges.
- 📜 **QR-Verifiable Certificates**: Dynamic PDF certificates with secure custom canvas rendering and verified founder signatures, downloadable immediately upon course completion.

### 🛡️ Tutors & Administrators
- 🔑 **Multi-Tier Role Management**: Secure middleware protection filtering layout permissions between `super_admin`, `admin`, `tutor`, and `student` roles.
- 📊 **Advanced Analytics Portal**: Monitor registration velocities, revenue metrics, active credits, and full student activity logs.
- 📧 **Premium Email Composer**: Send stylized HTML announcements or filter users for custom broadcast lists. Features a three-column admin compose UI, live HTML preview, and handwritten executive signature presets sent directly from `geminilmsadmin@gmail.com`.
- 🔓 **Grade Moderation**: Overrides student quiz attempts, locks/unlocks assignment retry limits, and manually adjusts credits.

---

## 🏗️ System Architecture

```mermaid
graph TD
    Client["Browser UI / Monaco Editor"] -->|Clerk JWT Auth| NextApp["Next.js App Router"]
    NextApp -->|Drizzle ORM| NeonDB[(Neon Postgres Database)]
    NextApp -->|Event Push| Inngest["Inngest Background Orchestration"]
    Inngest -->|Job Queue| NextApp
    Inngest -->|Generative Queries| Gemini["Google Gemini AI Core"]
    Inngest -->|Nodemailer SMTP| Gmail["geminilmsadmin@gmail.com Gateway"]
```

### Technical Highlights
1. **Asynchronous Execution**: Next.js limits serverless functions to a 15-second execution budget on Vercel. Heavy AI course generation and written assignment grading are offloaded to **Inngest** queues to bypass Vercel limits and guarantee automatic retries.
2. **Type-Safe Database Access**: Drizzle ORM provides complete TypeScript coverage mapping schemas directly to a serverless Neon PostgreSQL pooler.
3. **Canvas Locking for PDF Generation**: Certificate downloads render standard HTML layouts onto canvas layers via `html2pdf.js`, locking render threads using `document.fonts.ready` to ensure high-end Google fonts load before serializing to PNG/PDF blobs.

---

## 🛠️ Tech Stack & Services

- **Framework**: Next.js 15 (App Router, Server Actions, Route Handlers)
- **Auth**: Clerk (OIDC, Role Metadata sync)
- **Database**: Serverless PostgreSQL via NeonDB
- **ORM**: Drizzle ORM
- **Engine**: Google Gemini AI API (`@google/generative-ai`)
- **Queue**: Inngest Dev Server / Production Cloud
- **SMTP Service**: Nodemailer (Gmail SMTP authentication)
- **Styles**: Tailwind CSS + Shadcn UI + Radix UI
- **Code Editor**: Monaco Web SDK (`@monaco-editor/react`)

---

## 🚀 Installation & Local Setup

### 🛠️ Prerequisites & Environment Setup
1. **Node.js (v20+)** is required to run the development server.
2. **Environment Variables**: Create a `.env.local` file in the root directory and configure the variables (detailed in the accordion below).

### 🚀 Live Interactive CLI Installation
Watch the automatic terminal setup simulator below to see how to download, compile, and boot up the Gemini LMS development environment.

<p align="center">
  <img src="https://raw.githubusercontent.com/Rashid-RG/gemini-lms/main/public/installation-terminal.svg" alt="Gemini LMS Installation Terminal Simulator" width="100%" />
</p>

<details>
  <summary>📋 View Plain Copy-Paste Setup Commands & Env Variables</summary>

  #### 1. Clone the Repository & Install Dependencies
  ```bash
  git clone https://github.com/Rashid-RG/gemini-lms.git
  cd gemini-lms
  npm install
  ```

  #### 2. Environment Variables (`.env.local`)
  ```env
  # CLERK AUTHENTICATION KEYS
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
  CLERK_SECRET_KEY=sk_test_...
  NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
  NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

  # DATABASE CONFIGURATION
  NEXT_PUBLIC_DB_CONNECTION_STRING="postgresql://neondb_owner:YOUR_NEW_PASSWORD@YOUR_NEON_HOST/AI-Study-Material-Gen?sslmode=require&channel_binding=require"

  # GOOGLE GEMINI AI
  NEXT_PUBLIC_GEMINI_API_KEY=AIza...

  # BACKGROUND QUEUE ORCHESTRATION (INNGEST)
  INNGEST_EVENT_KEY=local
  INNGEST_SIGNING_KEY=local
  INNGEST_BASE_URL=http://localhost:8288

  # SMTP CONFIGURATION (GMAIL GATEWAY)
  SMTP_HOST="smtp.gmail.com"
  SMTP_PORT="465"
  SMTP_USER="geminilmsadmin@gmail.com"
  SMTP_PASSWORD="YOUR_GMAIL_APP_PASSWORD"

  # APPLICATION CONFIGURATION
  NEXT_PUBLIC_ADMIN_EMAILS="admin@yourdomain.com,superadmin@yourdomain.com"
  NEXT_PUBLIC_APP_URL="https://gemini-lms.vercel.app"
  NEXT_PUBLIC_BASE_URL="http://localhost:3000"
  ```

  #### 3. Push Database Schema
  ```bash
  npx drizzle-kit push
  ```

  #### 4. Launch Local Development Servers
  **Terminal 1 (Next.js Application)**
  ```bash
  npm run dev
  ```

  **Terminal 2 (Inngest Local GUI)**
  ```bash
  npx inngest-cli@latest dev
  ```

  - **Application**: [http://localhost:3000](http://localhost:3000)
  - **Inngest Dashboard**: [http://localhost:8288](http://localhost:8288)
</details>

---

## 📈 Spaced Repetition Core Logic (SM-2)

The flashcard scheduler implements a custom variation of the **SuperMemo-2 (SM-2)** interval scheduling algorithm. It tracks `easinessFactor` (EF), consecutive successful reviews (`repetitions`), and scheduled review intervals (`interval`):

- **Rating Scale**:
  - `0` (Hard): Incorrect response, require immediate review.
  - `1` (Good): Correct response, normal memory reinforcement.
  - `2` (Easy): Correct response, strong memory retention.

- **Equations**:
  - For correct ratings ($R \ge 1$):
    - If repetitions = 0, interval = 1 day.
    - If repetitions = 1, interval = 6 days.
    - If repetitions > 1, $I(n) = I(n-1) \times EF$ days.
    - $EF_{new} = EF_{old} + (0.1 - (3 - R) \times (0.08 + (3 - R) \times 0.02))$ (bounded to a minimum of 1.3).
  - For incorrect rating ($R = 0$):
    - Repetitions = 0, interval = 1 day.

This guarantees maximum retention efficiency and dynamically minimizes the study volume required for students.

---

## 🤝 Contribution Guidelines
1. Fork the repository on GitHub.
2. Create a clean feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your modifications with clear messages (`git commit -m 'feat: add support for XYZ'`).
4. Push to origin (`git push origin feature/AmazingFeature`).
5. Open a Pull Request detailing the changes.

---

## 👤 Owner & Maintainer

<table align="center">
  <tr>
    <td align="center">
      <strong>M.S.F. Sajeefa</strong><br />
      <sub>Founder &amp; Lead Engineer, Gemini LMS</sub><br /><br />
      <a href="mailto:geminilmsadmin@gmail.com">📧 geminilmsadmin@gmail.com</a>
    </td>
  </tr>
</table>

---

## 📄 License & Plans

This project is **proprietary SaaS software**. All rights reserved by **M.S.F. Sajeefa**. Unauthorized copying, distribution, or reverse engineering is strictly prohibited — see the full [LICENSE](./LICENSE) for terms.

| Plan | Intended For |
|------|--------------|
| 🆓 **Free** | Individual students — limited course-generation credits |
| ✨ **Premium** | Power users — extended usage rights, standard support & updates |
| 🏢 **Professional** | Institutions — multi-tenant hosting, custom branding, priority support |

For commercial licensing, institutional deployments, or permission requests, contact [geminilmsadmin@gmail.com](mailto:geminilmsadmin@gmail.com).

Payments are processed securely via **PayHere**. See our [Terms & Conditions](https://gemini-lms.vercel.app/terms), [Privacy Policy](https://gemini-lms.vercel.app/privacy), and [Refund Policy](https://gemini-lms.vercel.app/refund) for full details.

<p align="center"><sub>© 2026 Gemini LMS — Owned and operated by M.S.F. Sajeefa. All rights reserved.</sub></p>
