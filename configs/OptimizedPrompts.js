/**
 * OPTIMIZED AI PROMPTS FOR GEMINI LMS
 * These prompts are designed to generate high-quality educational content
 */

// ============================================
// 1. COURSE OUTLINE PROMPT (IMPROVED)
// ============================================
export const COURSE_OUTLINE_PROMPT = (topic, courseType, difficultyLevel) => `
You are an expert educational content creator specializing in creating structured course outlines.

Create a comprehensive study material outline for:
- Topic: "${topic}"
- Course Type: ${courseType}
- Difficulty Level: ${difficultyLevel}

CRITICAL REQUIREMENTS:
1. Provide exactly 3 chapters
2. Each chapter must have 4-5 specific, actionable topics
3. Topics should progress logically from basic to advanced
4. Include real-world applications and examples
5. Ensure difficulty matches the specified level

Return ONLY valid JSON with this EXACT structure:
{
  "course_title": "Descriptive course title",
  "difficulty": "${difficultyLevel}",
  "summary": "2-3 sentence overview explaining what students will learn and why it matters",
  "chapters": [
    {
      "chapter_title": "Chapter title",
      "summary": "2-3 sentences explaining the chapter's importance and learning outcomes",
      "emoji": "relevant emoji",
      "topics": [
        "Topic 1 with practical focus",
        "Topic 2 with real-world application",
        "Topic 3 with building block concept",
        "Topic 4 with advanced concept"
      ]
    }
  ]
}

QUALITY STANDARDS:
- Topics should be specific (not "Introduction to Python" but "Data Types and Variables in Python")
- Each topic should be learnable in 30-45 minutes
- Progression should be logical (prerequisites before advanced topics)
- Include both theoretical and practical topics

Generate ONLY the JSON response, no additional text.
`;

// ============================================
// 2. NOTES GENERATION PROMPT (IMPROVED)
// ============================================
export const NOTES_GENERATION_PROMPT = (chapterTitle, topics, difficulty) => `
You are an expert educator creating detailed, engaging study notes.

Create comprehensive study notes for:
- Chapter: ${chapterTitle}
- Topics to cover: ${topics.join(", ")}
- Difficulty Level: ${difficulty}

STRUCTURE YOUR NOTES AS FOLLOWS:
1. Chapter Introduction (1-2 paragraphs)
   - Hook the student with relevance
   - State clear learning objectives

2. Main Content (for each topic)
   - Use clear hierarchical headings (use <h3> for topics, <h4> for subtopics)
   - Include 2-3 key points per topic
   - Use <ul><li> for bullet points
   - Add real-world examples where relevant

3. Code Examples (if applicable)
   - Use <pre><code> tags for code snippets
   - Include comments explaining the code
   - Show both basic and advanced examples

4. Key Takeaways
   - 3-5 main points to remember
   - Quick reference summary

FORMAT REQUIREMENTS:
- Use HTML formatting with proper tags
- Keep paragraphs to 3-4 sentences maximum
- Use bold (<strong>) for important terms
- Keep total length between 1000-1500 words
- Make content scannable with headers and lists
- Include practical tips and common mistakes to avoid

QUALITY STANDARDS:
- Accuracy: All information must be factually correct
- Clarity: Explain concepts in simple, understandable language
- Engagement: Include interesting facts and real-world applications
- Completeness: Cover all provided topics thoroughly
- Progressiveness: Build from basic to more complex concepts

Generate the notes in clean HTML format.
`;

// ============================================
// 3. FLASHCARD GENERATION PROMPT (IMPROVED)
// ============================================
export const FLASHCARD_GENERATION_PROMPT = (topics, difficulty) => `
You are an expert in creating high-quality flashcards for spaced repetition learning.

Create flashcards for:
- Topics: ${topics.join(", ")}
- Difficulty Level: ${difficulty}

FLASHCARD QUALITY GUIDELINES:
1. Questions (Front side)
   - Each question should test ONE concept
   - Be specific and clear
   - Vary question types:
     * Definition: "What is X?"
     * Application: "When would you use X?"
     * Comparison: "What's the difference between X and Y?"
     * Process: "How do you do X?"
     * Why: "Why is X important?"

2. Answers (Back side)
   - Concise but complete (2-3 sentences maximum)
   - Include key terms in bold
   - For definitions: provide example
   - For procedures: use numbered steps if needed
   - Avoid over-explanation

3. Volume & Variety
   - Create 12-15 flashcards (not more)
   - Balance between definition, application, and theory
   - Progress from basic to advanced concepts
   - Ensure cards are independent (can be studied in any order)

DIFFICULTY CALIBRATION:
- Easy: Focus on vocabulary and basic concepts
- Medium: Include application and comparison questions
- Hard: Include analysis, synthesis, and complex scenarios

Return ONLY a JSON array with this structure:
[
  {
    "front": "Clear, specific question",
    "back": "Concise, complete answer with key terms bolded"
  }
]

DO NOT:
- Create duplicate or similar cards
- Make answers too long
- Include the answer in the question
- Use overly technical jargon
- Create cards that are too easy or too hard

Generate the flashcards now.
`;

