import type { NextConfig } from "next";

// NEXT_PUBLIC_BASE_PATH controls subpath deployment (e.g. "/a300").
// Leave unset for root deployment. Set in .env.local / .env.production.local.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  basePath: BASE_PATH,
  assetPrefix: BASE_PATH,
  serverExternalPackages: [
    "pdf-parse",
    "mammoth",
    "puppeteer",
    "puppeteer-core",
    "better-sqlite3",
  ],
  headers: async () => [
    {
      source: "/interview",
      headers: [
        { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, proxy-revalidate" },
        { key: "Pragma", value: "no-cache" },
      ],
    },
  ],
  redirects: async () => {
    // career-nav admin 已下线 → 301 跳到 career-report 统一 admin
    // 未配置 CAREER_REPORT_ADMIN_URL 时不跳转（旧地址访问会 404）
    const adminUrl = process.env.CAREER_REPORT_ADMIN_URL;
    if (!adminUrl) return [];
    return [
      { source: "/admin/:path*", destination: `${adminUrl}/admin/:path*`, permanent: true },
      { source: "/api/admin/:path*", destination: `${adminUrl}/api/admin/:path*`, permanent: true },
    ];
  },
};

export default nextConfig;
