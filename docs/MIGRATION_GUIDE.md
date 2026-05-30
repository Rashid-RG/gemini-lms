# Migration Guide: Updating to Optimized Prompts

## Quick Overview
This guide shows you how to update your existing code to use the new, optimized prompts.

---

## Step 1: Import Optimized Prompts

**File:** Any file that generates AI content

```javascript
// Add this import
import { 
  COURSE_OUTLINE_PROMPT,
  NOTES_GENERATION_PROMPT,
  FLASHCARD_GENERATION_PROMPT,
  QUIZ_GENERATION_PROMPT,
  ASSIGNMENT_GENERATION_PROMPT,
  MCQ_GENERATION_PROMPT 
} from '@/configs/OptimizedPrompts';
```

---

## Step 2: Update Each Endpoint

### 2.1 Course Outline Generation
**File:** `app/api/generate-course-outline/route.js`

**Before:**
```javascript
const PROMPT = `Create study material for "${topic}" (${courseType}, ${difficultyLevel} level).
Return JSON with exactly this structure:...`;
```

**After:**
```javascript
const PROMPT = COURSE_OUTLINE_PROMPT(topic, courseType, difficultyLevel);
```

---

### 2.2 Notes Generation
**File:** `inngest/functions.js` (GenerateNotes function)

**Before:**
```javascript
const PROMPT = `Generate study notes in HTML for: ${chapter.chapter_title || chapter.chapterTitle}
Topics: ${(chapter.topics || []).join(', ')}
Use <h3> headings, <ul><li> lists, <pre><code> for code. Max 1200 words.`;
```

**After:**
```javascript
const PROMPT = NOTES_GENERATION_PROMPT(
  chapter.chapter_title || chapter.chapterTitle,
  chapter.topics || [],
  'Medium' // or get difficulty from course object
);
```

---

### 2.3 Flashcard Generation
**File:** `inngest/functions.js` (GenerateStudyTypeContent function)

**Before:**
```javascript
if (studyType === 'Flashcard') {
  const prompt = `Generate the flashcard on topic : ${topics}...`;
}
```

**After:**
```javascript
if (studyType === 'Flashcard') {
  const prompt = FLASHCARD_GENERATION_PROMPT(
    topics,
    'Medium' // Get difficulty from course/context
  );
}
```

---

### 2.4 Quiz Generation
**File:** `inngest/functions.js` or relevant API

**Before:**
```javascript
if (studyType === 'Quiz') {
  const prompt = `Generate Quiz on topic : ${topics}...`;
}
```

**After:**
```javascript
if (studyType === 'Quiz') {
  const prompt = QUIZ_GENERATION_PROMPT(
    topics,
    'Medium' // Get difficulty from context
  );
}
```

---

### 2.5 Assignment Generation
**File:** `inngest/functions.js` (GenerateAssignments function)

**Before:**
```javascript
const prompt = `Generate exactly 1 comprehensive assignment...`;
```

**After:**
```javascript
const prompt = ASSIGNMENT_GENERATION_PROMPT(
  topic,
  'Medium', // Get difficulty level
  courseType
);
```

---

### 2.6 MCQ Generation
**File:** `inngest/functions.js` or relevant API

**Before:**
```javascript
const prompt = `Generate 20 multiple choice questions...`;
```

**After:**
```javascript
const prompt = MCQ_GENERATION_PROMPT(
  topic,
  20, // Can be changed per needs
  'Medium' // Get difficulty level
);
```

---

## Step 3: Complete Code Examples

### Example 1: Update Course Outline Route

**File:** `app/api/generate-course-outline/route.js`

```javascript
import { COURSE_OUTLINE_PROMPT } from "@/configs/OptimizedPrompts";

// Inside POST function:
export async function POST(req) {
  // ... existing code ...

  // 2️⃣ Build AI prompt using optimized version
  const PROMPT = COURSE_OUTLINE_PROMPT(topic, courseType, difficultyLevel);

  // 3️⃣ Call AI with retry
  let aiResult;
  try {
    aiResult = await callAIWithRetry(PROMPT, 4, 3000);
  } catch (aiErr) {
    // ... error handling ...
  }

  // ... rest of code ...
}
```

---

### Example 2: Update Notes Generation in Inngest

**File:** `inngest/functions.js`

```javascript
import { NOTES_GENERATION_PROMPT } from "@/configs/OptimizedPrompts";

export const GenerateNotes = inngest.createFunction(
  { id: 'generate-course', retries: 3, concurrency: { limit: 2 } },
  { event: 'notes.generate' },
  async ({ event, step }) => {
    try {
      const { course } = event.data;

      // ... existing parsing code ...

      const notesResult = await step.run('Generate Chapter Notes', async () => {
        for (let index = 0; index < Chapters.length; index++) {
          const chapter = Chapters[index];
          
          // ✨ NEW: Use optimized prompt
          const PROMPT = NOTES_GENERATION_PROMPT(
            chapter.chapter_title || chapter.chapterTitle,
            chapter.topics || [],
            course.difficultyLevel || 'Medium'
          );

          // ... rest of generation code ...
          const result = await generateNotesAiModel.sendMessage(PROMPT);
          // ... save to DB ...
        }
      });

      // ... rest of function ...
    } catch (err) {
      // ... error handling ...
    }
  }
);
```

