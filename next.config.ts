import type { NextConfig } from "next";

// NEXT_PUBLIC_BASE_PATH controls subpath deployment (e.g. "/a300").
// Leave unset for root deployment. Set in .env.local / .env.production.local.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  basePath: BASE_PATH,
  // assetPrefix keeps /_next/static isolated from sibling apps on the same domain.
  // With basePath="/a300", static assets are served at /a300/_next/static/...
  // Nginx must strip the /a300 prefix before proxying _next requests to this app.
  assetPrefix: BASE_PATH,
  serverExternalPackages: [
    "pdf-parse",
    "mammoth",
    "puppeteer",
    "puppeteer-core",
    "better-sqlite3",
  ],
};

export default nextConfig;
