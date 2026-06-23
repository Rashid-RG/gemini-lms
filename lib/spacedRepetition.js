/**
 * Spaced Repetition Scheduler (SuperMemo SM-2 variant)
 *
 * Pure, side-effect-free scheduling core extracted from the flashcards UI so it
 * can be unit-tested and reused. Given a card's previous schedule and the user's
 * recall rating, it returns the next schedule (repetitions, interval, easeFactor,
 * nextReviewDate).
 *
 * Rating scale (matches the flashcard UI):
 *   1 = "Again"  (failed recall — reset)
 *   3 = "Hard"
 *   4 = "Good"
 *   5 = "Easy"
 */

export const DEFAULT_SCHEDULE = Object.freeze({
  repetitions: 0,
  interval: 1,
  easeFactor: 2.5,
});

export const MIN_EASE_FACTOR = 1.3;

/**
 * Compute the next spaced-repetition schedule for a card.
 *
 * @param {{repetitions:number, interval:number, easeFactor:number}|null} lastSchedule
 *        Previous schedule, or null/undefined for a brand-new card.
 * @param {number} score Recall rating (1 = Again, 3 = Hard, 4 = Good, 5 = Easy).
 * @param {Date} [now=new Date()] Reference date (injectable for deterministic tests).
 * @returns {{repetitions:number, interval:number, easeFactor:number,
 *            nextReviewDate:string, lastRatedScore:number}}
 */
export function scheduleCard(lastSchedule, score, now = new Date()) {
  const last = lastSchedule || { ...DEFAULT_SCHEDULE };

  let repetitions = last.repetitions ?? 0;
  let interval = last.interval ?? 1;
  let easeFactor = last.easeFactor ?? 2.5;

  if (score === 1) {
    // Failed recall — reset the card to be seen again tomorrow.
    repetitions = 0;
    interval = 1;
  } else {
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 3;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
    // SM-2 ease-factor adjustment, clamped to a sane floor.
    easeFactor = Math.max(
      MIN_EASE_FACTOR,
      easeFactor + (0.1 - (5 - score) * (0.08 + (5 - score) * 0.02))
    );
  }

  const nextReviewDate = new Date(now.getTime());
  nextReviewDate.setDate(nextReviewDate.getDate() + interval);

  return {
    repetitions,
    interval,
    easeFactor,
    nextReviewDate: nextReviewDate.toISOString(),
    lastRatedScore: score,
  };
}

/**
 * Whether a card is due for review at the given time.
 * @param {{nextReviewDate:string}} schedule
 * @param {Date} [now=new Date()]
 * @returns {boolean}
 */
export function isDue(schedule, now = new Date()) {
  if (!schedule?.nextReviewDate) return true;
  return new Date(schedule.nextReviewDate).getTime() <= now.getTime();
}
