import { db } from "@/configs/db";
import { GRADE_NOTIFICATIONS_TABLE, PARENT_PORTAL_ACCESS_TABLE } from "@/configs/schema";
import { eq, and, desc } from "drizzle-orm";
import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * POST /api/grades/notifications/send
 * Send grade change notification to student and optionally parents
 */
export async function POST(req) {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      courseId,
      studentEmail,
      notificationType = "grade_posted", // grade_posted, grade_changed, comment_added, assignment_due_soon, grade_alert
      assessmentType,
      assessmentId,
      message,
      relatedGrade,
      relatedGradeLetter,
      notifyParents = false,
    } = body;

    if (!courseId || !studentEmail || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const notifications = [];

    // Send to student
    const studentNotif = await db
      .insert(GRADE_NOTIFICATIONS_TABLE)
      .values({
        courseId,
        studentEmail,
        notificationType,
        assessmentType,
        assessmentId,
        message,
        relatedGrade,
        relatedGradeLetter,
        recipientEmail: studentEmail,
        recipientType: "student",
        sentVia: "email", // Could also send in-app
      })
      .returning();

    notifications.push(studentNotif[0]);

    // Send to parents if enabled
    if (notifyParents) {
      const parentAccess = await db
        .select()
        .from(PARENT_PORTAL_ACCESS_TABLE)
        .where(
          and(
            eq(PARENT_PORTAL_ACCESS_TABLE.studentEmail, studentEmail),
            eq(PARENT_PORTAL_ACCESS_TABLE.isActive, true),
            eq(PARENT_PORTAL_ACCESS_TABLE.canViewGrades, true)
          )
        );

      for (const parent of parentAccess) {
        // Skip if access expired
        if (parent.expiresAt && new Date(parent.expiresAt) < new Date()) {
          continue;
        }

        const parentMessage = `${parent.parentName}, your child ${studentEmail} received a grade update in ${courseId}: ${message}`;

        const parentNotif = await db
          .insert(GRADE_NOTIFICATIONS_TABLE)
          .values({
            courseId,
            studentEmail,
            notificationType,
            assessmentType,
            assessmentId,
            message: parentMessage,
            relatedGrade,
            relatedGradeLetter,
            recipientEmail: parent.parentEmail,
            recipientType: "parent",
            sentVia: "email",
          })
          .returning();

        notifications.push(parentNotif[0]);
      }
    }

    // TODO: Send actual emails using emailService
    // For now, just create notification records
    // await emailService.sendGradeNotification(...)

    return NextResponse.json({
      result: {
        success: true,
        notificationsSent: notifications.length,
        notifications,
      },
    });
  } catch (error) {
    console.error("Error sending notifications:", error);
    return NextResponse.json(
      { error: "Failed to send notifications" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/grades/notifications?studentEmail=xxx&unreadOnly=true
 * Get notifications for a student or parent
 */
export async function GET(req) {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clerkUser = await currentUser();
    const requesterEmail = (
      sessionClaims?.email ||
      sessionClaims?.primaryEmailAddress?.emailAddress ||
      clerkUser?.primaryEmailAddress?.emailAddress ||
      clerkUser?.emailAddresses?.[0]?.emailAddress
    )?.toLowerCase();

    const url = new URL(req.url);
    const studentEmail = url.searchParams.get("studentEmail")?.toLowerCase();
    const unreadOnly = url.searchParams.get("unreadOnly") === "true";
    const limit = parseInt(url.searchParams.get("limit") || "50");

    if (!studentEmail) {
      return NextResponse.json(
        { error: "studentEmail is required" },
        { status: 400 }
      );
    }

    if (studentEmail !== requesterEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Build query
    const conditions = [eq(GRADE_NOTIFICATIONS_TABLE.recipientEmail, studentEmail)];
    if (unreadOnly) {
      conditions.push(eq(GRADE_NOTIFICATIONS_TABLE.wasRead, false));
    }

    const notifications = await db
      .select()
      .from(GRADE_NOTIFICATIONS_TABLE)
      .where(and(...conditions))
      .orderBy(desc(GRADE_NOTIFICATIONS_TABLE.createdAt))
      .limit(limit);

    // Count unread
    const unreadCount = await db
      .select()
      .from(GRADE_NOTIFICATIONS_TABLE)
      .where(
        and(
          eq(GRADE_NOTIFICATIONS_TABLE.recipientEmail, studentEmail),
          eq(GRADE_NOTIFICATIONS_TABLE.wasRead, false)
        )
      );

    return NextResponse.json({
      result: {
        notifications,
        unreadCount: unreadCount.length,
      },
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { result: { notifications: [], unreadCount: 0 } },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/grades/notifications/mark-read?id=xxx
 * Mark a notification as read
 */
export async function PUT(req) {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clerkUser = await currentUser();
    const requesterEmail = (
      sessionClaims?.email ||
      sessionClaims?.primaryEmailAddress?.emailAddress ||
      clerkUser?.primaryEmailAddress?.emailAddress ||
      clerkUser?.emailAddresses?.[0]?.emailAddress
    )?.toLowerCase();

    const url = new URL(req.url);
    const notificationId = url.searchParams.get("id");

    if (!notificationId) {
      return NextResponse.json(
        { error: "Notification ID is required" },
        { status: 400 }
      );
    }

    const notification = await db
      .select()
      .from(GRADE_NOTIFICATIONS_TABLE)
      .where(eq(GRADE_NOTIFICATIONS_TABLE.id, notificationId))
      .limit(1);

    if (!notification.length || String(notification[0].recipientEmail || "").toLowerCase() !== requesterEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await db
      .update(GRADE_NOTIFICATIONS_TABLE)
      .set({
        wasRead: true,
        readAt: new Date(),
      })
      .where(eq(GRADE_NOTIFICATIONS_TABLE.id, notificationId));

    return NextResponse.json({ result: { success: true } });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return NextResponse.json(
      { error: "Failed to update notification" },
      { status: 500 }
    );
  }
}
