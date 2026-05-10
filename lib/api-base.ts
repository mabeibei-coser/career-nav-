/**
 * Build-time constant: basePath prefix for all client-side fetch calls.
 * NEXT_PUBLIC_BASE_PATH is set in .env.local / .env.production.local.
 * Root deployment: leave NEXT_PUBLIC_BASE_PATH unset (empty string default).
 * Subpath deployment (e.g. /a300): NEXT_PUBLIC_BASE_PATH=/a300
 */
export const API_BASE =
  typeof process !== "undefined"
    ? (process.env.NEXT_PUBLIC_BASE_PATH ?? "")
    : "";
