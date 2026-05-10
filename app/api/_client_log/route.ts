import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 10;

// 客户端错误上报端点——把浏览器里的 window.onerror / React error boundary 错误
// 转到服务器日志（pm2 logs），方便在真实用户场景调试
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    console.log("[client-log]", JSON.stringify(body));
  } catch {
    /* 吞掉 */
  }
  return NextResponse.json({ ok: true });
}
