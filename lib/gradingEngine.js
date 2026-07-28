/**
 * Auto-Grading Engine for All Quiz Types
 * Supports: Multiple Choice, True/False, Short Answer, Matching, Fill the Blank, Essay
 */

/**
 * Evaluate a single quiz answer based on question type
 * @param {object} question - Quiz question object
 * @param {*} studentAnswer - Student's answer
 * @returns {object} - { isCorrect: boolean, feedback: string, score: number (0-100) }
 */
export function gradeAnswer(question, studentAnswer) {
  const { type = 'multiple-choice', options, correctOption, question: questionText } = question;

  switch (type) {
    case 'multiple-choice':
      return gradeMultipleChoice(studentAnswer, correctOption);

    case 'true-false':
      return gradeTrueFalse(studentAnswer, correctOption);

    case 'short-answer':
      return gradeShortAnswer(studentAnswer, options[0]);

    case 'fill-blank':
      return gradeFillBlank(studentAnswer, options[0]);

    case 'matching':
      return gradeMatching(studentAnswer, options);

    case 'essay':
      return gradeEssay(studentAnswer, options[0]);

    default:
      return { isCorrect: false, feedback: 'Unknown question type', score: 0 };
  }
}

/**
 * Grade Multiple Choice Question
 * @param {number} selectedOption - Selected option index (0-3)
 * @param {number} correctOption - Correct option index
 */
function gradeMultipleChoice(selectedOption, correctOption) {
  const isCorrect = selectedOption === correctOption;
  return {
    isCorrect,
    feedback: isCorrect
      ? '✓ Correct! Well done.'
      : `✗ Incorrect. The correct answer was option ${correctOption + 1}`,
    score: isCorrect ? 100 : 0
  };
}

/**
 * Grade True/False Question
 * @param {boolean} selectedAnswer - Student's true/false answer
 * @param {number} correctOption - 0 for True, 1 for False
 */
function gradeTrueFalse(selectedAnswer, correctOption) {
  const correctAnswer = correctOption === 0 ? true : false;
  const isCorrect = selectedAnswer === correctAnswer;

  return {
    isCorrect,
    feedback: isCorrect
      ? '✓ Correct!'
      : `✗ Incorrect. The correct answer was ${correctAnswer ? 'True' : 'False'}`,
    score: isCorrect ? 100 : 0
  };
}

/**
 * Grade Short Answer Question
 * Keyword matching - all keywords must be present
 * @param {string} studentAnswer - Student's text answer
 * @param {string} correctAnswer - Expected answer with keywords
 */
function gradeShortAnswer(studentAnswer = '', correctAnswer = '') {
  const studentText = studentAnswer.trim().toLowerCase();
  const correctText = correctAnswer.trim().toLowerCase();

  // If exact match
  if (studentText === correctText) {
    return {
      isCorrect: true,
      feedback: '✓ Perfect! Exact match.',
      score: 100
    };
  }

  // Keyword matching - split by comma, pipe for multiple acceptable answers
  const keywords = correctText.split('|').map(k => k.trim().toLowerCase());
  const studentWords = studentText.split(/\s+/);

  let matchCount = 0;
  for (const keyword of keywords) {
    const keywordWords = keyword.split(/\s+/);
    const allWordsPresent = keywordWords.every(word => 
      studentText.includes(word)
    );
    if (allWordsPresent) {
      matchCount++;
    }
  }

  const partialCredit = (matchCount / keywords.length) * 100;
  const isCorrect = matchCount === keywords.length;

  return {
    isCorrect,
    feedback: isCorrect
      ? '✓ Correct! All keywords found.'
      : `Partial credit: ${Math.round(partialCredit)}%. Keywords matched: ${matchCount}/${keywords.length}`,
    score: Math.round(partialCredit)
  };
}

/**
 * Grade Fill the Blank Question
 * Case-insensitive matching with multiple acceptable answers
 * @param {string} studentAnswer - Student's answer
 * @param {string} correctAnswers - Correct answers separated by |
 */
function gradeFillBlank(studentAnswer = '', correctAnswers = '') {
  const studentText = studentAnswer.trim().toLowerCase();
  const acceptableAnswers = correctAnswers.split('|').map(a => a.trim().toLowerCase());

  const isCorrect = acceptableAnswers.includes(studentText);

  return {
    isCorrect,
    feedback: isCorrect
      ? '✓ Correct!'
      : `✗ Incorrect. Acceptable answers: ${acceptableAnswers.join(', ')}`,
    score: isCorrect ? 100 : 0
  };
}

/**
 * Grade Matching Question
 * Student provides array of matches
 * @param {array} studentMatches - [ {from: 0, to: 1}, {from: 1, to: 0} ]
 * @param {array} correctMatches - Expected matching pairs
 */
function gradeMatching(studentMatches = [], correctMatches = []) {
  if (!Array.isArray(studentMatches) || !Array.isArray(correctMatches)) {
    return {
      isCorrect: false,
      feedback: 'Invalid matching format',
      score: 0
    };
  }

  let correctCount = 0;
  for (const studentMatch of studentMatches) {
    const found = correctMatches.some(correct =>
      correct.from === studentMatch.from && correct.to === studentMatch.to
    );
    if (found) correctCount++;
  }

  const scorePercentage = Math.round((correctCount / correctMatches.length) * 100);
  const isCorrect = correctCount === correctMatches.length;

  return {
    isCorrect,
    feedback: isCorrect
      ? '✓ Perfect match!'
      : `Partial credit: ${scorePercentage}%. Matched ${correctCount}/${correctMatches.length}`,
    score: scorePercentage
  };
}

