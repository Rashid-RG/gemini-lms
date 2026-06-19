import { db } from "@/configs/db";
import { COURSE_DISCUSSIONS_TABLE, DISCUSSION_REPLIES_TABLE, STUDY_MATERIAL_TABLE } from "@/configs/schema";
import { eq, and, asc, desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { withDbRetry } from "@/lib/dbUtils";
import { getAuthEmail } from "@/lib/clerkUtils";

/**
 * GET /api/discussions
 * Returns discussion threads and replies for a specific course chapter.
 */
export async function GET(req) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const courseId = searchParams.get('courseId');
        const chapterId = searchParams.get('chapterId');

        if (!courseId || chapterId === null || chapterId === undefined) {
            return NextResponse.json({ error: "courseId and chapterId are required" }, { status: 400 });
        }

        // Fetch discussion threads
        const discussions = await withDbRetry(() => 
            db.select()
              .from(COURSE_DISCUSSIONS_TABLE)
              .where(
                and(
                  eq(COURSE_DISCUSSIONS_TABLE.courseId, courseId),
                  eq(COURSE_DISCUSSIONS_TABLE.chapterId, Number(chapterId))
                )
              )
              .orderBy(desc(COURSE_DISCUSSIONS_TABLE.createdAt))
        );

        // Fetch replies for each discussion thread
        const discussionIds = discussions.map(d => d.id);
        const allReplies = discussionIds.length > 0
            ? await withDbRetry(() => 
                db.select()
                  .from(DISCUSSION_REPLIES_TABLE)
                  .where(sql`"discussionId" in ${discussionIds}`)
                  .orderBy(asc(DISCUSSION_REPLIES_TABLE.createdAt))
              )
            : [];

        // Group replies by discussionId
        // Drizzle sql helper handles safety or we can query individually/filter in JS
        // Let's query replies individually for safety if raw sql array matching has edge cases in serverless Drizzle
        const threadsWithReplies = await Promise.all(discussions.map(async (disc) => {
            const replies = await withDbRetry(() => 
                db.select()
                  .from(DISCUSSION_REPLIES_TABLE)
                  .where(eq(DISCUSSION_REPLIES_TABLE.discussionId, disc.id))
                  .orderBy(asc(DISCUSSION_REPLIES_TABLE.createdAt))
            );
            return {
                ...disc,
                replies
            };
        }));

        return NextResponse.json({ result: threadsWithReplies });

    } catch (error) {
        console.error("Discussions GET error:", error);
        return NextResponse.json({ error: "Failed to load discussions" }, { status: 500 });
    }
}

/**
 * POST /api/discussions
 * Creates a new discussion thread or replies to an existing thread.
 */
export async function POST(req) {
    try {
        const { userId, sessionClaims } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const authEmail = await getAuthEmail(sessionClaims);
        const authName = sessionClaims?.fullName || "Student";

        const body = await req.json();
        const { action, courseId, chapterId, content, discussionId, studentName, role } = body;

        if (!action || !content) {
            return NextResponse.json({ error: "action and content are required" }, { status: 400 });
        }

        if (action === "create_thread") {
            if (!courseId || chapterId === undefined || chapterId === null) {
                return NextResponse.json({ error: "courseId and chapterId are required to create a thread" }, { status: 400 });
            }

            const [newThread] = await withDbRetry(() => 
                db.insert(COURSE_DISCUSSIONS_TABLE).values({
                    courseId,
                    chapterId: Number(chapterId),
                    studentEmail: authEmail,
                    studentName: studentName || authName,
                    content
                }).returning()
            );

            return NextResponse.json({ success: true, result: { ...newThread, replies: [] } });

        } else if (action === "reply") {
            if (!discussionId) {
                return NextResponse.json({ error: "discussionId is required to reply" }, { status: 400 });
            }

            const [newReply] = await withDbRetry(() => 
                db.insert(DISCUSSION_REPLIES_TABLE).values({
                    discussionId: Number(discussionId),
                    authorEmail: authEmail,
                    authorName: studentName || authName,
                    role: role || "student",
                    content
                }).returning()
            );

            return NextResponse.json({ success: true, result: newReply });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });

    } catch (error) {
        console.error("Discussions POST error:", error);
        return NextResponse.json({ error: "Failed to create discussion entry" }, { status: 500 });
    }
}
