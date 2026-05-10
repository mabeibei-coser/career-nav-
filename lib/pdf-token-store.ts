import type { ReportData } from "@/lib/types";
import { randomUUID } from "crypto";

const TTL_MS = 10 * 60 * 1000; // 10 分钟

interface Entry {
  data: ReportData;
  expiresAt: number;
}

// 单实例 Node 部署假设（runtime = nodejs + maxDuration = 180 已支撑此假设）
// 若未来切 Vercel serverless / 多实例,需换 Redis
const store: Map<string, Entry> = new Map();

// 模块加载时启动 GC 定时器;global-guard 防 dev HMR 重复注册
const GLOBAL_KEY = "__pdfTokenStoreGC";
if (typeof globalThis !== "undefined" && !(globalThis as Record<string, unknown>)[GLOBAL_KEY]) {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of store.entries()) {
      if (v.expiresAt < now) store.delete(k);
    }
  }, 60_000);
  timer.unref?.(); // 不阻塞进程退出
  (globalThis as Record<string, unknown>)[GLOBAL_KEY] = true;
}

export function putReportData(data: ReportData): string {
  const token = randomUUID();
  store.set(token, { data, expiresAt: Date.now() + TTL_MS });
  return token;
}

export function takeReportData(token: string): ReportData | null {
  const entry = store.get(token);
  if (!entry) return null;
  store.delete(token); // 一次性消费,哪怕过期也要删
  if (entry.expiresAt < Date.now()) return null;
  return entry.data;
}

/**
 * 非消费读取：pdf/route.ts 的 GET 在 job 未命中时兜底渲染需要读 reportData，
 * 但下载可能失败重试，不能消费掉 token。TTL 到期自然清理。
 */
export function peekReportData(token: string): ReportData | null {
  const entry = store.get(token);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    store.delete(token); // 过期即清
    return null;
  }
  return entry.data;
}
