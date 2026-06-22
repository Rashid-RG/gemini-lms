import { db } from "@/configs/db";
import { STUDY_MATERIAL_TABLE, USER_TABLE } from "@/configs/schema";
import { eq, and, like, or } from "drizzle-orm";
import { NextResponse } from "next/server";

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

    return NextResponse.json({ result: result });
  } catch (error) {
    console.error('Error fetching public courses:', error);
    return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
  }
}
