import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import fs from "fs";
import path from "path";

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
    const row = db
      .prepare(
        "SELECT resume_storage_path, resume_filename FROM reports WHERE id = ?"
      )
      .get(id) as
      | { resume_storage_path: string | null; resume_filename: string | null }
      | undefined;

    if (!row) {
      return NextResponse.json({ error: "报告不存在" }, { status: 404 });
    }
    if (!row.resume_storage_path || !row.resume_filename) {
      return NextResponse.json({ error: "此报告无简历文件" }, { status: 404 });
    }
    if (!fs.existsSync(row.resume_storage_path)) {
      return NextResponse.json({ error: "简历文件已丢失" }, { status: 404 });
    }

    const ext = path.extname(row.resume_filename).toLowerCase();
    const mime =
      ext === ".pdf"
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    const encoded = encodeURIComponent(row.resume_filename);
    const fileBuffer = fs.readFileSync(row.resume_storage_path);

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": mime,
        "Content-Disposition": `attachment; filename*=UTF-8''${encoded}`,
      },
    });
  } catch (e) {
    console.error("[admin/reports/[id]/resume] error:", e);
    return NextResponse.json({ error: "下载失败" }, { status: 500 });
  }
}
