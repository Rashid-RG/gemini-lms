import { db } from "@/configs/db";
import { USER_TABLE, CREDIT_TRANSACTION_TABLE, STUDY_MATERIAL_TABLE, PAYMENT_RECORD_TABLE } from "@/configs/schema";
import { eq, and, ne, sql, desc } from "drizzle-orm";
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
 * @returns {Promise<{credits: number, totalCreditsLimit: number, user: object} | null>}
 */
export async function getUserCredits(email) {
  if (!email) return null;
  const normalizedEmail = email.trim().toLowerCase();
  
  const users = await withDbRetry(() => 
    db.select().from(USER_TABLE).where(eq(USER_TABLE.email, normalizedEmail))
  );
  
  if (users.length === 0) return null;
  const user = users[0];

  if (user.isMember) {
    try {
      const latestSubscription = await withDbRetry(() =>
        db.select()
          .from(PAYMENT_RECORD_TABLE)
          .where(and(
            eq(PAYMENT_RECORD_TABLE.userEmail, normalizedEmail),
            eq(PAYMENT_RECORD_TABLE.status, 'completed'),
            eq(PAYMENT_RECORD_TABLE.planType, 'subscription')
          ))
          .orderBy(desc(PAYMENT_RECORD_TABLE.createdAt))
          .limit(1)
      );

      if (latestSubscription.length > 0) {
        const sub = latestSubscription[0];
        const createdAt = new Date(sub.createdAt);
        const durationDays = sub.plan === 'premium_yearly' ? 365 : 30;
        const expirationDate = new Date(createdAt.getTime() + durationDays * 24 * 60 * 60 * 1000);
        const now = new Date();

        if (now > expirationDate) {
          console.log(`[Subscription Expired] Resetting membership for ${normalizedEmail}. Purchase date: ${sub.createdAt}, Expired on: ${expirationDate}`);
          // Reset membership status in DB
          await withDbRetry(() =>
            db.update(USER_TABLE)
              .set({ isMember: false, updatedAt: new Date() })
              .where(eq(USER_TABLE.email, normalizedEmail))
          );
          user.isMember = false;
          // Invalidate user cache if there's any caching mechanism
          try {
            const { invalidateUserCache } = require('@/lib/cache');
            invalidateUserCache(normalizedEmail);
          } catch (e) {
            // Ignore if cache module cannot be resolved
          }
        }
      }
    } catch (subError) {
      console.error(`[Subscription Expiration Check] Error checking subscription for ${normalizedEmail}:`, subError.message);
    }
  }

  if (user.isMember) {
    return {
      credits: user.credits ?? 999999,
      totalCreditsLimit: 999999,
      user
    };
  }

  let totalCreditsLimit = 5;

  // Self-healing / Dynamic Sync of credits
  try {
    // 1. Count active courses created by this user (exclude failed ones)
    const activeCoursesResult = await withDbRetry(() =>
      db.select({ count: sql`count(*)` })
        .from(STUDY_MATERIAL_TABLE)
        .where(and(
          eq(STUDY_MATERIAL_TABLE.createdBy, normalizedEmail),
          ne(STUDY_MATERIAL_TABLE.status, 'Failed'),
          ne(STUDY_MATERIAL_TABLE.status, 'Error')
        ))
    );
    const activeCoursesCount = Number(activeCoursesResult[0]?.count || 0);

    // 2. Sum up positive transactions that grant credits (welcome bonus, purchases, admin edits, excluding unlimited membership transactions)
    const additionsResult = await withDbRetry(() =>
      db.select({ sum: sql`sum(${CREDIT_TRANSACTION_TABLE.amount})` })
        .from(CREDIT_TRANSACTION_TABLE)
        .where(and(
          eq(CREDIT_TRANSACTION_TABLE.userEmail, normalizedEmail),
          sql`${CREDIT_TRANSACTION_TABLE.amount} > 0`,
          sql`${CREDIT_TRANSACTION_TABLE.amount} < 999999`,
          sql`${CREDIT_TRANSACTION_TABLE.type} in ('purchase', 'bonus', 'admin_adjustment', 'membership_bonus')`
        ))
    );
    const totalAdditions = Number(additionsResult[0]?.sum || 0);

    // Check if user has welcome bonus in the transaction logs. If not, they are an old user, so we assume they had a 5 credit welcome bonus.
    const welcomeBonusCount = await withDbRetry(() =>
      db.select({ count: sql`count(*)` })
        .from(CREDIT_TRANSACTION_TABLE)
        .where(and(
          eq(CREDIT_TRANSACTION_TABLE.userEmail, normalizedEmail),
          eq(CREDIT_TRANSACTION_TABLE.type, 'bonus'),
          eq(CREDIT_TRANSACTION_TABLE.reason, 'Welcome bonus - new account')
        ))
    );
    const hasWelcomeBonusLog = Number(welcomeBonusCount[0]?.count || 0) > 0;

    let baseCredits = 5;
    if (hasWelcomeBonusLog) {
      baseCredits = 0;
    }

    totalCreditsLimit = baseCredits + totalAdditions;

    // 3. Compute expected available credits
    const expectedCredits = Math.max(0, totalCreditsLimit - activeCoursesCount);

    // 4. Update the DB if they don't match (heal the drift)
    if (user.credits !== expectedCredits) {
      console.log(`[Credits Sync] Curing credit drift for ${normalizedEmail}. DB: ${user.credits}, Expected: ${expectedCredits}`);
      await withDbRetry(() =>
        db.update(USER_TABLE)
          .set({ credits: expectedCredits, updatedAt: new Date() })
          .where(eq(USER_TABLE.email, normalizedEmail))
      );
      user.credits = expectedCredits;
    }
  } catch (syncError) {
    console.error(`[Credits Sync] Error syncing credits for ${normalizedEmail}:`, syncError.message);
  }

  return {
    credits: user.credits ?? 5,
    totalCreditsLimit: totalCreditsLimit,
    user
  };
}

