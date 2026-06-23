import { describe, it, expect } from './harness.mjs';
import {
  gradeAnswer,
  gradeQuiz,
  calculateProgress,
  shouldIssueCertificate,
} from '../lib/gradingEngine.js';

describe('gradeAnswer — multiple choice', () => {
  it('scores a correct option 100', () => {
    const r = gradeAnswer({ type: 'multiple-choice', correctOption: 2 }, 2);
    expect(r.isCorrect).toBe(true);
    expect(r.score).toBe(100);
  });

  it('scores a wrong option 0', () => {
    const r = gradeAnswer({ type: 'multiple-choice', correctOption: 2 }, 0);
    expect(r.isCorrect).toBe(false);
    expect(r.score).toBe(0);
  });
});

describe('gradeAnswer — true/false', () => {
  it('maps correctOption 0 to True', () => {
    const r = gradeAnswer({ type: 'true-false', correctOption: 0 }, true);
    expect(r.isCorrect).toBe(true);
  });

  it('marks a mismatch incorrect', () => {
    const r = gradeAnswer({ type: 'true-false', correctOption: 1 }, true);
    expect(r.isCorrect).toBe(false);
    expect(r.score).toBe(0);
  });
});

describe('gradeAnswer — short answer', () => {
  it('gives full credit on an exact match', () => {
    const r = gradeAnswer({ type: 'short-answer', options: ['Photosynthesis'] }, 'photosynthesis');
    expect(r.score).toBe(100);
    expect(r.isCorrect).toBe(true);
  });

  it('awards partial credit when only some keyword groups match', () => {
    const q = { type: 'short-answer', options: ['mitochondria|powerhouse'] };
    const r = gradeAnswer(q, 'the mitochondria is important');
    expect(r.score).toBe(50);
    expect(r.isCorrect).toBe(false);
  });

  it('is full credit when every keyword group is present', () => {
    const q = { type: 'short-answer', options: ['mitochondria|powerhouse'] };
    const r = gradeAnswer(q, 'the mitochondria is the powerhouse');
    expect(r.score).toBe(100);
    expect(r.isCorrect).toBe(true);
  });
});

describe('gradeAnswer — fill in the blank', () => {
  it('accepts any of the pipe-separated answers, case-insensitively', () => {
    const q = { type: 'fill-blank', options: ['Paris|paris city'] };
    expect(gradeAnswer(q, 'PARIS').score).toBe(100);
  });

  it('rejects an unlisted answer', () => {
    const q = { type: 'fill-blank', options: ['Paris'] };
    expect(gradeAnswer(q, 'London').score).toBe(0);
  });
});

describe('gradeAnswer — matching', () => {
  const correct = [{ from: 0, to: 1 }, { from: 1, to: 0 }];

  it('gives 100 for a fully correct mapping', () => {
    const r = gradeAnswer({ type: 'matching', options: correct }, correct);
    expect(r.score).toBe(100);
    expect(r.isCorrect).toBe(true);
  });

  it('gives partial credit for a half-correct mapping', () => {
    const student = [{ from: 0, to: 1 }, { from: 1, to: 9 }];
    const r = gradeAnswer({ type: 'matching', options: correct }, student);
    expect(r.score).toBe(50);
    expect(r.isCorrect).toBe(false);
  });

  it('handles a non-array answer gracefully', () => {
    const r = gradeAnswer({ type: 'matching', options: correct }, null);
    expect(r.score).toBe(0);
    expect(r.feedback).toMatch(/invalid/i);
  });
});

describe('gradeAnswer — essay', () => {
  it('defers to manual review (null score / isCorrect)', () => {
    const r = gradeAnswer(
      { type: 'essay', options: ['a model answer about gravity and motion'] },
      'gravity affects motion of every object'
    );
    expect(r.score).toBeNull();
    expect(r.isCorrect).toBeNull();
    expect(r.status).toBe('pending_review');
    expect(typeof r.similarity).toBe('number');
  });
});

describe('gradeAnswer — unknown type', () => {
  it('returns a zero score for an unrecognised question type', () => {
    const r = gradeAnswer({ type: 'nonsense' }, 'whatever');
    expect(r.score).toBe(0);
    expect(r.isCorrect).toBe(false);
  });
});

describe('gradeQuiz', () => {
  it('errors when question and answer counts differ', () => {
    const r = gradeQuiz([{ type: 'multiple-choice', correctOption: 0 }], []);
    expect(r.error).toBeDefined();
    expect(r.isPassed).toBe(false);
  });

  it('averages auto-graded questions and marks a pass at >= 60%', () => {
    const questions = [
      { type: 'multiple-choice', correctOption: 0 },
      { type: 'multiple-choice', correctOption: 1 },
    ];
    const r = gradeQuiz(questions, [0, 1]); // both correct
    expect(r.averageScore).toBe(100);
    expect(r.isPassed).toBe(true);
  });

  it('marks a fail below the 60% threshold', () => {
    const questions = [
      { type: 'multiple-choice', correctOption: 0 },
      { type: 'multiple-choice', correctOption: 1 },
    ];
    const r = gradeQuiz(questions, [0, 9]); // one correct, one wrong => 50%
    expect(r.averageScore).toBe(50);
    expect(r.isPassed).toBe(false);
  });

  it('excludes essays (null score) from the average and flags pending review', () => {
    const questions = [
      { type: 'multiple-choice', correctOption: 0 },
      { type: 'essay', options: ['model'] },
    ];
    const r = gradeQuiz(questions, [0, 'an essay answer']);
    // Only the MCQ counts toward the average.
    expect(r.averageScore).toBe(100);
    expect(r.pendingReview).toBe(true);
  });
});

describe('calculateProgress', () => {
  it('weights chapters and quizzes 50/50', () => {
    expect(calculateProgress(5, 10, 2, 4)).toBe(50); // 25 + 25
    expect(calculateProgress(10, 10, 4, 4)).toBe(100);
    expect(calculateProgress(0, 10, 0, 4)).toBe(0);
  });

  it('avoids division by zero when there are no chapters/quizzes', () => {
    expect(calculateProgress(0, 0, 0, 0)).toBe(0);
  });
});

describe('shouldIssueCertificate', () => {
  it('issues only at 100% completion and a sufficient average', () => {
    expect(shouldIssueCertificate(100, 75)).toBe(true);
    expect(shouldIssueCertificate(100, 59)).toBe(false);
    expect(shouldIssueCertificate(99, 90)).toBe(false);
  });
});
