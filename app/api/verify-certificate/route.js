import { db } from "@/configs/db";
import { CERTIFICATES_TABLE } from "@/configs/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

/**
 * GET /api/verify-certificate?certificateId=CERT-XXXXX
 * Verify certificate authenticity
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const certificateId = searchParams.get("certificateId");

    if (!certificateId) {
      return NextResponse.json(
        { error: "Certificate ID is required" },
        { status: 400 }
      );
    }

    // Query certificate from database
    const certificate = await db
      .select()
      .from(CERTIFICATES_TABLE)
      .where(eq(CERTIFICATES_TABLE.certificateId, certificateId));

    if (certificate.length === 0) {
      return NextResponse.json(
        { error: "Certificate not found or invalid" },
        { status: 404 }
      );
    }

    // Return certificate details for verification
    return NextResponse.json({ 
      result: certificate[0],
      verified: true,
      message: "Certificate is authentic"
    });
  } catch (err) {
    console.error("Certificate Verification Error:", err);
    return NextResponse.json(
      { error: "Failed to verify certificate" },
      { status: 500 }
    );
  }
}