---

### Example 3: Update Flashcard Generation

**File:** `inngest/functions.js`

```javascript
import { FLASHCARD_GENERATION_PROMPT } from "@/configs/OptimizedPrompts";

// In GenerateStudyTypeContent function:
const AiResult = await step.run('Generating Study Content using AI', async () => {
  const result = await retryWithBackoff(async () => {
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Study content timeout')), 40000)
    );
    
    let aiPromise;
    if (studyType === 'Flashcard') {
      // ✨ NEW: Use optimized prompt
      const flashcardPrompt = FLASHCARD_GENERATION_PROMPT(
        prompt, // This should be the topics
        'Medium' // Get difficulty from context
      );
      aiPromise = GenerateStudyTypeContentAiModel.sendMessage(flashcardPrompt);
    } else if (studyType === 'MCQ') {
      // ... existing MCQ code ...
    } else {
      // ... existing quiz code ...
    }

    const aiResponse = await Promise.race([aiPromise, timeoutPromise]);
    
    // ... rest of parsing ...
  });

  return result;
});
```

---

## Step 4: Testing Checklist

After updating, test each content type:

- [ ] **Course Outline**
  - Run: `POST /api/generate-course-outline` with sample data
  - Check: JSON structure matches format
  - Verify: 3 chapters, 4 topics per chapter
  - Confirm: Topics are specific (not generic)

- [ ] **Notes Generation**
  - Trigger: Course creation to generate notes
  - Check: HTML properly formatted with sections
  - Verify: 1000-1500 word range
  - Confirm: All topics covered

- [ ] **Flashcards**
  - Trigger: Flashcard generation
  - Check: 12-15 flashcards created
  - Verify: Different question types present
  - Confirm: Answers are concise (2-3 sentences)

- [ ] **Quiz**
  - Trigger: Quiz generation
  - Check: 10-12 questions created
  - Verify: Mix of easy/medium/hard
  - Confirm: 4 options per question

- [ ] **Assignments**
  - Trigger: Assignment generation
  - Check: Clear description and rubric
  - Verify: 100 total points
  - Confirm: Appropriate for difficulty level

- [ ] **MCQ**
  - Trigger: MCQ generation
  - Check: Correct number of questions
  - Verify: Good distractor quality
  - Confirm: Balanced difficulty distribution

---

## Step 5: Rollout Strategy

### Option A: Gradual Rollout (Recommended)
1. Update one content type at a time
2. Test thoroughly before moving to next
3. Monitor output quality
4. Gather user feedback
5. Roll out remaining types

### Option B: Full Rollout
1. Update all at once
2. Run comprehensive tests
3. Monitor system for issues
4. Have rollback plan ready

---

## Rollback Plan (If Issues Found)

If you need to revert:

1. Keep the old prompts in a separate file:
```javascript
// configs/LegacyPrompts.js
export const LEGACY_COURSE_OUTLINE_PROMPT = ...
```

2. Add a feature flag:
```javascript
const useOptimizedPrompts = process.env.USE_OPTIMIZED_PROMPTS === 'true';
const PROMPT = useOptimizedPrompts 
  ? COURSE_OUTLINE_PROMPT(...) 
  : LEGACY_COURSE_OUTLINE_PROMPT(...);
```

3. Revert via environment variable if needed

---

## Monitoring & Metrics

Track these metrics after rollout:

### Quality Metrics
- User satisfaction scores
- Content completion rates
- Quiz average scores
- Student feedback ratings

### Performance Metrics
- API response times
- Token usage (should be more efficient)
- Error rates
- Retry frequency (should decrease)

### Cost Metrics
- API calls per course (may decrease with clearer prompts)
- Average tokens per request

---

## FAQ

**Q: Will this break existing courses?**
A: No, only newly generated content will use optimized prompts. Existing courses are unaffected.

**Q: Do I need to update all prompts at once?**
A: No, you can do it one at a time. Update the ones that matter most first.

**Q: What if the output is different?**
A: That's expected! The new prompts generate higher quality content. Quality improvements may look different than the old output.

**Q: How long should I wait before rollout?**
A: Test each content type for at least 24 hours (across different topics) before deciding to roll out.

**Q: Can I customize the optimized prompts?**
A: Yes! Edit `/configs/OptimizedPrompts.js` to adjust the prompts to your specific needs.

---

## Support

If you encounter issues:

1. Check the `PROMPT_ANALYSIS.md` for what each prompt does
2. Review `PROMPT_BEFORE_AFTER.md` for differences
3. Monitor `GET /api/inngest` logs for AI generation errors
4. Test with simple topics first (e.g., "Python Basics") before complex ones

---

Good luck with the upgrade! Your content quality should improve significantly. 🚀
