export const runtime = "nodejs";
export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import { callWithFallback } from "@/lib/report-shared";
import type {
  InterviewAnswer,
  InterviewQ1Q2,
  JobFormData,
} from "@/lib/types";

// 全局 JSON 约束前缀（与 report-shared 内部使用的版本对齐；本路由内部手动拼装一份精简版）
const JSON_ONLY_PREFIX = `【输出约束 · 必须严格遵守】
1. 只输出合法 JSON 对象，第一个字符必须是 {，最后一个字符必须是 }
2. 禁止任何说明性前言（如"让我分析..." "用户要求..." "好的，我来..."）
3. 禁止 markdown 代码围栏（\`\`\`json）
4. 禁止 JSON 之外的任何文字、注释、解释
5. 禁止思考过程被输出到 response 里

`;

// POST /api/interview/summarize
// Input:  { answers: InterviewAnswer[]; formData?: JobFormData }
//   - 4 题答案（Q1–Q4），但只有 Q1/Q2 进总结，Q3/Q4 完全忽略不入 prompt
// Output: { q1q2, summary, source }
//   - q1q2:    清洗后的 Q1/Q2 原文
//   - summary: 80–120 字 LLM 简要总结（喂给 ① 总评 + ④ 简历快诊）
//   - source:  "deepseek" | "iflytek" | "mock" | "skipped"
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { q1q2: {}, summary: "", source: "mock", errorMessage: "请求体不是合法 JSON" },
      { status: 200 }
    );
  }

  const { answers = [], formData } = (body ?? {}) as {
    answers?: InterviewAnswer[];
    formData?: JobFormData;
  };

  // 只挑 Q1/Q2，Q3/Q4 完全忽略
  const q1Answer = (
    answers.find((a) => a?.questionId === "Q1")?.text ?? ""
  ).trim();
  const q2Answer = (
    answers.find((a) => a?.questionId === "Q2")?.text ?? ""
  ).trim();

  // 两题都空（用户跳过 / 语音失败）→ 不调 LLM，直接 skipped
  if (!q1Answer && !q2Answer) {
    return NextResponse.json({ q1q2: {}, summary: "", source: "skipped" });
  }

  // 清洗后的原文：只放有内容的字段
  const q1q2: InterviewQ1Q2 = {};
  if (q1Answer) q1q2.Q1 = q1Answer;
  if (q2Answer) q1q2.Q2 = q2Answer;

  const targetPositionLine = formData?.targetPosition
    ? `（用户目标岗位：${formData.targetPosition}）`
    : "";

  const systemPrompt = `${JSON_ONLY_PREFIX}你是黄浦区职业咨询师。读用户的 Q1/Q2 访谈回答，做简要总结（用于后续报告生成）。

【任务】
- summary: 80-120 字的中性总结，提炼用户表达的关键信息（如简历缺失项的解释、模糊处的澄清、个人方向）。不评价、不揣摩。

【硬约束】
- 不评价用户（如"用户表达不够清晰"是审判，不能写）
- 不嘲讽（特别是空白期、转型）
- 不出现 MBTI / 大五等专有词
- 输出仅一段连贯文字，不分点

输出 JSON: { "summary": "..." }`;

  const userPrompt = [
    `【输入】${targetPositionLine}`,
    `- Q1 回答：${q1Answer || "（用户未作答）"}`,
    `- Q2 回答：${q2Answer || "（用户未作答）"}`,
  ].join("\n");

  try {
    const result = await callWithFallback<{ summary: string }>({
      systemPrompt,
      userPrompt,
      maxTokens: 400,
      temperature: 0.5,
      timeoutMs: 20_000,
      validator: (d) => {
        const s = (d?.summary ?? "").trim();
        if (s.length < 30) return "summary 过短";
        return null;
      },
      context: "interview-summarize",
    });

    return NextResponse.json({
      q1q2,
      summary: result.summary.trim(),
      source: "deepseek",
    });
  } catch (error) {
    // 双链路都失败：保留 Q1/Q2 原文，summary 留空
    const message =
      error instanceof Error ? error.message : "LLM 双链路失败";
    console.warn("[interview-summarize] fallback to mock:", message);
    return NextResponse.json({
      q1q2,
      summary: "",
      source: "mock",
      errorMessage: message,
    });
  }
}
