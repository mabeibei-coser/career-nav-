import { NextRequest, NextResponse } from "next/server";
import { loginAdmin } from "@/lib/admin-session";

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    if (!password || typeof password !== "string") {
      return NextResponse.json({ error: "请输入密码" }, { status: 400 });
    }
    const ok = await loginAdmin(password);
    if (!ok) {
      return NextResponse.json({ error: "密码错误" }, { status: 401 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin/login] error:", e);
    return NextResponse.json({ error: "登录失败" }, { status: 500 });
  }
}
