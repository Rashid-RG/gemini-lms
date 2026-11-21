// Pure assessment helpers: the browser must never provide grading keys or awarded scores.
export const MAX_ASSESSMENT_QUESTIONS = 100;
export const MAX_RESPONSE_LENGTH = 2000;

export function parseAssessmentQuestions(content) {
  let parsed = content;
  if (typeof parsed === "string") {
    try { parsed = JSON.parse(parsed); } catch { throw new TypeError("Stored assessment is not valid JSON"); }
  }
  const questions = Array.isArray(parsed) ? parsed : parsed?.questions;
  if (!Array.isArray(questions) || !questions.length || questions.length > MAX_ASSESSMENT_QUESTIONS) {
    throw new TypeError("Stored assessment must contain 1-100 questions");
  }
  return questions.map((question, index) => {
    if (!question || typeof question.question !== "string" || !question.question.trim() ||
        typeof question.answer !== "string" || !question.answer.trim() ||
        question.question.length > 5000 || question.answer.length > MAX_RESPONSE_LENGTH ||
        (question.options != null && (
          !Array.isArray(question.options) || question.options.length < 2 ||
          question.options.length > 20 || question.options.some(
            option => typeof option !== "string" || !option.trim() || option.length > 2000
          )
        ))) {
      throw new TypeError(`Invalid stored question at index ${index}`);
    }
    return {
      id: index,
      question: question.question,
      options: question.options ?? null,
      answer: question.answer
    };
  });
}

export function publicAssessmentQuestions(snapshot) {
  // Explicitly rebuild a strict public schema. Never forward untrusted option objects.
  return snapshot.map(({ id, question, options }) => ({
    id, question, options: options ? [...options] : null
  }));
}

export function gradeAssessment(snapshot, responses) {
  if (!Array.isArray(snapshot) || !snapshot.length || !Array.isArray(responses) ||
      responses.length !== snapshot.length) throw new TypeError("Responses must match the assessment");
  const details = snapshot.map((question, i) => {
    const response = responses[i];
    if (typeof response !== "string" || response.length > MAX_RESPONSE_LENGTH) {
      throw new TypeError("Each response must be a string of at most 2000 characters");
    }
    const correct = response.trim().normalize("NFKC") === question.answer.trim().normalize("NFKC");
    return { questionId: question.id, isCorrect: correct, response };
  });
  const correctCount = details.filter(x => x.isCorrect).length;
  return {
    score: Math.round(correctCount / snapshot.length * 100),
    correctCount,
    totalQuestions: snapshot.length,
    details
  };
}
