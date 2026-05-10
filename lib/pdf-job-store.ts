/**
 * PDF 渲染 job 缓存
 * ————————————————
 * 与 pdf-token-store 分层：token-store 存 reportData；job-store 存渲染 Promise/Buffer。
 * 两者共用同一个 token 作为索引键。
 *
 * 使用场景：
 *   /prepare 接口拿到 token 后立即 startJob(token, reportData, renderFn) fire-and-forget；
 *   /pdf GET 收到同一 token 时 await job.promise —— 已完成秒出，未完成 HTTP 连接天然 hold。
 *
 * 单实例 Node 部署假设（同 pdf-token-store）；多实例需换 Redis 或类似共享存储。
 */
import type { ReportData } from "@/lib/types";

/** 30 分钟：够用户读完报告再点下载；比 token-store 的 10 分钟长。*/
const TTL_MS = 30 * 60 * 1000;

export interface PdfJob {
  status: "pending" | "ready" | "error";
  /** 所有 await 者共享同一个 promise：已完成立刻返回，未完成挂起等 settle */
  promise: Promise<Buffer>;
  /** resolved 后填入；供命中状态快速返回用（await 也能拿到同样的结果） */
  buffer?: Buffer;
  /** rejected 后填入；展示/告警用 */
  error?: string;
  expiresAt: number;
}

const jobs: Map<string, PdfJob> = new Map();

// 模块加载时启动 GC 定时器；global-guard 防 dev HMR 重复注册
const GLOBAL_KEY = "__pdfJobStoreGC";
if (
  typeof globalThis !== "undefined" &&
  !(globalThis as Record<string, unknown>)[GLOBAL_KEY]
) {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of jobs.entries()) {
      // pending 状态不清理（防止渲染中 entry 被掏空）；等 settle 后下一轮 GC 回收
      if (v.status !== "pending" && v.expiresAt < now) {
        jobs.delete(k);
      }
    }
  }, 60_000);
  timer.unref?.(); // 不阻塞进程退出
  (globalThis as Record<string, unknown>)[GLOBAL_KEY] = true;
}

/**
 * 启动后台渲染任务。
 * - **幂等**：同 token 二次调直接返回已有 job，不会重复启动 Puppeteer
 * - 返回的 PdfJob.promise 是单例，所有消费者共享同一次渲染结果
 * - renderFn 抛错时 job.status = "error"，promise 会 reject —— 上游 await 时能拿到原始错误
 */
export function startJob(
  token: string,
  reportData: ReportData,
  renderFn: (data: ReportData) => Promise<Buffer>
): PdfJob {
  const existing = jobs.get(token);
  if (existing) return existing;

  const job: PdfJob = {
    status: "pending",
    // 立即调用 renderFn 让它后台跑；不 await
    promise: renderFn(reportData),
    expiresAt: Date.now() + TTL_MS,
  };
  job.promise
    .then((buffer) => {
      job.buffer = buffer;
      job.status = "ready";
    })
    .catch((err) => {
      job.error = err instanceof Error ? err.message : String(err);
      job.status = "error";
    });
  jobs.set(token, job);
  return job;
}

/**
 * 按 token 读取 job。
 * - 不存在返回 null
 * - 过期且非 pending 自动清理并返回 null
 * - pending 状态即使"过期"也保留（等渲染 settle）
 */
export function getJob(token: string): PdfJob | null {
  const job = jobs.get(token);
  if (!job) return null;
  if (job.status !== "pending" && job.expiresAt < Date.now()) {
    jobs.delete(token);
    return null;
  }
  return job;
}

/** 测试/调试用：强制清除所有 job。正常代码不调。 */
export function __clearAllJobs(): void {
  jobs.clear();
}
