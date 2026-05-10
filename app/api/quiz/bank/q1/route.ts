import { NextResponse } from "next/server";
import { getFixedQuestions } from "@/lib/quiz-bank";

export const runtime = "nodejs";
export const maxDuration = 5;

/**
 * GET /api/quiz/bank/q1
 * 立即返回固定缓冲题（来自 data/quiz-bank.json fixedQuestions），不调 LLM。
 * 当前返回 SJT-01 + SJT-02 共 2 题，让用户在 LLM 生成后续 6 题时有题可答。
 */
export async function GET() {
  try {
    const fixedQuestions = getFixedQuestions();
    if (fixedQuestions.length === 0) {
      console.error("[quiz/bank/q1] fixedQuestions 为空，检查 data/quiz-bank.json");
      return NextResponse.json({ errorMessage: "固定题目缺失" }, { status: 503 });
    }
    return NextResponse.json(
      { questions: fixedQuestions },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return NextResponse.json(
      { errorMessage: e instanceof Error ? e.message : "q1 load failed" },
      { status: 503 },
    );
  }
}
