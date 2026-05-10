import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

interface AdminSession {
  isAdmin: boolean;
  loggedInAt?: number;
}

const sessionOptions: SessionOptions = {
  password: process.env.ADMIN_SESSION_PASSWORD!,
  cookieName: "career_admin_session",
  cookieOptions: {
    secure:
      process.env.ADMIN_COOKIE_SECURE !== "false" &&
      process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  },
};

export async function getAdminSession() {
  return getIronSession<AdminSession>(await cookies(), sessionOptions);
}

export async function loginAdmin(password: string): Promise<boolean> {
  // ADMIN_PASSWORD_HASH is stored as base64 to avoid dotenv $ expansion issues.
  const raw = process.env.ADMIN_PASSWORD_HASH ?? "";
  const hash = Buffer.from(raw, "base64").toString("utf8");
  const ok = await bcrypt.compare(password, hash);
  if (!ok) return false;
  const s = await getAdminSession();
  s.isAdmin = true;
  s.loggedInAt = Date.now();
  await s.save();
  return true;
}

export async function logoutAdmin(): Promise<void> {
  const s = await getAdminSession();
  s.destroy();
}
