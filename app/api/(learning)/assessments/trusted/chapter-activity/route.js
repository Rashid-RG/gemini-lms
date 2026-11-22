import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { and, eq, gt, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "@/configs/db";
import { STUDY_MATERIAL_TABLE, TRUSTED_CHAPTER_SESSION_TABLE } from "@/configs/schema";
import { requireUserAuth } from "@/lib/userApiAuth";
import { checkRateLimit } from "@/lib/rateLimit";

// Experimental server-observed learning activity, NOT completion evidence.
// No learner-provided timestamps or durations and no changes to progress/grades.
const enabled = () => process.env.TRUSTED_ASSESSMENTS_ENABLED === "true" &&
  process.env.TRUSTED_CHAPTER_ACTIVITY_ENABLED === "true";
const noStore = { "Cache-Control": "no-store" };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getAccessibleCourse(courseId, email) {
  const [course] = await db.select({
    courseLayout: STUDY_MATERIAL_TABLE.courseLayout
  }).from(STUDY_MATERIAL_TABLE).where(and(
    eq(STUDY_MATERIAL_TABLE.courseId, courseId),
    or(
      eq(STUDY_MATERIAL_TABLE.createdBy, email),
      and(eq(STUDY_MATERIAL_TABLE.isPublic, true),
        sql`COALESCE(${STUDY_MATERIAL_TABLE.price}, 0) = 0`),
      sql`EXISTS (SELECT 1 FROM "courseEnrollments" e
        WHERE e."courseId" = ${courseId} AND e."studentEmail" = ${email}
          AND e.status = 'Active')`
    )
  )).limit(1);
  return course;
}

export async function POST(req) {
  if (!enabled()) return NextResponse.json({ error: "Chapter activity pilot disabled" }, { status: 503 });
  const access = await requireUserAuth(req);
  if (!access.authenticated || !access.email) return access.error ||
    NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const throttle = checkRateLimit(access.userId || access.email, "assignment");
  if (throttle.limited) return NextResponse.json({ error: "Too many activity requests" },
    { status: 429, headers: { ...noStore, "Retry-After": String(Math.max(1, Math.ceil(throttle.resetIn / 1000))) } });
  let payload;
  try { payload = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { action, courseId, chapterIndex, sessionId } = payload || {};
  if (typeof courseId !== "string" || !courseId.trim() || courseId.length > 255 ||
      !Number.isSafeInteger(chapterIndex) || chapterIndex < 0 || chapterIndex >= 200 ||
      !["start", "heartbeat", "close"].includes(action)) {
    return NextResponse.json({ error: "Invalid chapter activity request" }, { status: 400 });
  }
  try {
    const course = await getAccessibleCourse(courseId, access.email);
    const chapterCount = course?.courseLayout?.chapters?.length;
    if (!Number.isSafeInteger(chapterCount) || chapterCount < 1 ||
        chapterCount > 200 || chapterIndex >= chapterCount) {
      return NextResponse.json({ error: "Chapter unavailable" }, { status: 404 });
    }

    if (action === "start") {
      if (sessionId !== undefined) return NextResponse.json({ error: "Session ID is server-generated" }, { status: 400 });
      const id = crypto.randomUUID();
      const now = new Date();
      const expiry = new Date(now.getTime() + 30 * 60_000);
      await db.insert(TRUSTED_CHAPTER_SESSION_TABLE).values({
        id, studentEmail: access.email, courseId, chapterIndex,
        startedAt: now, lastHeartbeatAt: now, expiresAt: expiry
      });
      return NextResponse.json({
        sessionId: id, chapterIndex, expiresAt: expiry.toISOString(),
        evidenceType: "server_observed_activity", chapterCompletionVerified: false
      }, { status: 201, headers: noStore });
    }

    if (typeof sessionId !== "string" || !uuidPattern.test(sessionId)) {
      return NextResponse.json({ error: "Invalid activity session" }, { status: 400 });
    }
    const identity = and(
      eq(TRUSTED_CHAPTER_SESSION_TABLE.id, sessionId),
      eq(TRUSTED_CHAPTER_SESSION_TABLE.studentEmail, access.email),
      eq(TRUSTED_CHAPTER_SESSION_TABLE.courseId, courseId),
      eq(TRUSTED_CHAPTER_SESSION_TABLE.chapterIndex, chapterIndex),
      isNull(TRUSTED_CHAPTER_SESSION_TABLE.closedAt)
    );
    if (action === "heartbeat") {
      const now = new Date();
      const [updated] = await db.update(TRUSTED_CHAPTER_SESSION_TABLE).set({
        heartbeatCount: sql`${TRUSTED_CHAPTER_SESSION_TABLE.heartbeatCount} + 1`,
        lastHeartbeatAt: now
      }).where(and(
        identity,
        gt(TRUSTED_CHAPTER_SESSION_TABLE.expiresAt, now),
        lte(TRUSTED_CHAPTER_SESSION_TABLE.lastHeartbeatAt, new Date(now.getTime() - 30_000))
      )).returning({ heartbeatCount: TRUSTED_CHAPTER_SESSION_TABLE.heartbeatCount });
      if (!updated) return NextResponse.json({
        error: "Activity session unavailable or heartbeat too frequent"
      }, { status: 409, headers: noStore });
      return NextResponse.json({
        accepted: true, heartbeatCount: updated.heartbeatCount,
        chapterCompletionVerified: false
      }, { headers: noStore });
    }

    const now = new Date();
    const [closed] = await db.update(TRUSTED_CHAPTER_SESSION_TABLE).set({
      closedAt: now
    }).where(identity).returning({ id: TRUSTED_CHAPTER_SESSION_TABLE.id });
    if (!closed) return NextResponse.json({ error: "Activity session already closed or unavailable" },
      { status: 409, headers: noStore });
    return NextResponse.json({
      closed: true, chapterCompletionVerified: false
    }, { headers: noStore });
  } catch (error) {
    console.error("Trusted chapter activity failed", error);
    return NextResponse.json({ error: "Unable to record chapter activity" }, { status: 500 });
  }
}
