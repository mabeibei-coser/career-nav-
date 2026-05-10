import { NextResponse, type NextRequest } from "next/server";
import { getIronSession } from "iron-session";

export async function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  if (pathname === "/admin/login" || pathname === "/api/admin/login") {
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    const sessionPwd = process.env.ADMIN_SESSION_PASSWORD;

    // If session password is not configured, deny all admin access
    if (!sessionPwd || sessionPwd.length < 32) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "服务端配置错误" }, { status: 500 });
      }
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }

    const res = NextResponse.next();
    const session = await getIronSession<{ isAdmin?: boolean }>(req, res, {
      password: sessionPwd,
      cookieName: "career_admin_session",
    });

    if (!session.isAdmin) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "未登录" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }

    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
