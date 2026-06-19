import { db } from "@/configs/db";
import { STUDY_MATERIAL_TABLE } from "@/configs/schema";
import { eq, and, like, or } from "drizzle-orm";
import { NextResponse } from "next/server";

// GET: Fetch all public courses
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    
    let query = db.select().from(STUDY_MATERIAL_TABLE).where(
      and(
        eq(STUDY_MATERIAL_TABLE.isPublic, true),
        eq(STUDY_MATERIAL_TABLE.status, 'Ready')
      )
    );

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

    const result = await db.select().from(STUDY_MATERIAL_TABLE).where(and(...conditions));

    return NextResponse.json({ result: result });
  } catch (error) {
    console.error('Error fetching public courses:', error);
    return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
  }
}