/**
 * Check if user has enough credits
 * @param {string} email - User email
 * @param {number} amount - Credits needed
 * @returns {Promise<boolean>}
 */
export async function hasEnoughCredits(email, amount = 1) {
  const normalizedEmail = email.trim().toLowerCase();
  const result = await getUserCredits(normalizedEmail);
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
  const normalizedEmail = email.trim().toLowerCase();
  const {
    type = CREDIT_TYPES.COURSE_CREATION,
    reason = 'Course creation',
    courseId = null,
    createdBy = 'system'
  } = options;

  if (amount <= 0) {
    return { success: false, error: 'Amount must be positive' };
  }

  const userResult = await getUserCredits(normalizedEmail);
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
      .where(eq(USER_TABLE.email, normalizedEmail))
  );

  // Log transaction (with retry)
  await withDbRetry(() => 
    db.insert(CREDIT_TRANSACTION_TABLE).values({
      userEmail: normalizedEmail,
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
  const normalizedEmail = email.trim().toLowerCase();
  const {
    type = CREDIT_TYPES.REFUND,
    reason = 'Credit refund',
    courseId = null,
    createdBy = 'system'
  } = options;

  if (amount <= 0) {
    return { success: false, error: 'Amount must be positive' };
  }

  const userResult = await getUserCredits(normalizedEmail);
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
      .where(eq(USER_TABLE.email, normalizedEmail))
  );

  // Log transaction (with retry)
  await withDbRetry(() => 
    db.insert(CREDIT_TRANSACTION_TABLE).values({
      userEmail: normalizedEmail,
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
  const normalizedEmail = email.trim().toLowerCase();
  return addCredits(normalizedEmail, 1, {
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
  const normalizedEmail = email.trim().toLowerCase();
  
  const transactions = await db.select()
    .from(CREDIT_TRANSACTION_TABLE)
    .where(eq(CREDIT_TRANSACTION_TABLE.userEmail, normalizedEmail))
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
  const normalizedEmail = email.trim().toLowerCase();
  // Log the initial credit grant
  await db.insert(CREDIT_TRANSACTION_TABLE).values({
    userEmail: normalizedEmail,
    amount: initialCredits,
    type: CREDIT_TYPES.BONUS,
    reason: 'Welcome bonus - new account',
    balanceBefore: 0,
    balanceAfter: initialCredits,
    createdBy: 'system'
  });
}