/**
 * Grade Essay Question
 * Flag for manual review - return model answer
 * @param {string} studentAnswer - Student's essay answer
 * @param {string} modelAnswer - Model/expected answer
 */
function gradeEssay(studentAnswer = '', modelAnswer = '') {
  // Calculate a simple similarity score based on word count and overlap
  const studentWords = studentAnswer.trim().toLowerCase().split(/\s+/);
  const modelWords = modelAnswer.trim().toLowerCase().split(/\s+/);

  // Count common words
  const commonWords = studentWords.filter(word =>
    modelWords.includes(word) && word.length > 3
  );

  const similarity = modelWords.length > 0
    ? (commonWords.length / modelWords.length) * 100
    : 0;

  return {
    isCorrect: null, // Essays require manual grading
    feedback: '📝 Essay submitted. Waiting for tutor review.',
    score: null,
    status: 'pending_review',
    modelAnswer,
    similarity: Math.round(similarity),
    wordCount: studentWords.length,
    estimatedTime: calculateReadingTime(studentAnswer)
  };
}

/**
 * Calculate estimated reading time
 * @param {string} text - Text to read
 * @returns {number} - Minutes
 */
function calculateReadingTime(text) {
  const words = text.trim().split(/\s+/).length;
  return Math.ceil(words / 200); // Average 200 words per minute
}

/**
 * Grade entire quiz submission
 * @param {array} questions - Array of question objects
 * @param {array} answers - Array of student answers (same order as questions)
 * @returns {object} - { totalScore, totalPoints, results: [...], isPassed }
 */
export function gradeQuiz(questions, answers) {
  if (questions.length !== answers.length) {
    return {
      error: 'Mismatch between questions and answers',
      totalScore: 0,
      totalPoints: 0,
      isPassed: false
    };
  }

  const results = [];
  let totalScore = 0;
  let scoredQuestions = 0;

  for (let i = 0; i < questions.length; i++) {
    const result = gradeAnswer(questions[i], answers[i]);
    results.push({
      questionIndex: i,
      studentAnswer: answers[i],
      ...result
    });

    if (result.score !== null) {
      totalScore += result.score;
      scoredQuestions++;
    }
  }

  const averageScore = scoredQuestions > 0 ? Math.round(totalScore / scoredQuestions) : 0;
  const passThreshold = 60; // 60% to pass
  const isPassed = averageScore >= passThreshold;

  return {
    averageScore,
    totalScore,
    totalPoints: scoredQuestions * 100,
    results,
    isPassed,
    passThreshold,
    pendingReview: results.some(r => r.status === 'pending_review'),
    feedback: isPassed
      ? `✓ Congratulations! You passed with a score of ${averageScore}%`
      : `Try again! You scored ${averageScore}%. You need ${passThreshold}% to pass.`
  };
}

/**
 * Calculate progress percentage based on completed modules
 * @param {number} completedChapters - Number of completed chapters
 * @param {number} totalChapters - Total chapters in course
 * @param {number} quizzesPassed - Number of quizzes passed
 * @param {number} totalQuizzes - Total quizzes
 */
export function calculateProgress(completedChapters, totalChapters, quizzesPassed, totalQuizzes) {
  const chapterProgress = totalChapters > 0 ? (completedChapters / totalChapters) * 50 : 0;
  const quizProgress = totalQuizzes > 0 ? (quizzesPassed / totalQuizzes) * 50 : 0;
  return Math.round(chapterProgress + quizProgress);
}

/**
 * Determine if student should get certificate
 * @param {number} completionPercentage - Progress completion (0-100)
 * @param {number} averageScore - Student's average quiz score
 * @param {number} minimumScore - Minimum required score (default 60)
 */
export function shouldIssueCertificate(completionPercentage, averageScore, minimumScore = 60) {
  return completionPercentage >= 100 && averageScore >= minimumScore;
}

/**
 * Merges quizScores and mcqScores from student progress into a single normalized dictionary.
 * Normalizes chapter keys (e.g., 'chapter_0' -> '0', '0' -> '0').
 * If a chapter exists in both quizScores and mcqScores, picks the higher score.
 * @param {object|string} quizScores - Raw quizScores from database
 * @param {object|string} mcqScores - Raw mcqScores from database
 * @returns {object} - { '0': score1, '1': score2, ... }
 */
export function getMergedQuizScores(quizScores, mcqScores) {
  const parseObj = (obj) => {
    if (!obj) return {};
    if (typeof obj === 'string') {
      try { return JSON.parse(obj || '{}'); } catch { return {}; }
    }
    return typeof obj === 'object' ? obj : {};
  };

  const qObj = parseObj(quizScores);
  const mObj = parseObj(mcqScores);
  const normalized = {};

  const processEntries = (obj) => {
    for (const [key, val] of Object.entries(obj)) {
      const scoreNum = Number(val);
      if (!isNaN(scoreNum)) {
        const normKey = String(key).replace(/^chapter_/, '');
        if (normalized[normKey] === undefined || scoreNum > normalized[normKey]) {
          normalized[normKey] = scoreNum;
        }
      }
    }
  };

  processEntries(mObj);
  processEntries(qObj);

  return normalized;
}

