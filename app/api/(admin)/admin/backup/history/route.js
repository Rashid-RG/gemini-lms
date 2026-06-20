import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/adminApiAuth";
import { db } from "@/configs/db";
import { SYSTEM_BACKUP_TABLE } from "@/configs/schema";
import { desc } from "drizzle-orm";

export async function GET(req) {
  try {
    // 1. Authorize admin session (tutor, admin, or super_admin)
    const authResult = await requireAdminAuth();
    if (!authResult.authenticated) {
      return authResult.error || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Fetch backup history logs, excluding the massive backupData payload
    const backups = await db
      .select({
        id: SYSTEM_BACKUP_TABLE.id,
        fileName: SYSTEM_BACKUP_TABLE.fileName,
        backupType: SYSTEM_BACKUP_TABLE.backupType,
        recordCount: SYSTEM_BACKUP_TABLE.recordCount,
        fileSize: SYSTEM_BACKUP_TABLE.fileSize,
        downloadToken: SYSTEM_BACKUP_TABLE.downloadToken,
        createdBy: SYSTEM_BACKUP_TABLE.createdBy,
        createdAt: SYSTEM_BACKUP_TABLE.createdAt
      })
      .from(SYSTEM_BACKUP_TABLE)
      .orderBy(desc(SYSTEM_BACKUP_TABLE.createdAt));

    return NextResponse.json({
      success: true,
      backups
    });

  } catch (error) {
    console.error("Fetch Backup History Failed:", error);
    return NextResponse.json(
      { error: "Failed to load backup history", details: error.message },
      { status: 500 }
    );
  }
}
