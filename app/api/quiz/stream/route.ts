import { NextRequest } from "next/server";
import { getDeepseekClient, DEEPSEEK_MODEL } from "@/lib/deepseek";
import iflytek, { IFLYTEK_MODEL } from "@/lib/iflytek";
import {
  FALLBACK_QUESTIONS,
  JSON_CONSTRAINT_PREFIX,
  buildQuizSystemPrompt,
  buildQuizUserPrompt,
  normalizeQuestion,
  ProgressiveQuestionParser,
} from "@/lib/quiz-stream";
import { stripReasoning, extractJson, tryFixAndParse } from "@/lib/report-shared";
import type { JobFormData, QuizQuestion } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

const TOTAL_QUESTIONS = 8;
// 讯飞 Coding（主模型）流式 40s 超时 → 讯飞通用（兜底模型）非流式补齐 → 静态题库兜底
const STREAM_TIMEOUT_MS = 40_000;

export async function POST(req: NextRequest) {
  let formData: JobFormData;
  try {
    const body = await req.json();
    formData = body?.formData;
    if (!formData?.identity) throw new Error("missing identity");
  } catch {
    return new Response(
      JSON.stringify({ error: "formData 缺失" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  if (process.env.E2E_MOCK_MODE === "true") {
    return mockSSEResponse();
  }

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      const send = (data: string) => {
        try {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch { /* controller already closed */ }
      };

      let emittedCount = 0;

      const emitQuestion = (q: QuizQuestion) => {
        send(JSON.stringify({ type: "question", question: q }));
        emittedCount++;
      };

      // 第一轮：讯飞 Coding（主模型）流式生成
      try {
        await streamFromPrimary(formData, emitQuestion);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[quiz/stream] 主模型流式超时/失败，已出 ${emittedCount} 题:`, msg);
      }

      // 第二轮：主模型没出满 → 讯飞通用模型（兜底）非流式补齐
      if (iflytek && emittedCount < TOTAL_QUESTIONS) {
        try {
          const remaining = TOTAL_QUESTIONS - emittedCount;
          console.info(`[quiz/stream] 讯飞通用模型补位: 还需 ${remaining} 题`);
          const questions = await generateFromFallbackLLM(formData);
          // 跳过前 emittedCount 题（避免与已生成的重复），取剩余数量
          for (const q of questions.slice(emittedCount, TOTAL_QUESTIONS)) {
            emitQuestion(q);
          }
        } catch (ifErr) {
          const ifMsg = ifErr instanceof Error ? ifErr.message : String(ifErr);
          console.warn("[quiz/stream] 讯飞通用模型也失败:", ifMsg);
        }
      }

      // 第三轮：两个模型都没出满 → 静态题库兜底
      if (emittedCount < TOTAL_QUESTIONS) {
        console.info(`[quiz/stream] 静态兜底: 已生成 ${emittedCount} 题，补 ${TOTAL_QUESTIONS - emittedCount} 题`);
        for (const q of FALLBACK_QUESTIONS.slice(emittedCount)) {
          emitQuestion(q);
        }
      }

      send("[DONE]");
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-store",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

/**
 * 讯飞 Coding Plan（主模型）流式生成 8 题。
 * env 变量沿用 DEEPSEEK_* 命名，实际连接 maas-coding-api.cn-huabei-1.xf-yun.com。
 */
async function streamFromPrimary(
  formData: JobFormData,
  emitQuestion: (q: QuizQuestion) => void,
): Promise<void> {
  const client = getDeepseekClient();
  const parser = new ProgressiveQuestionParser();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), STREAM_TIMEOUT_MS);

  try {
    const stream = await client.chat.completions.create(
      {
        model: DEEPSEEK_MODEL,
        messages: [
          { role: "system", content: JSON_CONSTRAINT_PREFIX + buildQuizSystemPrompt() },
          { role: "user", content: buildQuizUserPrompt(formData) },
        ],
        temperature: 1.0,
        max_tokens: 4000,
        stream: true,
      },
      { signal: controller.signal },
    );

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (!delta) continue;

      const newQuestions = parser.push(delta);
      for (const q of newQuestions) emitQuestion(q);

      if (parser.getEmittedCount() >= TOTAL_QUESTIONS) break;
    }

    if (parser.getEmittedCount() < TOTAL_QUESTIONS) {
      throw new Error(`主模型只生成了 ${parser.getEmittedCount()} 题`);
    }
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 讯飞通用模型（兜底）非流式生成。
 * 主模型超时后调用，补齐剩余题目。
 */
async function generateFromFallbackLLM(formData: JobFormData): Promise<QuizQuestion[]> {
  if (!iflytek) throw new Error("讯飞通用模型未配置");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await iflytek.chat.completions.create(
      {
        model: IFLYTEK_MODEL,
        messages: [
          { role: "system", content: JSON_CONSTRAINT_PREFIX + buildQuizSystemPrompt() },
          { role: "user", content: buildQuizUserPrompt(formData) },
        ],
        temperature: 1.0,
        max_tokens: 4000,
      },
      { signal: controller.signal },
    );

    const rawContent = response.choices[0]?.message?.content || "";
    const cleaned = stripReasoning(rawContent);
    const jsonStr = extractJson(cleaned);
    const data = tryFixAndParse(jsonStr) as { questions?: { text: string; options: { label: string; text: string; primary?: string; secondary?: string }[] }[] };

    if (!data?.questions || !Array.isArray(data.questions)) {
      throw new Error("讯飞通用模型返回格式异常");
    }

    return data.questions
      .slice(0, TOTAL_QUESTIONS)
      .map((q, i) => normalizeQuestion(q, i));
  } finally {
    clearTimeout(timer);
  }
}

function mockSSEResponse(): Response {
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    start(controller) {
      for (const q of FALLBACK_QUESTIONS) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "question", question: q })}\n\n`),
        );
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-store",
    },
  });
}
