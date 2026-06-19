import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/configs/db";
import { USER_TABLE } from "@/configs/schema";
import { eq } from "drizzle-orm";
import { evaluateStudentProfileCompleteness } from "@/lib/studentProfile";
import { ensureStudentIdentifierForUser } from "@/lib/studentIdentifier";

export async function GET() {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clerkUser = await currentUser();
    const email = (
      sessionClaims?.email ||
      sessionClaims?.primaryEmailAddress?.emailAddress ||
      clerkUser?.primaryEmailAddress?.emailAddress ||
      clerkUser?.emailAddresses?.[0]?.emailAddress
    )?.toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "User email not found" }, { status: 400 });
    }

    const user = await db
      .select()
      .from(USER_TABLE)
      .where(eq(USER_TABLE.email, email))
      .limit(1);

    const profile = user[0] ? await ensureStudentIdentifierForUser(user[0]) : null;
    return NextResponse.json({
      result: profile,
      completeness: evaluateStudentProfileCompleteness(profile || {}),
    });
  } catch (error) {
    console.error("Error loading user profile:", error);
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clerkUser = await currentUser();
    const email = (
      sessionClaims?.email ||
      sessionClaims?.primaryEmailAddress?.emailAddress ||
      clerkUser?.primaryEmailAddress?.emailAddress ||
      clerkUser?.emailAddresses?.[0]?.emailAddress
    )?.toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "User email not found" }, { status: 400 });
    }

    const body = await req.json();
    const updates = {
      name: body.name?.trim() || null,
      studentIdentifier: body.studentIdentifier?.trim() || null,
      phoneNumber: body.phoneNumber?.trim() || null,
      address: body.address?.trim() || null,
      city: body.city?.trim() || null,
      country: body.country?.trim() || null,
      postalCode: body.postalCode?.trim() || null,
      emergencyContactName: body.emergencyContactName?.trim() || null,
      emergencyContactPhone: body.emergencyContactPhone?.trim() || null,
      guardianEmail: body.guardianEmail?.trim() || null,
      guardianRelationship: body.guardianRelationship?.trim() || null,
      updatedAt: new Date(),
    };

    if (body.dateOfBirth) {
      updates.dateOfBirth = new Date(body.dateOfBirth);
    } else {
      updates.dateOfBirth = null;
    }

    const existing = await db
      .select()
      .from(USER_TABLE)
      .where(eq(USER_TABLE.email, email))
      .limit(1);

    if (!existing.length) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const ensuredExisting = await ensureStudentIdentifierForUser(existing[0]);
    updates.studentIdentifier = ensuredExisting?.studentIdentifier || null;

    const result = await db
      .update(USER_TABLE)
      .set(updates)
      .where(eq(USER_TABLE.email, email))
      .returning();

    return NextResponse.json({
      result: result[0],
      completeness: evaluateStudentProfileCompleteness(result[0] || {}),
    });
  } catch (error) {
    console.error("Error saving user profile:", error);
    return NextResponse.json({ error: "Failed to save profile" }, { status: 500 });
  }
}