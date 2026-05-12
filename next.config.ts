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
};

export default nextConfig;
