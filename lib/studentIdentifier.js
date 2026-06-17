import { db } from "@/configs/db";
import { USER_TABLE } from "@/configs/schema";
import { eq, isNull, or } from "drizzle-orm";

export function hasStudentIdentifier(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function buildStudentIdentifier(user) {
  if (!user?.id) {
    throw new Error("User id is required to build a student identifier");
  }

  const createdAt = user?.createdAt ? new Date(user.createdAt) : new Date();
  const year = Number.isNaN(createdAt.getTime()) ? new Date().getFullYear() : createdAt.getFullYear();

  return `STU-${year}-${String(user.id).padStart(5, "0")}`;
}

export async function ensureStudentIdentifierForUser(user) {
  if (!user?.id) {
    return user;
  }

  if (hasStudentIdentifier(user.studentIdentifier)) {
    return user;
  }

  const studentIdentifier = buildStudentIdentifier(user);
  const [updatedUser] = await db
    .update(USER_TABLE)
    .set({
      studentIdentifier,
      updatedAt: new Date(),
    })
    .where(eq(USER_TABLE.id, user.id))
    .returning();

  return updatedUser || { ...user, studentIdentifier };
}

export async function backfillMissingStudentIdentifiers() {
  const users = await db
    .select()
    .from(USER_TABLE)
    .where(or(isNull(USER_TABLE.studentIdentifier), eq(USER_TABLE.studentIdentifier, "")));

  let updatedCount = 0;

  for (const user of users) {
    if (hasStudentIdentifier(user.studentIdentifier)) {
      continue;
    }

    await ensureStudentIdentifierForUser(user);
    updatedCount += 1;
  }

  return {
    scanned: users.length,
    updatedCount,
  };
}