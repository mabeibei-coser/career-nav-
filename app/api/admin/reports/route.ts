import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20")));
    const offset = (page - 1) * pageSize;

    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const position = searchParams.get("position");
    const hasResume = searchParams.get("hasResume");

    const db = getDb();

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (from) {
      conditions.push("created_at >= ?");
      params.push(new Date(from).getTime());
    }
    if (to) {
      conditions.push("created_at <= ?");
      params.push(new Date(to).getTime() + 86400000);
    }
    if (position) {
      conditions.push("target_position LIKE ?");
      params.push(`%${position}%`);
    }
    if (hasResume === "1") {
      conditions.push("has_resume = 1");
    } else if (hasResume === "0") {
      conditions.push("has_resume = 0");
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const total = (
      db.prepare(`SELECT COUNT(*) as count FROM reports ${where}`).get(...params) as { count: number }
    ).count;

    const rows = db
      .prepare(
        `SELECT id, created_at, target_position, target_education, target_company,
                target_city_tier, has_resume, resume_filename, sections_status,
                ip, duration_ms
         FROM reports ${where}
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`
      )
      .all(...params, pageSize, offset);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayCount = (
      db
        .prepare("SELECT COUNT(*) as count FROM reports WHERE created_at >= ?")
        .get(todayStart.getTime()) as { count: number }
    ).count;

    const resumeCount = (
      db
        .prepare("SELECT COUNT(*) as count FROM reports WHERE has_resume = 1")
        .get() as { count: number }
    ).count;

    const avgDuration = (
      db
        .prepare("SELECT AVG(duration_ms) as avg FROM reports WHERE duration_ms IS NOT NULL")
        .get() as { avg: number | null }
    ).avg;

    return NextResponse.json({
      rows,
      total,
      page,
      pageSize,
      stats: {
        total,
        todayCount,
        resumeRate: total > 0 ? Math.round((resumeCount / total) * 100) : 0,
        avgDurationSec: avgDuration ? Math.round(avgDuration / 1000) : null,
      },
    });
  } catch (e) {
    console.error("[admin/reports] error:", e);
    return NextResponse.json({ error: "查询失败" }, { status: 500 });
  }
}
