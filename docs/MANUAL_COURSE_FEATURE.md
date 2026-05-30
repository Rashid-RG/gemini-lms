# Manual Course Addition Feature

## Overview
A new feature has been added to allow users to manually create courses without using AI generation. This complements the existing AI-powered course generation feature.

## Components Added

### 1. **API Endpoint**: `/api/add-course-manual/route.js`
- **Route**: `POST /api/add-course-manual`
- **Purpose**: Handles the server-side logic for adding courses manually
- **Required Fields**:
  - `courseId`: Unique identifier (UUID)
  - `courseType`: Type of course (e.g., "Beginner Guide", "Complete Course")
  - `topic`: Course topic/title
  - `difficultyLevel`: Difficulty level (Easy, Medium, Hard)
  - `createdBy`: Email of the course creator
  - `courseLayout`: Course structure with chapters and topics
  - `includeVideos`: Boolean for video suggestions (optional)
  - `isPublic`: Boolean for course visibility (optional)
  - `category`: Course category (optional)
  - `tags`: Array of tags (optional)

- **Response**: Returns the created course object with status='Ready'
- **Features**:
  - Validates all required fields
  - Prevents duplicate course IDs
  - Saves courses with status 'Ready' (immediately available, no AI generation)

### 2. **UI Page**: `/app/add-course/page.jsx`
- **Route**: `GET /app/add-course`
- **Purpose**: Provides a comprehensive form for manual course creation
- **Features**:
  - Course information form (type, topic, difficulty, category)
  - Chapter management (add/remove chapters)
  - Topic management (add topics to each chapter)
  - Tag input with validation
  - Public/Private toggle
  - Video suggestions toggle
  - Real-time form validation

### 3. **Updated Create Page**: `/app/create/page.jsx`
- **Enhancement**: Added initial choice screen for users
- **Options**:
  1. **AI-Powered Generation** (existing feature)
  2. **Manual Addition** (new feature)
- **User Flow**:
  - User lands on `/app/create`
  - Chooses between AI or manual method
  - If AI: follows existing workflow
  - If Manual: redirected to `/app/add-course`

## User Flow

### Manual Course Creation Flow:
1. User navigates to `/app/create`
2. Clicks on "Manual Addition" card
3. Redirected to `/app/add-course`
4. Fills in course information:
   - Select course type (Beginner Guide, Complete Course, etc.)
   - Enter topic
   - Select difficulty level
   - Select category
   - Add course summary
   - Add optional tags
5. Add chapters with:
   - Chapter name and summary
   - Chapter emoji
   - Topics within the chapter
6. Click "Create Course"
7. Course is immediately available in dashboard with status='Ready'

## Database Schema
Courses are stored in `STUDY_MATERIAL_TABLE` with the following key fields:
- `courseId`: UUID (primary identifier)
- `courseType`: Type of course
- `topic`: Course topic
- `difficultyLevel`: Difficulty level
- `status`: 'Ready' for manually created courses
- `courseLayout`: JSON containing chapters and topics structure
- `createdBy`: Creator's email
- `createdAt`: Timestamp
- `isPublic`: Visibility flag
- `category`: Course category
- `tags`: Array of tags

## Key Differences from AI Generation

| Feature | Manual Addition | AI Generation |
|---------|-----------------|---------------|
| Content Generation | User-provided | AI-generated |
| Initial Status | 'Ready' | 'Generating' |
| Notes/Content | User decides | Updated by Inngest |
| Chapter Structure | Custom | AI-optimized |
| Time to Ready | Immediate | Asynchronous |
| Credit Usage | Can be configured | Yes (1 credit) |

## Technical Implementation

### No Inngest Involvement
- Manually added courses don't trigger background jobs
- Users are responsible for adding notes, flashcards, and quizzes separately
- Courses are immediately available in the dashboard

### Error Handling
- Returns 400 for missing required fields
- Returns 409 if course ID already exists
- Returns 500 for database errors
- All errors include descriptive messages

## Future Enhancements
- Bulk import courses from CSV/JSON
- Course templates
- Import notes/flashcards along with course
- Course cloning
- Admin approval workflow for public courses
- Course sharing between users

## Testing
To test the feature:
```bash
# 1. Navigate to /app/create
# 2. Select "Manual Addition"
# 3. Fill in course details
# 4. Submit form
# 5. Verify course appears in dashboard with status='Ready'
```

## Access Control
- Users can only create courses for their own email
- Courses are associated with creator's email (`createdBy` field)
- Public courses can be discovered by other users
- Private courses are only visible to the creator
