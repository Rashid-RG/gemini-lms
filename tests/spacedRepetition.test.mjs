import { describe, it, expect } from './harness.mjs';
import { scheduleCard, isDue, DEFAULT_SCHEDULE, MIN_EASE_FACTOR } from '../lib/spacedRepetition.js';

const FIXED_NOW = new Date('2026-06-23T00:00:00.000Z');
const daysAfter = (n) => {
  const d = new Date(FIXED_NOW.getTime());
  d.setDate(d.getDate() + n);
  return d.toISOString();
};

describe('scheduleCard — SM-2 scheduler', () => {
  it('schedules a brand-new card 1 day out on first good recall', () => {
    const next = scheduleCard(null, 4, FIXED_NOW);
    expect(next.repetitions).toBe(1);
    expect(next.interval).toBe(1);
    expect(next.nextReviewDate).toBe(daysAfter(1));
  });

  it('uses a 3-day interval on the second consecutive success', () => {
    const first = scheduleCard(null, 4, FIXED_NOW);
    const second = scheduleCard(first, 4, FIXED_NOW);
    expect(second.repetitions).toBe(2);
    expect(second.interval).toBe(3);
    expect(second.nextReviewDate).toBe(daysAfter(3));
  });

  it('multiplies interval by ease factor from the third success onward', () => {
    let s = scheduleCard(null, 4, FIXED_NOW); // rep1, interval 1
    s = scheduleCard(s, 4, FIXED_NOW);        // rep2, interval 3
    const third = scheduleCard(s, 4, FIXED_NOW); // rep3 => round(3 * ef)
    expect(third.repetitions).toBe(3);
    expect(third.interval).toBe(Math.round(3 * s.easeFactor));
  });

  it('resets repetitions and interval on a failed recall (score 1)', () => {
    let s = scheduleCard(null, 4, FIXED_NOW);
    s = scheduleCard(s, 4, FIXED_NOW);
    const failed = scheduleCard(s, 1, FIXED_NOW);
    expect(failed.repetitions).toBe(0);
    expect(failed.interval).toBe(1);
    expect(failed.nextReviewDate).toBe(daysAfter(1));
  });

  it('does not change the ease factor on a failed recall', () => {
    const s = scheduleCard(null, 4, FIXED_NOW);
    const failed = scheduleCard(s, 1, FIXED_NOW);
    expect(failed.easeFactor).toBe(s.easeFactor);
  });

  it('raises the ease factor for an easy (5) rating', () => {
    const next = scheduleCard(DEFAULT_SCHEDULE, 5, FIXED_NOW);
    expect(next.easeFactor).toBeGreaterThan(DEFAULT_SCHEDULE.easeFactor);
  });

  it('lowers the ease factor for a hard (3) rating', () => {
    const next = scheduleCard(DEFAULT_SCHEDULE, 3, FIXED_NOW);
    expect(next.easeFactor).toBeLessThan(DEFAULT_SCHEDULE.easeFactor);
  });

  it('never lets the ease factor fall below the SM-2 floor of 1.3', () => {
    let s = { repetitions: 5, interval: 30, easeFactor: 1.3 };
    // Repeated "hard" ratings must not push EF under the floor.
    for (let i = 0; i < 10; i++) s = scheduleCard(s, 3, FIXED_NOW);
    expect(s.easeFactor).toBeGreaterThanOrEqual(MIN_EASE_FACTOR);
  });

  it('matches the exact EF formula for a Good (4) rating from default', () => {
    // ef + (0.1 - (5-4)*(0.08 + (5-4)*0.02)) = 2.5 + (0.1 - 0.1) = 2.5
    const next = scheduleCard(DEFAULT_SCHEDULE, 4, FIXED_NOW);
    expect(next.easeFactor).toBeCloseTo(2.5, 10);
  });
});

describe('isDue', () => {
  it('treats a card with no schedule as due', () => {
    expect(isDue(undefined, FIXED_NOW)).toBe(true);
  });

  it('is due when the review date has passed', () => {
    expect(isDue({ nextReviewDate: daysAfter(-1) }, FIXED_NOW)).toBe(true);
  });

  it('is not due when the review date is in the future', () => {
    expect(isDue({ nextReviewDate: daysAfter(2) }, FIXED_NOW)).toBe(false);
  });
});