// ============================================
// 4. QUIZ GENERATION PROMPT (IMPROVED)
// ============================================
export const QUIZ_GENERATION_PROMPT = (topics, difficulty) => `
You are an expert quiz designer creating assessments that test deep understanding.

Create a quiz for:
- Topics: ${topics.join(", ")}
- Difficulty Level: ${difficulty}
- Format: Multiple Choice Questions (4 options each)

QUIZ DESIGN PRINCIPLES:
1. Question Variety (10-12 questions total)
   - 30% Recall questions (basic definitions/facts)
   - 40% Comprehension questions (understanding relationships)
   - 30% Application questions (real-world scenarios)

2. Question Quality
   - Each question tests ONE concept
   - Avoid trick questions
   - Provide plausible distractors (wrong answers should be reasonable)
   - Correct answer should not be obvious by pattern

3. Answer Options
   - All options should be grammatically consistent
   - Avoid "All of the above" or "None of the above"
   - Randomize correct answer position
   - Wrong options should test common misconceptions

4. Difficulty Distribution
   - Easy: 30% (boost confidence)
   - Medium: 50% (test comprehension)
   - Hard: 20% (challenge deep understanding)

Return ONLY valid JSON with this structure:
{
  "quizTitle": "Descriptive quiz title",
  "questions": [
    {
      "question": "Clear, specific question",
      "options": [
        "Plausible but incorrect option",
        "Correct answer",
        "Common misconception",
        "Plausible but incorrect option"
      ],
      "answer": "Correct answer (must match exactly one option)"
    }
  ]
}

AVOID:
- Ambiguous questions
- Questions testing nitpicky details
- Options that are obviously wrong
- Similar-sounding options
- Overly long questions

Generate the quiz now.
`;

// ============================================
// 5. ASSIGNMENT GENERATION PROMPT (IMPROVED)
// ============================================
export const ASSIGNMENT_GENERATION_PROMPT = (topic, difficulty, courseType) => `
You are an expert instructional designer creating meaningful assignments.

Create 1 comprehensive assignment for:
- Topic: ${topic}
- Difficulty: ${difficulty}
- Course Type: ${courseType}

ASSIGNMENT DESIGN CRITERIA:
1. Learning Objectives
   - Assignment should target 2-3 learning outcomes
   - Students should be able to apply concepts in new contexts
   - Assessment should be meaningful, not busywork

2. Assignment Description
   - Clear problem statement (1-2 paragraphs)
   - Specific requirements and expectations
   - Examples of good work (if applicable)
   - Constraints and guidelines
   - Estimated completion time

3. Rubric Categories (max 4)
   ${difficulty === 'Easy' ? `
   - Understanding: 25 points
   - Implementation: 40 points
   - Quality: 25 points
   - Presentation: 10 points
   ` : difficulty === 'Medium' ? `
   - Conceptual Understanding: 20 points
   - Problem Solving: 30 points
   - Implementation Quality: 30 points
   - Code/Writing Quality: 20 points
   ` : `
   - Analysis & Critical Thinking: 25 points
   - Solution Design: 25 points
   - Implementation: 30 points
   - Innovation & Depth: 20 points
   `}

4. Difficulty-Appropriate Expectations
   - Easy: Reinforce learned concepts, minimal independent thinking
   - Medium: Apply concepts to new scenarios, some research needed
   - Hard: Solve novel problems, integrate multiple concepts, independent analysis

Return ONLY valid JSON with this structure:
[
  {
    "title": "Meaningful, descriptive assignment title",
    "description": "Detailed, clear assignment description with context and requirements",
    "totalPoints": 100,
    "rubric": {
      "category1": 25,
      "category2": 30,
      "category3": 30,
      "category4": 15
    },
    "dueDate": "YYYY-MM-DD (14 days from today)"
  }
]

REQUIREMENTS:
- Total points must equal 100
- Rubric must have 3-4 categories
- Description should be 3-5 sentences
- Assignment should take 6-10 hours for difficulty level
- Should integrate multiple topics

Generate the assignment now.
`;

// ============================================
// 6. MCQ GENERATION PROMPT (IMPROVED)
// ============================================
export const MCQ_GENERATION_PROMPT = (topic, numQuestions = 20, difficulty) => `
You are an expert educator creating comprehensive multiple choice question sets.

Create ${numQuestions} multiple choice questions for:
- Topic: ${topic}
- Difficulty Level: ${difficulty}
- Number of Questions: ${numQuestions}

QUESTION DISTRIBUTION:
${difficulty === 'Easy' ? `
- 40% Vocabulary/Definition questions
- 40% Comprehension questions
- 20% Simple application questions
` : difficulty === 'Medium' ? `
- 30% Conceptual/Definition questions
- 40% Application/Analysis questions
- 30% Scenario-based questions
` : `
- 20% Definition/recall questions
- 30% Application questions
- 30% Analysis questions
- 20% Synthesis/complex scenario questions
`}

QUALITY REQUIREMENTS:
1. Question Clarity
   - Each question tests ONE concept
   - Questions are clear and unambiguous
   - No trick questions or wordplay

2. Distractor Quality
   - All 4 options are plausible
   - Distractors represent common misconceptions
   - Option length is similar for all choices
   - Correct answer position is randomized

3. Content Coverage
   - Cover main topics comprehensively
   - Progress from basic to complex
   - Mix question types and styles
   - Avoid repetition

4. Proper Difficulty Calibration
   - Match specified difficulty level
   - Use appropriate vocabulary
   - Require appropriate level of thinking

Return ONLY valid JSON with this structure:
{
  "mcqTitle": "Descriptive MCQ set title",
  "questions": [
    {
      "question": "Clear, specific question",
      "options": [
        "First plausible option",
        "Second plausible option",
        "Correct answer",
        "Fourth plausible option"
      ],
      "answer": "Correct answer (must match exactly)"
    }
  ]
}

VALIDATION:
- Exactly ${numQuestions} questions
- Correct answer must match one option exactly
- All options properly formatted
- No duplicate questions
- Logical progression in difficulty

Generate the MCQs now.
`;

export default {
  COURSE_OUTLINE_PROMPT,
  NOTES_GENERATION_PROMPT,
  FLASHCARD_GENERATION_PROMPT,
  QUIZ_GENERATION_PROMPT,
  ASSIGNMENT_GENERATION_PROMPT,
  MCQ_GENERATION_PROMPT
};
