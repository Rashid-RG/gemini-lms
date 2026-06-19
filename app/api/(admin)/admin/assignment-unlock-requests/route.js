import { db } from "@/configs/db";
import { ASSIGNMENT_SUBMISSIONS_TABLE, COURSE_ASSIGNMENTS_TABLE, STUDY_MATERIAL_TABLE, USER_TABLE } from "@/configs/schema";
import { eq, desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/adminApiAuth";

// GET /api/admin/assignment-unlock-requests
export async function GET(req) {
  // Verify admin session
  const auth = await requireAdminAuth();
  if (!auth.authenticated) return auth.error;

  try {
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get('status');
    
    let requests;
    
    // Filter by status if provided, otherwise get pending (UnlockRequested) by default
    if (statusParam === 'all') {
      requests = await db.select().from(ASSIGNMENT_SUBMISSIONS_TABLE)
        .orderBy(desc(ASSIGNMENT_SUBMISSIONS_TABLE.submittedAt));
    } else if (statusParam === 'approved') {
      requests = await db.select().from(ASSIGNMENT_SUBMISSIONS_TABLE)
        .where(eq(ASSIGNMENT_SUBMISSIONS_TABLE.status, "Graded"))
        .orderBy(desc(ASSIGNMENT_SUBMISSIONS_TABLE.submittedAt));
    } else if (statusParam === 'rejected') {
      requests = await db.select().from(ASSIGNMENT_SUBMISSIONS_TABLE)
        .where(eq(ASSIGNMENT_SUBMISSIONS_TABLE.status, "Rejected"))
        .orderBy(desc(ASSIGNMENT_SUBMISSIONS_TABLE.submittedAt));
    } else {
      // Default: pending unlock requests
      requests = await db.select().from(ASSIGNMENT_SUBMISSIONS_TABLE)
        .where(eq(ASSIGNMENT_SUBMISSIONS_TABLE.status, "UnlockRequested"))
        .orderBy(desc(ASSIGNMENT_SUBMISSIONS_TABLE.submittedAt));
    }
    
    // Enrich with assignment, course, and student details
    const enrichedRequests = await Promise.all(
      requests.map(async (submission) => {
        const assignment = await db.select().from(COURSE_ASSIGNMENTS_TABLE)
          .where(eq(COURSE_ASSIGNMENTS_TABLE.assignmentId, submission.assignmentId));
        
        const course = await db.select().from(STUDY_MATERIAL_TABLE)
          .where(eq(STUDY_MATERIAL_TABLE.courseId, submission.courseId));
        
        const student = await db.select().from(USER_TABLE)
          .where(eq(USER_TABLE.email, submission.studentEmail));
        
        return {
          ...submission,
          assignment: assignment[0] || null,
          course: course[0] || null,
          student: student[0] || null
        };
      })
    );
    
    return NextResponse.json({ requests: enrichedRequests });
  } catch (err) {
    console.error('Error fetching unlock requests:', err);
    return NextResponse.json({ error: "Failed to fetch unlock requests", details: err.message }, { status: 500 });
  }
}

// POST /api/admin/assignment-unlock-requests
// Approve or reject an unlock request
export async function POST(req) {
  // Verify admin session
  const auth = await requireAdminAuth();
  if (!auth.authenticated) return auth.error;

  try {
    const { requestId, action, adminEmail } = await req.json();
    
    if (!requestId || !action) {
      return NextResponse.json({ error: "Missing requestId or action" }, { status: 400 });
    }
    
    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: "Invalid action. Must be 'approve' or 'reject'" }, { status: 400 });
    }
    
    // Get the submission
    const submission = await db.select().from(ASSIGNMENT_SUBMISSIONS_TABLE)
      .where(eq(ASSIGNMENT_SUBMISSIONS_TABLE.id, requestId));
    
    if (submission.length === 0) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }
    
    // Determine new status
    const newStatus = action === 'approve' ? 'Unlocked' : 'Rejected';
    
    // Update the submission status
    const updated = await db.update(ASSIGNMENT_SUBMISSIONS_TABLE)
      .set({
        status: newStatus,
        reviewedBy: adminEmail || auth.admin?.email,
        reviewedAt: new Date()
      })
      .where(eq(ASSIGNMENT_SUBMISSIONS_TABLE.id, requestId))
      .returning();
    
    return NextResponse.json({ 
      success: true, 
      message: `Request ${action}d successfully`,
      result: updated[0]
    });
  } catch (err) {
    console.error('Error processing unlock request:', err);
    return NextResponse.json({ error: "Failed to process request", details: err.message }, { status: 500 });
  }
}
