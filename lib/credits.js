import { db } from "@/configs/db";
import { USER_TABLE, CREDIT_TRANSACTION_TABLE } from "@/configs/schema";
import { eq } from "drizzle-orm";
import { withDbRetry } from "@/lib/dbUtils";

/**
 * Credit transaction types
 */
export const CREDIT_TYPES = {
  COURSE_CREATION: 'course_creation',
  REFUND: 'refund',
  PURCHASE: 'purchase',
  BONUS: 'bonus',
  ADMIN_ADJUSTMENT: 'admin_adjustment',
  MEMBERSHIP_BONUS: 'membership_bonus'
};

/**
 * Get user's current credit balance
 * @param {string} email - User email
 * @returns {Promise<{credits: number, user: object} | null>}
 */
export async function getUserCredits(email) {
  if (!email) return null;
  
  const users = await withDbRetry(() => 
    db.select().from(USER_TABLE).where(eq(USER_TABLE.email, email))
  );
  
  if (users.length === 0) return null;
  
  return {
    credits: users[0].credits ?? 5,
    user: users[0]
  };
}

/**
 * Check if user has enough credits
 * @param {string} email - User email
 * @param {number} amount - Credits needed
 * @returns {Promise<boolean>}
 */
export async function hasEnoughCredits(email, amount = 1) {
  const result = await getUserCredits(email);
  if (!result) return false;
  return result.credits >= amount;
}

/**
 * Deduct credits from user with transaction logging
 * @param {string} email - User email
 * @param {number} amount - Credits to deduct (positive number)
 * @param {object} options - Transaction options
 * @returns {Promise<{success: boolean, newBalance?: number, error?: string}>}
 */
export async function deductCredits(email, amount = 1, options = {}) {
  const {
    type = CREDIT_TYPES.COURSE_CREATION,
    reason = 'Course creation',
    courseId = null,
    createdBy = 'system'
  } = options;

  if (amount <= 0) {
    return { success: false, error: 'Amount must be positive' };
  }

  const userResult = await getUserCredits(email);
  if (!userResult) {
    return { success: false, error: 'User not found' };
  }

  const { credits: currentBalance, user } = userResult;

  if (currentBalance < amount) {
    return { success: false, error: 'Insufficient credits', currentBalance };
  }

  const newBalance = currentBalance - amount;

  // Update user credits (with retry)
  await withDbRetry(() => 
    db.update(USER_TABLE)
      .set({ 
        credits: newBalance,
        totalCreditsUsed: (user.totalCreditsUsed || 0) + amount,
        updatedAt: new Date()
      })
      .where(eq(USER_TABLE.email, email))
  );

  // Log transaction (with retry)
  await withDbRetry(() => 
    db.insert(CREDIT_TRANSACTION_TABLE).values({
      userEmail: email,
      amount: -amount,
      type,
      reason,
      courseId,
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
      createdBy
    })
  );

  return { success: true, newBalance };
}

/**
 * Add credits to user with transaction logging
 * @param {string} email - User email
 * @param {number} amount - Credits to add (positive number)
 * @param {object} options - Transaction options
 * @returns {Promise<{success: boolean, newBalance?: number, error?: string}>}
 */
export async function addCredits(email, amount = 1, options = {}) {
  const {
    type = CREDIT_TYPES.REFUND,
    reason = 'Credit refund',
    courseId = null,
    createdBy = 'system'
  } = options;

  if (amount <= 0) {
    return { success: false, error: 'Amount must be positive' };
  }

  const userResult = await getUserCredits(email);
  if (!userResult) {
    return { success: false, error: 'User not found' };
  }

  const { credits: currentBalance } = userResult;
  const newBalance = currentBalance + amount;

  // Update user credits (with retry)
  await withDbRetry(() => 
    db.update(USER_TABLE)
      .set({ 
        credits: newBalance,
        updatedAt: new Date()
      })
      .where(eq(USER_TABLE.email, email))
  );

  // Log transaction (with retry)
  await withDbRetry(() => 
    db.insert(CREDIT_TRANSACTION_TABLE).values({
      userEmail: email,
      amount: amount,
      type,
      reason,
      courseId,
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
      createdBy
    })
  );

  return { success: true, newBalance };
}

/**
 * Refund credits for a failed course
 * @param {string} email - User email
 * @param {string} courseId - Course ID being refunded
 * @param {string} reason - Reason for refund
 * @returns {Promise<{success: boolean, newBalance?: number, error?: string}>}
 */
export async function refundCourseCredits(email, courseId, reason = 'Course generation failed') {
  return addCredits(email, 1, {
    type: CREDIT_TYPES.REFUND,
    reason,
    courseId,
    createdBy: 'system'
  });
}

/**
 * Get credit transaction history for a user
 * @param {string} email - User email
 * @param {number} limit - Max transactions to return
 * @returns {Promise<Array>}
 */
export async function getCreditHistory(email, limit = 50) {
  if (!email) return [];
  
  const transactions = await db.select()
    .from(CREDIT_TRANSACTION_TABLE)
    .where(eq(CREDIT_TRANSACTION_TABLE.userEmail, email))
    .orderBy(CREDIT_TRANSACTION_TABLE.createdAt)
    .limit(limit);
  
  return transactions;
}

/**
 * Initialize credits for a new user (called during user creation)
 * @param {string} email - User email
 * @param {number} initialCredits - Starting credits (default 5)
 * @returns {Promise<void>}
 */
export async function initializeUserCredits(email, initialCredits = 5) {
  // Log the initial credit grant
  await db.insert(CREDIT_TRANSACTION_TABLE).values({
    userEmail: email,
    amount: initialCredits,
    type: CREDIT_TYPES.BONUS,
    reason: 'Welcome bonus - new account',
    balanceBefore: 0,
    balanceAfter: initialCredits,
    createdBy: 'system'
  });
}
