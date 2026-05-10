import type { InterviewQuestion, InterviewQuestionId } from "./types";

/**
 * Q3/Q4 固定题库（6 题）
 * Q1/Q2 由 API 路由基于简历动态生成，不在本题库内。
 */
export const FIXED_QUESTIONS_POOL: { id: string; text: string }[] = [
  { id: "F-01", text: "在工作和技能方面，你最擅长的是什么？" },
  { id: "F-02", text: "在工作中，你觉得自己最不能接受的是什么？" },
  { id: "F-03", text: "你比较希望在什么样的氛围里工作？" },
  { id: "F-04", text: "找工作时你最看重什么？" },
  { id: "F-05", text: "过去做过的事情里，哪一件让你最有成就感？" },
  { id: "F-06", text: "你希望和什么样的人一起共事？" },
];

const Q3Q4_SESSION_KEY = "q3q4Lock";

/**
 * Fisher-Yates 洗牌后取前 2 题。每次调用都是新一轮随机抽样。
 */
export function sampleTwoFixed(): { id: string; text: string }[] {
  const arr = FIXED_QUESTIONS_POOL.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, 2);
}

/**
 * 浏览器端：先读 sessionStorage.q3q4Lock，无则抽并写入；服务端调用直接 sampleTwoFixed。
 * 防止用户刷新页面换题。
 */
export function getOrSampleFixedFromSession(): { id: string; text: string }[] {
  if (typeof window === "undefined") {
    return sampleTwoFixed();
  }

  try {
    const cached = window.sessionStorage.getItem(Q3Q4_SESSION_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (
        Array.isArray(parsed) &&
        parsed.length === 2 &&
        parsed.every(
          (q) =>
            q &&
            typeof q.id === "string" &&
            typeof q.text === "string",
        )
      ) {
        return parsed as { id: string; text: string }[];
      }
    }
  } catch {
    // 解析失败时忽略缓存，重新抽。
  }

  const picked = sampleTwoFixed();
  try {
    window.sessionStorage.setItem(Q3Q4_SESSION_KEY, JSON.stringify(picked));
  } catch {
    // 写入失败（隐私模式 / 配额超限）静默降级。
  }
  return picked;
}

/**
 * 把固定题转成 Q3, Q4 的 InterviewQuestion 形态（source='fixed'）。
 */
export function buildQ3Q4(): InterviewQuestion[] {
  const picked = getOrSampleFixedFromSession();
  const ids: InterviewQuestionId[] = ["Q3", "Q4"];
  return picked.map((q, idx) => ({
    id: ids[idx],
    text: q.text,
    source: "fixed" as const,
  }));
}
