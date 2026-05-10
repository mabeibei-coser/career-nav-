import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import fs from "fs";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);
    if (isNaN(id)) {
      return NextResponse.json({ error: "无效 ID" }, { status: 400 });
    }

    const db = getDb();
    const row = db.prepare("SELECT * FROM reports WHERE id = ?").get(id) as
      | Record<string, unknown>
      | undefined;

    if (!row) {
      return NextResponse.json({ error: "报告不存在" }, { status: 404 });
    }

    let reportData: unknown = null;
    const storagePath = row.report_storage_path as string | null;
    if (storagePath) {
      try {
        reportData = JSON.parse(fs.readFileSync(storagePath, "utf-8"));
      } catch {
        // file missing or corrupt
      }
    }

    return NextResponse.json({ meta: row, reportData });
  } catch (e) {
    console.error("[admin/reports/[id]] error:", e);
    return NextResponse.json({ error: "查询失败" }, { status: 500 });
  }
}
