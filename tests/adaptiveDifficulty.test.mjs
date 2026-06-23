import { describe, it, expect } from './harness.mjs';
import {
  calculateMasteryLevel,
  recommendDifficulty,
  isWeakTopic,
  calculatePerformanceMetrics,
  getTopicsNeedingReview,
  calculateEngagementScore,
  getMasterySummary,
} from '../lib/adaptiveDifficulty.js';

describe('calculateMasteryLevel', () => {
  it('returns novice when there are no attempts', () => {
    expect(calculateMasteryLevel(90, 0)).toBe('novice');
  });

  it('classifies a strong, repeated performer as expert', () => {
    expect(calculateMasteryLevel(88, 3)).toBe('expert');
  });

  it('walks down the tiers as the score drops', () => {
    expect(calculateMasteryLevel(82, 1)).toBe('proficient');
    expect(calculateMasteryLevel(72, 1)).toBe('intermediate');
    expect(calculateMasteryLevel(62, 1)).toBe('beginner');
    expect(calculateMasteryLevel(40, 1)).toBe('novice');
  });
});

describe('recommendDifficulty', () => {
  it('steps difficulty up after strong, repeated scores', () => {
    expect(recommendDifficulty(90, 2, 'Easy')).toBe('Medium');
    expect(recommendDifficulty(90, 2, 'Medium')).toBe('Hard');
  });

  it('caps at Hard and does not overflow', () => {
    expect(recommendDifficulty(95, 5, 'Hard')).toBe('Hard');
  });

  it('steps down after weak, repeated scores', () => {
    expect(recommendDifficulty(40, 2, 'Hard')).toBe('Medium');
    expect(recommendDifficulty(40, 2, 'Easy')).toBe('Easy'); // floor
  });

  it('holds the current difficulty in the middle band', () => {
    expect(recommendDifficulty(75, 1, 'Medium')).toBe('Medium');
  });
});

describe('isWeakTopic', () => {
  it('flags a single low first attempt', () => {
    expect(isWeakTopic(65, 1, 65)).toBe(true);
    expect(isWeakTopic(80, 1, 80)).toBe(false);
  });

  it('flags a poor average over multiple attempts', () => {
    expect(isWeakTopic(70, 3, 70)).toBe(true);  // avg < 75
    expect(isWeakTopic(80, 3, 80)).toBe(false);
  });

  it('flags a bad recent score even when the average is healthy', () => {
    expect(isWeakTopic(85, 3, 55)).toBe(true);  // recentScore < 60
  });
});

describe('calculatePerformanceMetrics', () => {
  it('initialises a record from scratch', () => {
    const m = calculatePerformanceMetrics(null, 80, 'Loops');
    expect(m.totalAttempts).toBe(1);
    expect(m.averageScore).toBe(80);
    expect(m.correctAnswers).toBe(1); // 80 >= 45
    expect(m.masteryLevel).toBe('proficient');
  });

  it('keeps a correct running average across attempts', () => {
    const first = calculatePerformanceMetrics(null, 60, 'Loops');
    const second = calculatePerformanceMetrics(first, 80, 'Loops');
    expect(second.totalAttempts).toBe(2);
    expect(second.averageScore).toBe(70); // (60 + 80) / 2
  });

  it('does not count a failing attempt as a correct answer', () => {
    const m = calculatePerformanceMetrics(null, 30, 'Loops');
    expect(m.correctAnswers).toBe(0); // 30 < 45
  });
});

describe('getTopicsNeedingReview', () => {
  it('returns only weak topics, worst first', () => {
    const records = [
      { topicName: 'A', isWeakTopic: true, averageScore: 55 },
      { topicName: 'B', isWeakTopic: false, averageScore: 90 },
      { topicName: 'C', isWeakTopic: true, averageScore: 40 },
    ];
    const review = getTopicsNeedingReview(records);
    expect(review.map((r) => r.topicName)).toEqual(['C', 'A']);
  });
});

describe('calculateEngagementScore', () => {
  it('is zero without a record', () => {
    expect(calculateEngagementScore(null)).toBe(0);
  });

  it('caps the attempt bonus at 40 and adds the score component', () => {
    // attemptBonus = min(10*10, 40) = 40; scoreBonus = 100 * 0.6 = 60 => 100
    expect(calculateEngagementScore({ totalAttempts: 10, averageScore: 100 })).toBe(100);
  });
});

describe('getMasterySummary', () => {
  it('returns an empty summary for no records', () => {
    const s = getMasterySummary([]);
    expect(s.overallMastery).toBe(0);
    expect(s.weakTopics).toEqual([]);
  });

  it('aggregates mastery buckets and overall average', () => {
    const records = [
      { topicName: 'A', masteryLevel: 'expert', averageScore: 90, isWeakTopic: false, totalAttempts: 3 },
      { topicName: 'B', masteryLevel: 'intermediate', averageScore: 70, isWeakTopic: false, totalAttempts: 2 },
      { topicName: 'C', masteryLevel: 'novice', averageScore: 40, isWeakTopic: true, totalAttempts: 1 },
    ];
    const s = getMasterySummary(records);
    expect(s.topicsMastered).toBe(1);
    expect(s.topicsProficient).toBe(1);
    expect(s.topicsNeedingWork).toBe(1);
    expect(s.overallMastery).toBe(67); // round((90+70+40)/3)
    expect(s.weakTopics).toHaveLength(1);
  });
});
