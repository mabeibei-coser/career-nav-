import { NextRequest, NextResponse } from "next/server";
import { FALLBACK_GENERATED, generateSJTQuestions } from "@/lib/quiz-generate";
import type { JobFormData, QuizQuestion } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * POST /api/quiz/bank/generated
 * Body: { formData: JobFormData }
 * 返回：{ questions: QuizQuestion[6], version: string }
 *
 * LLM 个性化生成 SJT-03 到 SJT-08（6 道），失败时使用兜底题。
 * 与 /api/quiz/bank/q1 配合使用：前端先拉固定 SJT-01 + SJT-02 立即显示，
 * 本端点在后台异步生成，用户可在等待时先答 2 题。
 *
 * Layer 2 优化：内存缓存（15 种档案组合，TTL 6h）
 * - 相同 identity + education 直接返回缓存，0ms
 * - 首次请求走 LLM（~6-10s 精简 prompt 后），随后同档案秒回
 */

// ===== 内存缓存 =====
// Key: `${identity}:${education}`（共 3×5=15 种组合）
// TTL: 6 小时（同一天同类人出相同题可接受）
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

interface CacheEntry {
  questions: QuizQuestion[];
  cachedAt: number;
}

const questionCache = new Map<string, CacheEntry>();

function getCacheKey(formData: Partial<JobFormData>): string {
  // identity + education 决定题目场景；workYears/targetPosition 影响细节但不影响缓存命中
  return `${formData.identity ?? "unknown"}:${formData.education ?? "unknown"}`;
}

function getFromCache(key: string): QuizQuestion[] | null {
  const entry = questionCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
    questionCache.delete(key);
    return null;
  }
  return entry.questions;
}

function setToCache(key: string, questions: QuizQuestion[]): void {
  questionCache.set(key, { questions, cachedAt: Date.now() });
}

// ===== 请求处理 =====
export async function POST(req: NextRequest) {
  let formData: Partial<JobFormData> = {};
  try {
    const body = await req.json();
    formData = body?.formData ?? { identity: body?.identity };
  } catch {
    // body 解析失败，使用默认值（会命中 unknown:unknown 缓存桶）
  }

  const cacheKey = getCacheKey(formData);

  // 缓存命中 → 直接返回
  const cached = getFromCache(cacheKey);
  if (cached) {
    return NextResponse.json(
      { questions: cached, version: "cached" },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  // 缓存未命中 → 调用 LLM
  try {
    const questions = await generateSJTQuestions(formData);
    setToCache(cacheKey, questions);
    return NextResponse.json(
      { questions, version: "llm" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "generated load failed";
    console.error("[api/quiz/bank/generated] LLM failed, using fallback:", msg);
    // fallback 不写缓存，让下次重试 LLM
    return NextResponse.json(
      { questions: FALLBACK_GENERATED, version: "fallback" },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}
