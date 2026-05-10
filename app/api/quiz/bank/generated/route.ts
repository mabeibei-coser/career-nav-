import { NextRequest, NextResponse } from "next/server";
import { FALLBACK_GENERATED, generateSJTQuestions } from "@/lib/quiz-generate";
import type { JobFormData } from "@/lib/types";

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
 */
export async function POST(req: NextRequest) {
  let formData: Partial<JobFormData> = {};
  try {
    const body = await req.json();
    formData = body?.formData ?? { identity: body?.identity };
  } catch {
    // body 解析失败，使用默认
  }

  try {
    const questions = await generateSJTQuestions(formData);
    return NextResponse.json(
      { questions, version: "llm" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "generated load failed";
    console.error("[api/quiz/bank/generated] LLM failed, using fallback:", msg);
    return NextResponse.json(
      { questions: FALLBACK_GENERATED, version: "fallback" },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}
