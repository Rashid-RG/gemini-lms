import { db } from "@/configs/db";
import { COURSE_REVIEWS_TABLE, STUDY_MATERIAL_TABLE } from "@/configs/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

// POST: Submit a course review
export async function POST(req) {
  try {
    const { courseId, studentEmail, rating, reviewText, isAnonymous } = await req.json();

    if (!courseId || !studentEmail || !rating) {
      return NextResponse.json(
        { error: "courseId, studentEmail, and rating are required" },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    // Check if user already reviewed
    const existingReview = await db
      .select()
      .from(COURSE_REVIEWS_TABLE)
      .where(
        and(
          eq(COURSE_REVIEWS_TABLE.courseId, courseId),
          eq(COURSE_REVIEWS_TABLE.studentEmail, studentEmail)
        )
      );

    // Insert or update review
    let result;
    if (existingReview.length > 0) {
      result = await db
        .update(COURSE_REVIEWS_TABLE)
        .set({
          rating,
          reviewText,
          isAnonymous: isAnonymous || false,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(COURSE_REVIEWS_TABLE.courseId, courseId),
            eq(COURSE_REVIEWS_TABLE.studentEmail, studentEmail)
          )
        )
        .returning();
    } else {
      result = await db
        .insert(COURSE_REVIEWS_TABLE)
        .values({
          courseId,
          studentEmail,
          rating,
          reviewText,
          isAnonymous: isAnonymous || false
        })
        .returning();
    }

    // Update course average rating
    const allReviews = await db
      .select()
      .from(COURSE_REVIEWS_TABLE)
      .where(eq(COURSE_REVIEWS_TABLE.courseId, courseId));

    const avgRating = 
      allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

    await db
      .update(STUDY_MATERIAL_TABLE)
      .set({
        averageRating: avgRating.toFixed(2),
        reviewCount: allReviews.length
      })
      .where(eq(STUDY_MATERIAL_TABLE.courseId, courseId));

    return NextResponse.json({
      message: "Review submitted successfully",
      result: result[0]
    });
  } catch (error) {
    console.error("Error submitting review:", error);
    return NextResponse.json(
      { error: "Failed to submit review" },
      { status: 500 }
    );
  }
}

// GET: Fetch reviews for a course
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId");

    if (!courseId) {
      return NextResponse.json(
        { error: "courseId is required" },
        { status: 400 }
      );
    }

    const reviews = await db
      .select()
      .from(COURSE_REVIEWS_TABLE)
      .where(eq(COURSE_REVIEWS_TABLE.courseId, courseId));

    const publicReviews = reviews.map((r) => ({
      ...r,
      studentEmail: r.isAnonymous ? "Anonymous" : r.studentEmail
    }));

    return NextResponse.json({ result: publicReviews });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return NextResponse.json(
      { error: "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}
