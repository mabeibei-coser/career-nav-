import { NextResponse } from "next/server";
import { logoutAdmin } from "@/lib/admin-session";

export async function POST() {
  await logoutAdmin();
  return NextResponse.json({ ok: true });
}
