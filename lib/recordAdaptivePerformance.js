import { db } from "@/configs/db";
import { ADAPTIVE_PERFORMANCE_TABLE } from "@/configs/schema";
import { and, eq } from "drizzle-orm";
import { calculatePerformanceMetrics } from "@/lib/adaptiveDifficulty";

// Server-only performance recording. Call from an authenticated route after
// deriving studentEmail from the session, never from arbitrary request headers.
export async function recordAdaptivePerformance({
  courseId, studentEmail, topicId, topicName, score
}) {
  if (typeof courseId !== "string" || !courseId.trim() ||
      typeof studentEmail !== "string" || !studentEmail.trim() ||
      typeof topicId !== "string" || !topicId.trim() ||
      typeof topicName !== "string" || !topicName.trim() ||
      typeof score !== "number" || !Number.isFinite(score) || score < 0 || score > 100) {
    throw new TypeError("Invalid adaptive performance data");
  }

  const condition = and(
    eq(ADAPTIVE_PERFORMANCE_TABLE.courseId, courseId),
    eq(ADAPTIVE_PERFORMANCE_TABLE.studentEmail, studentEmail),
    eq(ADAPTIVE_PERFORMANCE_TABLE.topicId, topicId)
  );
  const [existing] = await db.select().from(ADAPTIVE_PERFORMANCE_TABLE)
    .where(condition).limit(1);
  const metrics = calculatePerformanceMetrics(existing || null, score, topicName);
  const values = {
    totalAttempts: metrics.totalAttempts,
    correctAnswers: metrics.correctAnswers,
    averageScore: metrics.averageScore,
    recommendedDifficulty: metrics.recommendedDifficulty,
    currentDifficulty: metrics.currentDifficulty,
    masteryLevel: metrics.masteryLevel,
    isWeakTopic: metrics.isWeakTopic,
    lastAttemptAt: metrics.lastAttemptAt,
    updatedAt: metrics.updatedAt
  };

  if (existing) {
    const [record] = await db.update(ADAPTIVE_PERFORMANCE_TABLE)
      .set(values).where(condition).returning();
    return { record, isNew: false };
  }
  const [record] = await db.insert(ADAPTIVE_PERFORMANCE_TABLE).values({
    courseId, studentEmail, topicId, topicName, ...values
  }).returning();
  return { record, isNew: true };
}
