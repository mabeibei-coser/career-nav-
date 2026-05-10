import { describe, it, expect } from "vitest";
import {
  FIXED_QUESTIONS_POOL,
  sampleTwoFixed,
  getOrSampleFixedFromSession,
  buildQ3Q4,
} from "../interview-questions";

describe("FIXED_QUESTIONS_POOL", () => {
  it("长度 = 6", () => {
    expect(FIXED_QUESTIONS_POOL).toHaveLength(6);
  });
});

describe("sampleTwoFixed", () => {
  it("返回 2 题且不重复", () => {
    const picked = sampleTwoFixed();
    expect(picked).toHaveLength(2);
    expect(picked[0].id).not.toBe(picked[1].id);
  });

  it("100 次抽样下，每题被抽中次数差不太悬殊（粗略均匀性）", () => {
    const counts = new Map<string, number>();
    for (let i = 0; i < 100; i++) {
      const picked = sampleTwoFixed();
      for (const q of picked) {
        counts.set(q.id, (counts.get(q.id) ?? 0) + 1);
      }
    }

    // 6 题，每次抽 2 题，跑 100 次 → 期望每题 ~33 次
    const allCounts = FIXED_QUESTIONS_POOL.map(
      (q) => counts.get(q.id) ?? 0,
    );
    const min = Math.min(...allCounts);
    const max = Math.max(...allCounts);
    expect(min).toBeGreaterThan(0);
    // 粗略均匀：max 不超过 min 的 3 倍（允许较大波动，因为 100 次样本量小）
    expect(max).toBeLessThanOrEqual(min * 3);
  });
});

describe("getOrSampleFixedFromSession", () => {
  it("Node 环境（typeof window === 'undefined'）回退到 sampleTwoFixed", () => {
    // Node 默认无 window，应直接走 sampleTwoFixed 分支
    expect(typeof window).toBe("undefined");
    const picked = getOrSampleFixedFromSession();
    expect(picked).toHaveLength(2);
    expect(picked[0].id).not.toBe(picked[1].id);
    // 抽出的 id 必须来自池子
    const poolIds = new Set(FIXED_QUESTIONS_POOL.map((q) => q.id));
    expect(poolIds.has(picked[0].id)).toBe(true);
    expect(poolIds.has(picked[1].id)).toBe(true);
  });
});

describe("buildQ3Q4", () => {
  it("返回 InterviewQuestion[2]，每个 source = 'fixed'，id = 'Q3' / 'Q4'", () => {
    const result = buildQ3Q4();
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("Q3");
    expect(result[0].source).toBe("fixed");
    expect(result[1].id).toBe("Q4");
    expect(result[1].source).toBe("fixed");
    // text 非空
    expect(result[0].text.length).toBeGreaterThan(0);
    expect(result[1].text.length).toBeGreaterThan(0);
  });
});
