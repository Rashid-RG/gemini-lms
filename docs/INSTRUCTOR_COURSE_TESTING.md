# Instructor Course Creation - Testing Guide

## Pre-Testing Setup

### Requirements:
1. ✅ Admin/Instructor account created
2. ✅ Database migrations completed
3. ✅ AdminAuthContext working
4. ✅ `/api/admin/create-complete-course` endpoint accessible

## Test Scenario 1: Basic Course Creation

### Test Case: Create a Simple Course

**Steps:**
1. Navigate to `/admin/create-course`
2. Fill Basic Information:
   - Course Type: "Beginner Guide"
   - Topic: "Introduction to Python"
   - Difficulty: "Easy"
   - Category: "Programming"
   - Summary: "Learn Python basics from scratch"
3. Add 1 Chapter:
   - Name: "Getting Started"
   - Summary: "Set up Python environment"
   - Emoji: "🐍"
4. Skip notes, flashcards, quizzes for now
5. Click "Create Complete Course"

**Expected Result:**
- ✅ Toast: "Complete course created successfully!"
- ✅ Redirected to `/admin/courses`
- ✅ Course appears in list with status "Ready"
- ✅ Course topic shows "Introduction to Python"

**Database Verification:**
```sql
-- Check course created
SELECT courseId, topic, status, createdBy 
FROM "studyMaterial" 
WHERE topic = 'Introduction to Python';

-- Should show 1 record with status='Ready'
```

---

## Test Scenario 2: Complete Course with All Content

### Test Case: Create Full Course

**Steps:**
1. Navigate to `/admin/create-course`
2. **Basic Info Section:**
   - Type: "Complete Course"
   - Topic: "Advanced JavaScript Mastery"
   - Difficulty: "Hard"
   - Category: "Programming"
   - Summary: "Master modern JavaScript with ES6+, async/await, and design patterns"
   - Add tags: "javascript", "async", "es6"
   - Toggle: isPublic=true, includeVideos=true

3. **Chapters Section (add 3):**
   
   **Chapter 1:**
   - Name: "ES6+ Features"
   - Summary: "Arrow functions, destructuring, spread operator"
   - Emoji: "⚡"
   - Topics: "Arrow Functions", "Destructuring", "Spread Operator"

   **Chapter 2:**
   - Name: "Async Programming"
   - Summary: "Promises, async/await, error handling"
   - Emoji: "⏳"
   - Topics: "Promises", "Async/Await", "Error Handling"

   **Chapter 3:**
   - Name: "Design Patterns"
   - Summary: "Factory, Singleton, Observer patterns"
   - Emoji: "🏗️"
   - Topics: "Factory Pattern", "Singleton Pattern", "Observer Pattern"

4. **Notes Section (fill for all 3):**
   - Chapter 1: "Arrow functions provide concise syntax... detailed notes here"
   - Chapter 2: "Promises are objects representing async operations..."
   - Chapter 3: "Design patterns are reusable solutions..."

5. **Flashcards (add 3+):**
   ```
   Flashcard 1:
   Q: "What is an arrow function?"
   A: "A concise syntax for writing functions using =>"
   Difficulty: Easy

   Flashcard 2:
   Q: "Difference between Promise and async/await"
   A: "Async/await is syntactic sugar over Promises, making code more readable"
   Difficulty: Medium

   Flashcard 3:
   Q: "What is the Observer pattern?"
   A: "A behavioral pattern where objects notify observers of state changes"
   Difficulty: Hard
   ```

6. **Quizzes (add 3+):**
   ```
   Question 1:
   "Which is correct arrow function syntax?"
   Options:
   - [x] const add = (a, b) => a + b
   - [ ] const add = function(a, b) => a + b
   - [ ] const add = (a, b) -> a + b
   - [ ] const add = (a, b) > a + b
   Difficulty: Easy

   Question 2:
   "What does async keyword do?"
   Options:
   - [ ] Runs code in parallel
   - [x] Returns a Promise automatically
   - [ ] Skips the function
   - [ ] Makes code run synchronously
   Difficulty: Medium

   Question 3:
   "How many design patterns exist in GoF book?"
   Options:
   - [ ] 15
   - [ ] 20
   - [x] 23
   - [ ] 30
   Difficulty: Hard
   ```

