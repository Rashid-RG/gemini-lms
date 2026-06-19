/**
 * Global application constants to avoid magic numbers and strings
 */

export const INITIAL_USER_CREDITS = 5;

// Stuck course threshold in minutes
export const STALE_COURSE_THRESHOLD_MINUTES = 30;

// Timeout limits for AI operations (in milliseconds)
export const AI_TIMEOUTS = {
  NOTES: 120000,
  STUDY_CONTENT: 120000,
  ASSIGNMENTS: 120000,
  GRADING: 120000,
};

// Credit Transaction types mapping
export const CREDIT_TYPES = {
  COURSE_CREATION: 'course_creation',
  REFUND: 'refund',
  PURCHASE: 'purchase',
  BONUS: 'bonus',
  ADMIN_ADJUSTMENT: 'admin_adjustment',
  MEMBERSHIP_BONUS: 'membership_bonus'
};
