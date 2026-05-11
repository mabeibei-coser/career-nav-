import { NextRequest, NextResponse } from "next/server";
import { FALLBACK_GENERATED, generateSJTQuestions } from "@/lib/quiz-generate";
import { makeQuizCacheKey, getFromQuizCache, setToQuizCache } from "@/lib/quiz-cache";
import type { JobFormData } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * POST /api/quiz/bank/generated
 * Body: { formData: JobFormData }
 * 返回：{ questions: QuizQuestion[6], version: string }
 *
 * 缓存策略（Stale-While-Revalidate，始终即时返回）：
 *
 *   specificKey = identity:education:targetPosition  ← 个性化题（后台生成，下次命中）
 *   genericKey  = identity:education                 ← 预热通用题（当次即用）
 *
 *   查找顺序：specificKey → genericKey → FALLBACK
 *   无论命中哪层，若 specificKey 未命中则后台开始个性化生成（不阻塞响应）
 *
 * version 字段：
 *   "cached"  — 命中缓存（个性化或通用），0ms
 *   "warming" — 两层均未命中（预热未完成），返回 FALLBACK + 后台热身
 *
 * 注：个性化题在后台生成（首次约 20-60s），下次请求相同组合将直接命中 specificKey。
 */
export async function POST(req: NextRequest) {
  let formData: Partial<JobFormData> = {};
  try {
    const body = await req.json();
    formData = body?.formData ?? { identity: body?.identity };
  } catch {
    // body 解析失败，使用默认值
  }

  const targetPos = formData.targetPosition?.trim() || undefined;
  const specificKey = makeQuizCacheKey(formData.identity, formData.education, targetPos);
  const genericKey  = makeQuizCacheKey(formData.identity, formData.education);

  // ── 1. 命中个性化缓存（最优，0ms）──────────────────────────────────────
  const specificCached = getFromQuizCache(specificKey);
  if (specificCached) {
    return NextResponse.json(
      { questions: specificCached, version: "cached" },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  // ── 2. 后台启动个性化生成（不阻塞响应）────────────────────────────────
  // 约 20-60s 后写入 specificKey，下次请求命中个性化版
  if (targetPos) {
    generateSJTQuestions(formData)
      .then((questions) => {
        setToQuizCache(specificKey, questions);
        console.log(`[quiz/bank/generated] bg personalized: ${specificKey}`);
      })
      .catch((e) => {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[quiz/bank/generated] bg personalized failed (${specificKey}): ${msg}`);
      });
  }

  // ── 3. 命中通用预热缓存（LLM 生成，按身份场景化，0ms）──────────────────
  const genericCached = getFromQuizCache(genericKey);
  if (genericCached) {
    return NextResponse.json(
      { questions: genericCached, version: "cached" },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  // ── 4. 两层均未命中（预热未完成）→ FALLBACK + 后台热身通用版 ────────────
  if (!targetPos) {
    generateSJTQuestions({ identity: formData.identity, education: formData.education })
      .then((questions) => {
        setToQuizCache(genericKey, questions);
        console.log(`[quiz/bank/generated] bg warmed: ${genericKey}`);
      })
      .catch((e) => {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[quiz/bank/generated] bg warm failed (${genericKey}): ${msg}`);
      });
  }

  return NextResponse.json(
    { questions: FALLBACK_GENERATED, version: "warming" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
