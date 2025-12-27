import { db } from "@/configs/db";
import { STUDY_MATERIAL_TABLE, CHAPTER_NOTES_TABLE, STUDY_TYPE_CONTENT_TABLE, ADMIN_ACTIVITY_LOG_TABLE } from "@/configs/schema";
import { eq, desc, sql, like, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/adminApiAuth";
import { addCredits, CREDIT_TYPES } from "@/lib/credits";

/**
 * GET /api/admin/courses
 * Get all courses with pagination and filtering
 */
export async function GET(req) {
    // Verify admin session
    const auth = await requireAdminAuth();
    if (!auth.authenticated) return auth.error;

    try {
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const status = searchParams.get("status");
        const search = searchParams.get("search");

        const offset = (page - 1) * limit;

        // Build query conditions
        let conditions = [];
        if (status) {
            conditions.push(eq(STUDY_MATERIAL_TABLE.status, status));
        }

        // Get total count for pagination
        const countResult = await db
            .select({ count: sql`count(*)` })
            .from(STUDY_MATERIAL_TABLE);
        const totalCount = Number(countResult[0]?.count || 0);

        // Get courses
        let query = db
            .select({
                id: STUDY_MATERIAL_TABLE.id,
                courseId: STUDY_MATERIAL_TABLE.courseId,
                topic: STUDY_MATERIAL_TABLE.topic,
                courseType: STUDY_MATERIAL_TABLE.courseType,
                difficultyLevel: STUDY_MATERIAL_TABLE.difficultyLevel,
                courseLayout: STUDY_MATERIAL_TABLE.courseLayout,
                createdBy: STUDY_MATERIAL_TABLE.createdBy,
                status: STUDY_MATERIAL_TABLE.status,
                createdAt: STUDY_MATERIAL_TABLE.createdAt
            })
            .from(STUDY_MATERIAL_TABLE)
            .orderBy(desc(STUDY_MATERIAL_TABLE.createdAt))
            .limit(limit)
            .offset(offset);

        if (status) {
            query = query.where(eq(STUDY_MATERIAL_TABLE.status, status));
        }

        const courses = await query;

        // Get stats
        const statsResult = await db
            .select({
                status: STUDY_MATERIAL_TABLE.status,
                count: sql`count(*)`
            })
            .from(STUDY_MATERIAL_TABLE)
            .groupBy(STUDY_MATERIAL_TABLE.status);

        const stats = {
            total: totalCount,
            ready: 0,
            generating: 0,
            failed: 0
        };

        statsResult.forEach(s => {
            const count = Number(s.count);
            if (s.status === 'Ready') stats.ready = count;
            else if (s.status === 'Generating') stats.generating = count;
            else if (s.status === 'Failed' || s.status === 'Error') stats.failed += count;
        });

        return NextResponse.json({
            courses,
            stats,
            page,
            totalPages: Math.ceil(totalCount / limit),
            totalCount
        });

    } catch (error) {
        console.error("Error fetching courses:", error);
        return NextResponse.json(
            { error: "Failed to fetch courses" },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/admin/courses
 * Update course properties (visibility, status, category, etc.)
 */
export async function PUT(req) {
    try {
        const { courseId, updates, adminEmail } = await req.json();

        if (!courseId) {
            return NextResponse.json({ error: 'Course ID is required' }, { status: 400 });
        }

        // Get current course data for logging
        const currentCourse = await db.select()
            .from(STUDY_MATERIAL_TABLE)
            .where(eq(STUDY_MATERIAL_TABLE.courseId, courseId))
            .limit(1);

        if (currentCourse.length === 0) {
            return NextResponse.json({ error: 'Course not found' }, { status: 404 });
        }

        // Allowed update fields
        const allowedFields = ['isPublic', 'status', 'category', 'difficultyLevel'];
        const sanitizedUpdates = {};
        
        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key)) {
                sanitizedUpdates[key] = value;
            }
        }

        if (Object.keys(sanitizedUpdates).length === 0) {
            return NextResponse.json({ error: 'No valid updates provided' }, { status: 400 });
        }

        // Update course
        await db.update(STUDY_MATERIAL_TABLE)
            .set(sanitizedUpdates)
            .where(eq(STUDY_MATERIAL_TABLE.courseId, courseId));

        // Log activity
        if (adminEmail) {
            await db.insert(ADMIN_ACTIVITY_LOG_TABLE).values({
                adminEmail,
                action: 'update_course',
                targetType: 'course',
                targetId: courseId,
                details: {
                    updates: sanitizedUpdates,
                    previousValues: Object.keys(sanitizedUpdates).reduce((acc, key) => {
                        acc[key] = currentCourse[0][key];
                        return acc;
                    }, {})
                },
                courseId
            });
        }

        return NextResponse.json({ 
            success: true, 
            message: 'Course updated successfully' 
        });
    } catch (error) {
        console.error('Error updating course:', error);
        return NextResponse.json({ error: 'Failed to update course' }, { status: 500 });
    }
}

/**
 * DELETE /api/admin/courses
 * Delete a course and all related data
 * Refunds credits to user if course was still generating or failed
 */
export async function DELETE(req) {
    // Verify admin session
    const auth = await requireAdminAuth();
    if (!auth.authenticated) return auth.error;

    try {
        const { courseId, refundCredits = true } = await req.json();

        if (!courseId) {
            return NextResponse.json(
                { error: "courseId is required" },
                { status: 400 }
            );
        }

        // First, get the course to check status and owner
        const courseResult = await db.select()
            .from(STUDY_MATERIAL_TABLE)
            .where(eq(STUDY_MATERIAL_TABLE.courseId, courseId));

        if (courseResult.length === 0) {
            return NextResponse.json(
                { error: "Course not found" },
                { status: 404 }
            );
        }

        const course = courseResult[0];
        const shouldRefund = refundCredits && 
            (course.status === 'Generating' || course.status === 'Failed' || course.status === 'Error');
        
        let creditRefunded = false;
        let refundResult = null;

        // Refund credit to user if course was generating or failed
        if (shouldRefund && course.createdBy) {
            refundResult = await addCredits(course.createdBy, 1, {
                type: CREDIT_TYPES.REFUND,
                reason: `Course deleted by admin (was ${course.status}): ${course.topic || courseId}`,
                courseId: courseId,
                createdBy: `admin:${auth.admin?.email || 'unknown'}`
            });
            
            if (refundResult.success) {
                creditRefunded = true;
                console.log(`Refunded 1 credit to ${course.createdBy} for deleted course ${courseId}`);
            } else {
                console.error(`Failed to refund credit: ${refundResult.error}`);
            }
        }

        // Delete related data first (notes, study content)
        await db.delete(CHAPTER_NOTES_TABLE)
            .where(eq(CHAPTER_NOTES_TABLE.courseId, courseId));

        await db.delete(STUDY_TYPE_CONTENT_TABLE)
            .where(eq(STUDY_TYPE_CONTENT_TABLE.courseId, courseId));

        // Delete the course
        const result = await db.delete(STUDY_MATERIAL_TABLE)
            .where(eq(STUDY_MATERIAL_TABLE.courseId, courseId))
            .returning();

        return NextResponse.json({
            success: true,
            message: creditRefunded 
                ? `Course deleted and 1 credit refunded to ${course.createdBy}` 
                : "Course deleted successfully",
            deletedCourse: result[0],
            creditRefunded,
            refundedTo: creditRefunded ? course.createdBy : null,
            newBalance: refundResult?.newBalance
        });

    } catch (error) {
        console.error("Error deleting course:", error);
        return NextResponse.json(
            { error: "Failed to delete course" },
            { status: 500 }
        );
    }
}
