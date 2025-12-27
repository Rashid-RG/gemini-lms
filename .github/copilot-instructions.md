# AI Study Material Generator - Copilot Instructions

## Project Overview

**Gemini LMS** is a Next.js-based AI-powered learning platform that generates personalized study materials (courses, notes, flashcards, quizzes) using Google's Generative AI. The architecture combines real-time API handlers with asynchronous background jobs for intensive AI generation tasks.

### Tech Stack
- **Frontend**: Next.js 15, React 18, Tailwind CSS, Radix UI components
- **Backend**: Next.js API routes, Clerk authentication
- **Database**: PostgreSQL (Neon), Drizzle ORM
- **AI**: Google Gemini 2.5 Flash API with pre-configured system prompts
- **Async Jobs**: Inngest for event-driven task orchestration
- **Payments**: Stripe integration (in schema, minimal usage)

## Architecture Patterns

### Data Flow: Course Generation

1. **User Input** (`/app/create/page.jsx`) → User selects course type, difficulty, and topic
2. **API Request** → `POST /api/generate-course-outline` receives form data with UUID courseId
3. **AI Generation** → Google Generative AI creates JSON course structure (chapters, topics, summary)
4. **DB Storage** → STUDY_MATERIAL_TABLE stores course outline with status='Generating'
5. **Event Trigger** → Inngest event `notes.generate` fired to process chapters asynchronously
6. **Background Jobs** → Inngest function generates notes/flashcards/quizzes for each chapter
7. **Status Update** → Status changed to 'Ready' when all content complete

**Key File**: `/app/api/generate-course-outline/route.js` (handles retry logic for rate-limiting)

### Component Organization

- **`/app`** - Next.js App Router structure
  - **`(auth)/`** - Clerk-protected sign-in/sign-up routes
  - **`/dashboard`** - User's course list, displays generating status with spinner
  - **`/course/[courseId]/`** - Course viewer with nested views (notes, flashcards, quiz)
  - **`/create`** - Two-step form for course generation
  - **`/api`** - Route handlers for AI generation, user management, course fetching
- **`/components/ui`** - Radix UI primitives (button, select, textarea, carousel, progress)
- **`/configs`** - Centralized AI model and DB configuration
- **`/inngest`** - Event function definitions and client setup

### Key Integrations

**Clerk Authentication** (`middleware.js`)
- Protects routes: `/dashboard(.*)`, `/create`, `/course(.*)`
- User sync via Inngest event on user creation
- Email stored in USER_TABLE for lookups

**AI Model Configuration** (`/configs/AiModel.js`)
- Four pre-configured chat sessions with system prompts (history for few-shot learning):
  - `courseOutlineAIModel` - Generates course structure (JSON response)
  - `generateNotesAiModel` - Generates chapter notes (HTML response)
  - `GenerateQuizAiModel` - Generates quiz questions (JSON response)
  - `GenerateStudyTypeContentAiModel` - Generates flashcards (JSON response)
- Temperature=1, maxOutputTokens=8192, responseMimeType varies

**Inngest Event Model** (`/inngest/functions.js`)
- `user.create` - Syncs new users to database
- `notes.generate` - Iterates chapters sequentially (awaits each AI call)
- `studyType.content` - Generates flashcards/quizzes based on type
- Each function uses `step.run()` for automatic retries and durability

## Development Workflows

### Local Setup
```bash
npm install
# Environment variables required: NEXT_PUBLIC_DB_CONNECTION_STRING, NEXT_PUBLIC_GEMINI_API_KEY
npm run dev  # Runs on :3000
```

### Database Migrations
```bash
# Push schema changes to Neon
npx drizzle-kit push:pg
```

### Build & Deployment
```bash
npm run build
npm run start
npm run lint  # Next.js built-in linting
```

## Project-Specific Conventions

### Database Query Pattern
Always use Drizzle ORM with typed conditions:
```javascript
const result = await db.select().from(TABLE_NAME)
  .where(eq(TABLE_NAME.field, value))
  .orderBy(desc(TABLE_NAME.id))
```

### API Response Format
All routes return `{ result: data }` wrapper:
```javascript
return NextResponse.json({ result: dbResult[0] })
```

### AI Prompt Construction
Include context in prompt string before sending:
```javascript
const PROMPT = `Generate ${courseType} material for ${topic}, difficulty ${level}: ...`
await model.sendMessage(PROMPT)
```

### Status Tracking Pattern
Three states used across content tables: `'Generating'`, `'Ready'`, `'Error'` (implicit in schema)

### Component Naming
- `*Item.jsx` for reusable list/grid components (e.g., `CourseCardItem.jsx`, `FlashcardItem.jsx`)
- `_components` folders for private components within route segments

## Critical Files to Know

| File | Purpose |
|------|---------|
| `/configs/schema.js` | Drizzle table definitions (5 tables: users, studyMaterial, chapterNotes, studyTypeContent, paymentRecord) |
| `/configs/AiModel.js` | AI chat session initialization with system prompts and generation configs |
| `/inngest/functions.js` | Event handlers for async content generation and user creation |
| `/middleware.js` | Clerk route protection matcher |
| `/app/provider.js` | Root-level user sync on app load |
| `/app/create/page.jsx` | Two-step course creation form with UUID generation |
| `/app/api/generate-course-outline/route.js` | Main API endpoint with AI retry logic |

## Important Gotchas

1. **Database Connection** - Drizzle uses Neon HTTP client (not TCP), drizzle.config.js hardcodes credentials
2. **Async Sequencing** - Inngest `GenerateNotes` uses `for...of` loop (not forEach) to await AI calls sequentially
3. **UI Status Display** - CourseCardItem checks `status=='Generating'` to show spinner; updates require page refresh
4. **Clerk Email Field** - Always reference `user?.primaryEmailAddress?.emailAddress`, not `user.email`
5. **JSON Parsing** - Both course outline and study content use `JSON.parse(aiResponse.text())`, no try-catch implemented
6. **UUID Generation** - courseId is client-generated UUID (v4), not database serial
7. **HTML Response Type** - Notes endpoint returns HTML string directly (not JSON-wrapped), stored in CHAPTER_NOTES_TABLE.notes TEXT field
