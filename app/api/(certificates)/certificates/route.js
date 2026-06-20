import { db } from "@/configs/db";
import { CERTIFICATES_TABLE } from "@/configs/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireUserAuth } from "@/lib/userApiAuth";

/**
 * GET /api/certificates?studentEmail=abc@example.com
 * Get all certificates for a student
 */
export async function GET(req) {
  try {
    const authResult = await requireUserAuth(req);
    if (!authResult.authenticated) return authResult.error;
    const studentEmail = authResult.email;

    // Get all certificates for this student
    const certificates = await db
      .select()
      .from(CERTIFICATES_TABLE)
      .where(eq(CERTIFICATES_TABLE.studentEmail, studentEmail))
      .orderBy(CERTIFICATES_TABLE.completedAt);

    return NextResponse.json({ 
      result: certificates,
      count: certificates.length
    });
  } catch (err) {
    console.error("Certificates Fetch Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch certificates" },
      { status: 500 }
    );
  }
}
