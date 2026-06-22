import { db } from "@/configs/db";
import { STUDY_MATERIAL_TABLE, USER_TABLE, TUTOR_REQUESTS_TABLE, ADMIN_TABLE } from "@/configs/schema";
import { eq, and, like, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getAuthEmail } from "@/lib/clerkUtils";

// GET: Fetch all public courses
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    
    // Apply filters if provided
    let conditions = [
      eq(STUDY_MATERIAL_TABLE.isPublic, true),
      eq(STUDY_MATERIAL_TABLE.status, 'Ready')
    ];

    if (category && category !== 'All') {
      conditions.push(eq(STUDY_MATERIAL_TABLE.category, category));
    }

    if (search) {
      conditions.push(
        or(
          like(STUDY_MATERIAL_TABLE.topic, `%${search}%`),
          like(STUDY_MATERIAL_TABLE.courseType, `%${search}%`)
        )
      );
    }

    // Determine role of logged-in user if available
    let authEmail = null;
    let isAdminOrSuperAdmin = false;
    try {
        const { userId, sessionClaims } = await auth();
        if (userId) {
            authEmail = await getAuthEmail(sessionClaims);
            if (authEmail) {
                authEmail = authEmail.toLowerCase();
                const adminEmails = (process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
                    .split(',')
                    .map(e => e.trim().toLowerCase())
                    .filter(Boolean);
                adminEmails.push('geminilmsadmin@gmail.com');
                isAdminOrSuperAdmin = adminEmails.includes(authEmail);
                
                if (!isAdminOrSuperAdmin) {
                    const adminUser = await db.select()
                        .from(ADMIN_TABLE)
                        .where(eq(ADMIN_TABLE.email, authEmail))
                        .limit(1);
                    if (adminUser.length > 0 && ['admin', 'super_admin'].includes(adminUser[0].role)) {
                        isAdminOrSuperAdmin = true;
                    }
                }
            }
        }
    } catch (e) {
        console.warn("Auth check failed in public-courses API:", e);
    }

    const result = await db.select({
      id: STUDY_MATERIAL_TABLE.id,
      courseId: STUDY_MATERIAL_TABLE.courseId,
      courseType: STUDY_MATERIAL_TABLE.courseType,
      topic: STUDY_MATERIAL_TABLE.topic,
      description: STUDY_MATERIAL_TABLE.description,
      difficultyLevel: STUDY_MATERIAL_TABLE.difficultyLevel,
      courseLayout: STUDY_MATERIAL_TABLE.courseLayout,
      createdBy: STUDY_MATERIAL_TABLE.createdBy,
      status: STUDY_MATERIAL_TABLE.status,
      includeVideos: STUDY_MATERIAL_TABLE.includeVideos,
      videos: STUDY_MATERIAL_TABLE.videos,
      hasAssignments: STUDY_MATERIAL_TABLE.hasAssignments,
      assignmentCount: STUDY_MATERIAL_TABLE.assignmentCount,
      isPublic: STUDY_MATERIAL_TABLE.isPublic,
      category: STUDY_MATERIAL_TABLE.category,
      tags: STUDY_MATERIAL_TABLE.tags,
      enrolledUsers: STUDY_MATERIAL_TABLE.enrolledUsers,
      averageRating: STUDY_MATERIAL_TABLE.averageRating,
      reviewCount: STUDY_MATERIAL_TABLE.reviewCount,
      totalStudents: STUDY_MATERIAL_TABLE.totalStudents,
      creatorName: USER_TABLE.name,
    })
    .from(STUDY_MATERIAL_TABLE)
    .leftJoin(USER_TABLE, eq(STUDY_MATERIAL_TABLE.createdBy, USER_TABLE.email))
    .where(and(...conditions));

    // Sanitize creator email addresses for students/tutors (non-admins)
    const sanitizedResult = result.map(course => {
        const createdByLower = course.createdBy?.toLowerCase();
        // Allow email visibility if admin/super_admin OR the course was created by the requester themselves
        const canSeeEmail = isAdminOrSuperAdmin || (authEmail && createdByLower === authEmail);
        return {
            ...course,
            createdBy: canSeeEmail ? course.createdBy : null
        };
    });

    return NextResponse.json({ result: sanitizedResult });
  } catch (error) {
    console.error('Error fetching public courses:', error);
    return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
  }
}
