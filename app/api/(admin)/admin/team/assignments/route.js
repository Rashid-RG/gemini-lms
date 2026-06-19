import { db } from "@/configs/db";
import { TUTOR_ASSIGNMENT_TABLE, ADMIN_TABLE, STUDY_MATERIAL_TABLE, ADMIN_ACTIVITY_LOG_TABLE } from "@/configs/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAdminOrAbove } from "@/lib/adminApiAuth";

/**
 * GET /api/admin/team/assignments?adminId=X
 * Get course assignments for a tutor, or all assignments
 */
export async function GET(req) {
    const auth = await requireAdminOrAbove();
    if (!auth.authenticated) return auth.error;

    try {
        const { searchParams } = new URL(req.url);
        const adminId = searchParams.get("adminId");

        const conditions = [];
        if (adminId) {
            conditions.push(eq(TUTOR_ASSIGNMENT_TABLE.adminId, parseInt(adminId)));
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const assignments = await db
            .select({
                assignment: TUTOR_ASSIGNMENT_TABLE,
                courseTopic: STUDY_MATERIAL_TABLE.topic,
                courseType: STUDY_MATERIAL_TABLE.courseType,
                courseCreatedBy: STUDY_MATERIAL_TABLE.createdBy,
                courseStatus: STUDY_MATERIAL_TABLE.status,
                tutorName: ADMIN_TABLE.name,
                tutorEmail: ADMIN_TABLE.email,
            })
            .from(TUTOR_ASSIGNMENT_TABLE)
            .leftJoin(STUDY_MATERIAL_TABLE, eq(TUTOR_ASSIGNMENT_TABLE.courseId, STUDY_MATERIAL_TABLE.courseId))
            .leftJoin(ADMIN_TABLE, eq(TUTOR_ASSIGNMENT_TABLE.adminId, ADMIN_TABLE.id))
            .where(whereClause)
            .orderBy(desc(TUTOR_ASSIGNMENT_TABLE.createdAt));

        return NextResponse.json({
            assignments: assignments.map(a => ({
                ...a.assignment,
                courseTopic: a.courseTopic,
                courseType: a.courseType,
                courseCreatedBy: a.courseCreatedBy,
                courseStatus: a.courseStatus,
                tutorName: a.tutorName,
                tutorEmail: a.tutorEmail,
            })),
        });
    } catch (error) {
        console.error("Assignments GET Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch assignments" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/admin/team/assignments
 * Assign courses to a tutor
 */
export async function POST(req) {
    const auth = await requireAdminOrAbove();
    if (!auth.authenticated) return auth.error;

    try {
        const { adminId, courseIds, canReview, canEdit, canApprove } = await req.json();

        if (!adminId || !courseIds || !Array.isArray(courseIds) || courseIds.length === 0) {
            return NextResponse.json(
                { error: "adminId and courseIds array are required" },
                { status: 400 }
            );
        }

        // Verify the tutor exists and is a tutor
        const tutor = await db
            .select()
            .from(ADMIN_TABLE)
            .where(eq(ADMIN_TABLE.id, adminId));

        if (tutor.length === 0) {
            return NextResponse.json(
                { error: "Team member not found" },
                { status: 404 }
            );
        }

        // Get existing assignments to avoid duplicates
        const existing = await db
            .select({ courseId: TUTOR_ASSIGNMENT_TABLE.courseId })
            .from(TUTOR_ASSIGNMENT_TABLE)
            .where(eq(TUTOR_ASSIGNMENT_TABLE.adminId, adminId));

        const existingCourseIds = new Set(existing.map(e => e.courseId));
        const newCourseIds = courseIds.filter(id => !existingCourseIds.has(id));

        if (newCourseIds.length === 0) {
            return NextResponse.json({
                success: true,
                message: "All courses are already assigned",
                added: 0,
            });
        }

        // Insert new assignments
        const values = newCourseIds.map(courseId => ({
            adminId,
            courseId,
            assignedBy: auth.admin.email,
            canReview: canReview !== false,
            canEdit: canEdit !== false,
            canApprove: canApprove === true,
            createdAt: new Date(),
        }));

        await db.insert(TUTOR_ASSIGNMENT_TABLE).values(values);

        // Log action
        await db.insert(ADMIN_ACTIVITY_LOG_TABLE).values({
            adminEmail: auth.admin.email,
            action: 'team_assign_courses',
            targetType: 'tutor_assignment',
            targetId: String(adminId),
            details: {
                tutorEmail: tutor[0].email,
                courseIds: newCourseIds,
                totalAssigned: newCourseIds.length,
            },
            createdAt: new Date(),
        });

        return NextResponse.json({
            success: true,
            message: `${newCourseIds.length} course(s) assigned successfully`,
            added: newCourseIds.length,
        });
    } catch (error) {
        console.error("Assignments POST Error:", error);
        return NextResponse.json(
            { error: "Failed to assign courses" },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/admin/team/assignments
 * Remove a course assignment
 */
export async function DELETE(req) {
    const auth = await requireAdminOrAbove();
    if (!auth.authenticated) return auth.error;

    try {
        const { assignmentId } = await req.json();

        if (!assignmentId) {
            return NextResponse.json(
                { error: "assignmentId is required" },
                { status: 400 }
            );
        }

        const existing = await db
            .select()
            .from(TUTOR_ASSIGNMENT_TABLE)
            .where(eq(TUTOR_ASSIGNMENT_TABLE.id, assignmentId));

        if (existing.length === 0) {
            return NextResponse.json(
                { error: "Assignment not found" },
                { status: 404 }
            );
        }

        await db
            .delete(TUTOR_ASSIGNMENT_TABLE)
            .where(eq(TUTOR_ASSIGNMENT_TABLE.id, assignmentId));

        // Log
        await db.insert(ADMIN_ACTIVITY_LOG_TABLE).values({
            adminEmail: auth.admin.email,
            action: 'team_remove_assignment',
            targetType: 'tutor_assignment',
            targetId: String(assignmentId),
            details: {
                adminId: existing[0].adminId,
                courseId: existing[0].courseId,
            },
            createdAt: new Date(),
        });

        return NextResponse.json({
            success: true,
            message: "Assignment removed",
        });
    } catch (error) {
        console.error("Assignments DELETE Error:", error);
        return NextResponse.json(
            { error: "Failed to remove assignment" },
            { status: 500 }
        );
    }
}