7. Click "Create Complete Course"

**Expected Result:**
- ✅ Toast: "Complete course created successfully!"
- ✅ Response shows:
  ```json
  {
    "contentAdded": {
      "chapters": 3,
      "notes": 3,
      "flashcards": 3,
      "quizzes": 3
    }
  }
  ```
- ✅ Course visible in `/admin/courses`
- ✅ Course open in studier view shows all content

**Database Verification:**
```sql
-- Check course
SELECT * FROM "studyMaterial" 
WHERE topic = 'Advanced JavaScript Mastery';

-- Check notes (should be 3)
SELECT chapterId, LENGTH(notes) as noteLength 
FROM "chapterNotes" 
WHERE courseId = '[courseId]';

-- Check flashcards
SELECT content 
FROM "studyTypeContent" 
WHERE courseId = '[courseId]' AND type = 'flashcard';

-- Check quizzes
SELECT content 
FROM "studyTypeContent" 
WHERE courseId = '[courseId]' AND type = 'quiz';
```

---

## Test Scenario 3: Form Validation

### Test Case 1: Missing Required Fields

**Steps:**
1. Navigate to `/admin/create-course`
2. Leave Course Type empty
3. Click "Create Complete Course"

**Expected Result:**
- ❌ Toast: "Please fill in Course Type, Topic, and Summary"
- ✅ No API call made

---

### Test Case 2: Missing Chapter Summary

**Steps:**
1. Fill Basic Info (all required fields)
2. Edit Chapter 1, leave summary empty
3. Click "Create Complete Course"

**Expected Result:**
- ❌ Toast: "All chapters must have a name and summary"
- ✅ No API call made

---

### Test Case 3: Only One Chapter Requirement

**Steps:**
1. Fill form with 2 chapters
2. Try to remove both chapters
3. RemoveChapter button should be disabled on last chapter

**Expected Result:**
- ✅ Can't remove last chapter
- ✅ Toast: "You must have at least one chapter" when trying to force delete

---

## Test Scenario 4: Flashcard Management

### Test Case: Add/Remove Flashcards

**Steps:**
1. Navigate to `/admin/create-course`
2. In Flashcards section, click "Add Flashcard" 5 times
3. Should have 6 flashcards total (1 default + 5 added)
4. Remove flashcard #3
5. Should have 5 total

**Expected Result:**
- ✅ Flashcards can be added dynamically
- ✅ Flashcards can be removed individually
- ✅ Correct count maintained

---

## Test Scenario 5: Quiz Option Handling

### Test Case: Correct Answer Selection

**Steps:**
1. Add a quiz question
2. Fill 4 options:
   - "Python"
   - "JavaScript"
   - "Java"
   - "C++"
3. Select 3rd option (Java) as correct
4. Create course

**Expected Result:**
- ✅ Radio button shows option 3 selected
- ✅ API receives: `correctOption: 2` (0-indexed)
- ✅ Quiz saved with correct answer marked

---

## Test Scenario 6: Tag Management

### Test Case: Add/Remove Tags

**Steps:**
1. In Basic Info, add tags:
   - Type: "python", press Enter → Added
   - Type: "beginner", click Add Tag → Added
   - Type: "tutorial", press Enter → Added
2. Click × on "python" tag
3. Should show ["beginner", "tutorial"]

**Expected Result:**
- ✅ Tags added via Enter or button
- ✅ Tags removed via × button
- ✅ Duplicate tags prevented
- ✅ Tags saved to course

---

## Test Scenario 7: Section Collapse/Expand

### Test Case: Form Navigation

**Steps:**
1. Navigate to `/admin/create-course`
2. Click "📝 Chapter Notes" header to collapse
3. Should close notes section
4. Click again to expand
5. Notes section should reappear with content

**Expected Result:**
- ✅ Sections collapse/expand smoothly
- ✅ Content persists after collapse/expand
- ✅ All sections can be collapsed
- ✅ Can have multiple sections open

