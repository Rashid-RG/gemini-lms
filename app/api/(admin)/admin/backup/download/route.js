import { NextResponse } from "next/server";
import { db } from "@/configs/db";
import { SYSTEM_BACKUP_TABLE } from "@/configs/schema";
import { eq } from "drizzle-orm";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Download token is required" }, { status: 400 });
    }

    // 1. Fetch the backup record associated with the transient token
    const records = await db
      .select()
      .from(SYSTEM_BACKUP_TABLE)
      .where(eq(SYSTEM_BACKUP_TABLE.downloadToken, token))
      .limit(1);

    if (records.length === 0) {
      return NextResponse.json({ error: "Invalid or expired download token" }, { status: 404 });
    }

    const record = records[0];

    // 2. Convert base64 data to binary buffer
    const fileBuffer = Buffer.from(record.backupData, "base64");

    // 3. Send binary stream with gzip headers to trigger browser download
    return new Response(fileBuffer, {
      headers: {
        "Content-Type": "application/gzip",
        "Content-Disposition": `attachment; filename="${record.fileName}"`,
        "Content-Length": fileBuffer.length.toString(),
        "Cache-Control": "no-store, no-cache, must-revalidate"
      }
    });

  } catch (error) {
    console.error("Backup Download Failed:", error);
    return NextResponse.json(
      { error: "Download failed", details: error.message },
      { status: 500 }
    );
  }
}
