import { db } from "@/configs/db";
import { STUDY_MATERIAL_TABLE } from "@/configs/schema";
import { NextResponse } from "next/server";
import { withDbRetry } from "@/lib/dbUtils";

export async function POST(req) {
  try {
    const { 
      courseId, 
      courseType, 
      topic, 
      difficultyLevel, 
      createdBy,
      courseLayout, 
      includeVideos = false,
      isPublic = false,
      category = 'General',
      tags = []
    } = await req.json();

    // Validate required fields
    if (!courseId || !courseType || !topic || !difficultyLevel || !createdBy || !courseLayout) {
      return NextResponse.json(
        { error: "Missing required fields: courseId, courseType, topic, difficultyLevel, createdBy, courseLayout" },
        { status: 400 }
      );
    }

    // Validate courseLayout structure
    if (!courseLayout.chapters || !Array.isArray(courseLayout.chapters)) {
      return NextResponse.json(
        { error: "courseLayout must have a 'chapters' array" },
        { status: 400 }
      );
    }

    // Check if course with this ID already exists
    const existingCourse = await withDbRetry(() =>
      db.select()
        .from(STUDY_MATERIAL_TABLE)
        .where((table) => table.courseId === courseId)
    );

    if (existingCourse.length > 0) {
      return NextResponse.json(
        { error: "Course with this ID already exists" },
        { status: 409 }
      );
    }

    // Insert the course directly with 'Ready' status (no AI generation needed)
    const dbResult = await withDbRetry(() =>
      db.insert(STUDY_MATERIAL_TABLE).values({
        courseId,
        courseType,
        topic,
        difficultyLevel,
        courseLayout,
        createdBy,
        status: 'Ready', // Manually added courses are ready immediately
        includeVideos,
        isPublic,
        category,
        tags: tags.length > 0 ? tags : null,
      }).returning()
    );

    return NextResponse.json({ 
      result: dbResult[0],
      message: "Course added successfully"
    });

  } catch (error) {
    console.error("Error adding manual course:", error);
    return NextResponse.json(
      { error: "Failed to add course: " + error.message },
      { status: 500 }
    );
  }
}