---

## Test Scenario 8: Public/Private Course

### Test Case 1: Create Public Course

**Steps:**
1. Create course with isPublic=true
2. Check `/admin/courses`
3. Course should be discoverable

**Expected Result:**
- ✅ Course shows public indicator
- ✅ Students can find via explore/search

---

### Test Case 2: Create Private Course

**Steps:**
1. Create course with isPublic=false
2. Check `/admin/courses`
3. Course should only be visible to creator

**Expected Result:**
- ✅ Course shows private/lock indicator
- ✅ Other users can't discover

---

## Test Scenario 9: API Error Handling

### Test Case 1: Duplicate Course ID

**Steps:**
1. Get courseId from first created course
2. Try to create another course with same courseId
3. Backend should detect duplicate

**Expected Result:**
- ❌ API returns 409 Conflict
- ❌ Toast: "Course with this ID already exists"
- ✅ No duplicate created

---

### Test Case 2: Database Connection Error

**Steps:**
1. Stop database connection (simulate)
2. Try to create course
3. Should fail gracefully

**Expected Result:**
- ❌ Toast: "Failed to create course: [error]"
- ✅ Detailed error in browser console

---

## Test Scenario 10: Performance Test

### Test Case: Large Course

**Steps:**
1. Create course with:
   - 5 chapters
   - 50 flashcards
   - 100 quiz questions
   - 5 notes with long HTML content

**Expected Result:**
- ✅ Form loads quickly
- ✅ No freezing when adding items
- ⏱️ Submit completes in < 5 seconds
- ✅ All data saved correctly

---

## Test Scenario 11: Navigation Tests

### Test Case 1: Create Course from Dashboard

**Steps:**
1. Go to `/admin/dashboard`
2. Click "Create Course" button
3. Should redirect to `/admin/create-course`
4. Fill and submit
5. Should redirect back to `/admin/courses`

**Expected Result:**
- ✅ Button visible and functional
- ✅ Correct redirects
- ✅ Course data submitted

---

### Test Case 2: Create Course from Courses List

**Steps:**
1. Go to `/admin/courses`
2. Click "Create Course" button (top right)
3. Fill and submit
4. Course appears in list

**Expected Result:**
- ✅ Button visible on courses page
- ✅ Form works same as dashboard
- ✅ New course appears in list

---

## Test Scenario 12: Browser Compatibility

### Test Case: Cross-Browser Testing

**Browsers to Test:**
- ✅ Chrome/Chromium (latest)
- ✅ Firefox (latest)
- ✅ Safari (if available)
- ✅ Edge (latest)

**Check:**
- ✅ Form renders correctly
- ✅ All inputs work
- ✅ Buttons functional
- ✅ No console errors

---

## Regression Testing Checklist

After any changes, run these tests:

- [ ] Course can be created
- [ ] Course appears in admin/courses
- [ ] Chapter notes are saved
- [ ] Flashcards are saved
- [ ] Quizzes are saved
- [ ] Form validation works
- [ ] Tags are saved
- [ ] Public/Private works
- [ ] Database queries return correct data

---

## Performance Benchmarks

| Task | Expected Time |
|------|---|
| Form load | < 1s |
| Add chapter | < 100ms |
| Add flashcard | < 100ms |
| Submit course | < 5s |
| Redirect to courses | < 2s |

---

## Debugging Tips

### Form not submitting:
```javascript
// Check in browser console
document.querySelector('form').addEventListener('submit', (e) => {
  console.log('Form data:', formData);
});
```

### API not receiving data:
```javascript
// Add logging in route.js
console.log('Request body:', await req.json());
```

### Database issues:
```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';
```

---

## Sign-off Criteria

✅ All scenarios pass
✅ No console errors
✅ No database errors
✅ Performance acceptable
✅ UI/UX smooth
✅ Instructors can create complete courses
✅ Courses appear immediately with "Ready" status
✅ All content saves correctly

---

**Test Date:** ___________
**Tested By:** ___________
**Status:** ✅ PASS / ❌ FAIL
**Notes:** ___________
