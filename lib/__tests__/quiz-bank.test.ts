import { describe, it, expect } from "vitest";
import {
  loadQuizBank,
  sampleQuestions,
  validateBank,
} from "../quiz-bank";
import type { QuizDimension } from "../types";

const EXPECTED_DIMENSIONS: QuizDimension[] = [
  "personality",
  "workstyle",
  "value",
  "direction",
];

describe("loadQuizBank", () => {
  it("dimensions 数组长度 = 4", () => {
    const bank = loadQuizBank();
    expect(bank.dimensions).toHaveLength(4);
  });

  it("4 个 dimension key 完整：personality / workstyle / value / direction", () => {
    const bank = loadQuizBank();
    const keys = bank.dimensions.map((d) => d.key);
    for (const required of EXPECTED_DIMENSIONS) {
      expect(keys).toContain(required);
    }
  });

  it("每维度 ≥ 5 题（实际是 6 题）", () => {
    const bank = loadQuizBank();
    for (const dim of bank.dimensions) {
      expect(dim.questions.length).toBeGreaterThanOrEqual(5);
    }
  });

  it("注入 dimension 字段（每题都有）", () => {
    const bank = loadQuizBank();
    for (const dim of bank.dimensions) {
      for (const q of dim.questions) {
        expect(q.dimension).toBe(dim.key);
      }
    }
  });
});

describe("validateBank", () => {
  it("真题库 loadQuizBank() 通过校验，不抛错", () => {
    const bank = loadQuizBank();
    expect(() => validateBank(bank)).not.toThrow();
  });
});

describe("sampleQuestions", () => {
  it("perDimension=2 返回 8 题，按 4 维度顺序", () => {
    const bank = loadQuizBank();
    const sampled = sampleQuestions(bank, 2);
    expect(sampled).toHaveLength(8);

    // 每两题一组应该按 DIMENSION_ORDER 顺序：personality / workstyle / value / direction
    expect(sampled[0].dimension).toBe("personality");
    expect(sampled[1].dimension).toBe("personality");
    expect(sampled[2].dimension).toBe("workstyle");
    expect(sampled[3].dimension).toBe("workstyle");
    expect(sampled[4].dimension).toBe("value");
    expect(sampled[5].dimension).toBe("value");
    expect(sampled[6].dimension).toBe("direction");
    expect(sampled[7].dimension).toBe("direction");
  });

  it("抽样均匀性：100 次后每题都至少被抽中过，粗略均匀（最大/最小 ≤ 3 倍）", () => {
    const bank = loadQuizBank();
    const counts = new Map<string, number>();

    for (let i = 0; i < 100; i++) {
      const sampled = sampleQuestions(bank, 2);
      for (const q of sampled) {
        counts.set(q.id, (counts.get(q.id) ?? 0) + 1);
      }
    }

    // 每维 6 题、每次抽 2 题、跑 100 次：每题理论被抽中 ~33 次
    // 100 次样本量小，方差可能较大，宽松到 3 倍以避免抖测
    for (const dim of bank.dimensions) {
      const dimCounts = dim.questions.map((q) => counts.get(q.id) ?? 0);
      const min = Math.min(...dimCounts);
      const max = Math.max(...dimCounts);
      // 全部题目都应被至少抽中过
      expect(min).toBeGreaterThan(0);
      // 最大不超过最小的 3 倍（粗略均匀，允许随机波动）
      expect(max).toBeLessThanOrEqual(min * 3);
    }
  });
});
