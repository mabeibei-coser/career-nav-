import { NextResponse } from "next/server";
import { loadQuizBank, sampleQuestions, validateBank } from "@/lib/quiz-bank";

export const runtime = "nodejs";

export async function GET() {
  try {
    const bank = loadQuizBank();
    validateBank(bank, 5);
    const questions = sampleQuestions(bank, 2);
    return NextResponse.json(
      { questions, version: bank.version },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "quiz-bank load failed";
    console.error("[api/quiz/bank] load failed:", msg);
    return NextResponse.json({ errorMessage: msg }, { status: 503 });
  }
}
