import { db } from "@/configs/db";
import { GRADE_COMMENTS_TABLE, GRADE_NOTIFICATIONS_TABLE, STUDY_MATERIAL_TABLE } from "@/configs/schema";
import { eq, and } from "drizzle-orm";
import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAdminSession } from "@/lib/adminAuth";

async function resolveCommentActor() {
  const cookieStore = await cookies();
  const adminToken = cookieStore.get("admin_session")?.value;

  if (adminToken) {
    const session = await verifyAdminSession(adminToken);
    if (session.valid && ["tutor", "admin", "super_admin"].includes(session.admin?.role)) {
      return {
        authenticated: true,
        type: "admin",
        email: String(session.admin.email || "").toLowerCase(),
        role: session.admin.role,
      };
    }
  }

  const { userId, sessionClaims } = await auth();
  if (!userId) {
    return { authenticated: false };
  }

  const clerkUser = await currentUser();
  const email = (
    sessionClaims?.email ||
    sessionClaims?.primaryEmailAddress?.emailAddress ||
    clerkUser?.primaryEmailAddress?.emailAddress ||
    clerkUser?.emailAddresses?.[0]?.emailAddress
  )?.toLowerCase();

  return {
    authenticated: Boolean(email),
    type: "clerk",
    email,
  };
}

/**
 * POST /api/grades/comments
 * Add a comment to a grade
 */
export async function POST(req) {
  try {
    const actor = await resolveCommentActor();
    if (!actor.authenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const actorEmail = actor.email;
    const body = await req.json();
    const {
      courseId,
      studentEmail,
      assessmentType,
      assessmentId,
      comment,
      isPrivate = false,
    } = body;

    if (!courseId || !studentEmail || !assessmentType || !assessmentId || !comment) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const course = await db
      .select()
      .from(STUDY_MATERIAL_TABLE)
      .where(eq(STUDY_MATERIAL_TABLE.courseId, courseId))
      .limit(1);

    if (!course.length) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    if (actor.type === "clerk" && (course[0].createdBy || "").toLowerCase() !== actorEmail) {
      return NextResponse.json({ error: "Only an authorized course reviewer can add comments" }, { status: 403 });
    }

    const result = await db
      .insert(GRADE_COMMENTS_TABLE)
      .values({
        courseId,
        studentEmail: studentEmail.toLowerCase(),
        assessmentType,
        assessmentId,
        instructorEmail: actorEmail,
        comment,
        isPrivate,
      })
      .returning();

    if (!isPrivate) {
      await db.insert(GRADE_NOTIFICATIONS_TABLE).values({
        courseId,
        studentEmail: studentEmail.toLowerCase(),
        notificationType: "comment_added",
        assessmentType,
        assessmentId,
        message: `New staff feedback was added to your ${assessmentType} in this course.`,
        recipientEmail: studentEmail.toLowerCase(),
        recipientType: "student",
        sentVia: "in_app",
      });
    }

    return NextResponse.json({ result: result[0] });
  } catch (error) {
    console.error("Error adding comment:", error);
    return NextResponse.json(
      { error: "Failed to add comment" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/grades/comments?courseId=xxx&studentEmail=xxx
 * Get comments for a student's grades
 */
export async function GET(req) {
  try {
    const actor = await resolveCommentActor();
    if (!actor.authenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const requesterEmail = actor.email;

    const url = new URL(req.url);
    const courseId = url.searchParams.get("courseId");
    const studentEmail = url.searchParams.get("studentEmail")?.toLowerCase();
    const assessmentId = url.searchParams.get("assessmentId");

    let isCourseInstructor = false;
    let isReviewer = actor.type === "admin";
    if (courseId && requesterEmail) {
      const course = await db
        .select()
        .from(STUDY_MATERIAL_TABLE)
        .where(eq(STUDY_MATERIAL_TABLE.courseId, courseId))
        .limit(1);

      isCourseInstructor = (course?.[0]?.createdBy || "").toLowerCase() === requesterEmail;
    }

    if (!isCourseInstructor && !isReviewer && studentEmail && requesterEmail !== studentEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const conditions = [];
    if (courseId) conditions.push(eq(GRADE_COMMENTS_TABLE.courseId, courseId));
    if (studentEmail) {
      conditions.push(eq(GRADE_COMMENTS_TABLE.studentEmail, studentEmail));
    } else if (!isCourseInstructor && !isReviewer && requesterEmail) {
      conditions.push(eq(GRADE_COMMENTS_TABLE.studentEmail, requesterEmail));
    }
    if (assessmentId) conditions.push(eq(GRADE_COMMENTS_TABLE.assessmentId, assessmentId));
    if (!isCourseInstructor && !isReviewer) conditions.push(eq(GRADE_COMMENTS_TABLE.isPrivate, false));

    const comments = await db
      .select()
      .from(GRADE_COMMENTS_TABLE)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return NextResponse.json({ result: comments });
  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json(
      { result: [] },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/grades/comments?id=xxx
 * Delete a comment
 */
export async function DELETE(req) {
  try {
    const actor = await resolveCommentActor();
    if (!actor.authenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const commentId = url.searchParams.get("id");

    if (!commentId) {
      return NextResponse.json(
        { error: "Comment ID required" },
        { status: 400 }
      );
    }

    const comment = await db
      .select()
      .from(GRADE_COMMENTS_TABLE)
      .where(eq(GRADE_COMMENTS_TABLE.id, commentId));

    if (!comment.length) {
      return NextResponse.json(
        { error: "Comment not found" },
        { status: 404 }
      );
    }

    const canDelete = actor.type === "admin"
      ? ["tutor", "admin", "super_admin"].includes(actor.role)
      : String(comment[0].instructorEmail || "").toLowerCase() === actor.email;

    if (!canDelete) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    await db
      .delete(GRADE_COMMENTS_TABLE)
      .where(eq(GRADE_COMMENTS_TABLE.id, commentId));

    return NextResponse.json({ result: { success: true } });
  } catch (error) {
    console.error("Error deleting comment:", error);
    return NextResponse.json(
      { error: "Failed to delete comment" },
      { status: 500 }
    );
  }
}
