import { describe, it, expect } from "vitest";
import {
  detectReverseWords,
  getTendency,
  tendencyChip,
} from "../overview-tendency";
import type { DimensionScore } from "../types";

/** 构造一份四维评分（按 lib/scoring.ts DIMENSION_ORDER 顺序） */
function makeFourDim(scores: {
  personality?: number;
  workstyle?: number;
  value?: number;
  direction?: number;
}): DimensionScore[] {
  return [
    { dimension: "personality", name: "性格底色", score: scores.personality ?? 50 },
    { dimension: "workstyle", name: "工作风格", score: scores.workstyle ?? 50 },
    { dimension: "value", name: "价值驱动", score: scores.value ?? 50 },
    { dimension: "direction", name: "适配方向", score: scores.direction ?? 50 },
  ];
}

describe("getTendency", () => {
  it("≤40 偏左", () => {
    expect(getTendency(0)).toBe("left");
    expect(getTendency(40)).toBe("left");
  });
  it("41-60 较均衡", () => {
    expect(getTendency(41)).toBe("center");
    expect(getTendency(50)).toBe("center");
    expect(getTendency(60)).toBe("center");
  });
  it("≥61 偏右", () => {
    expect(getTendency(61)).toBe("right");
    expect(getTendency(100)).toBe("right");
  });
});

describe("tendencyChip", () => {
  it("价值驱动偏右 → 偏探索", () => {
    expect(tendencyChip(75, "value")).toBe("偏探索");
  });
  it("价值驱动偏左 → 偏稳定", () => {
    expect(tendencyChip(20, "value")).toBe("偏稳定");
  });
  it("价值驱动均衡 → 较均衡", () => {
    expect(tendencyChip(50, "value")).toBe("较均衡");
  });
});

describe("detectReverseWords — 复现用户报告的 bug", () => {
  it("价值驱动偏探索，性格定位含「稳健务实」→ 冲突", () => {
    // 用户截图：value=72（偏探索），却生成"稳健务实型执行者"
    const fourDim = makeFourDim({ value: 72 });
    const text = "稳健务实型执行者 吃苦耐劳 善于合作 学习力强 踏实肯干";
    const conflicts = detectReverseWords(text, fourDim);

    expect(conflicts.length).toBeGreaterThan(0);
    const valueConflict = conflicts.find((c) => c.dimension === "value");
    expect(valueConflict).toBeDefined();
    expect(valueConflict!.tendency).toBe("right");
    // "稳健"、"务实"、"踏实肯干" 都是 value.left 反向词
    expect(valueConflict!.hits).toEqual(
      expect.arrayContaining(["稳健", "务实", "踏实肯干"])
    );
  });

  it("价值驱动偏稳定，性格定位含「探索开拓」→ 冲突", () => {
    const fourDim = makeFourDim({ value: 25 });
    const text = "探索开拓型执行者 进取 拼搏";
    const conflicts = detectReverseWords(text, fourDim);

    const valueConflict = conflicts.find((c) => c.dimension === "value");
    expect(valueConflict).toBeDefined();
    expect(valueConflict!.tendency).toBe("left");
    expect(valueConflict!.hits).toEqual(
      expect.arrayContaining(["探索", "进取", "拼搏"])
    );
  });

  it("均衡维度（score=50）跳过校验，不算冲突", () => {
    // 价值驱动均衡时，无论用稳健还是探索都不该报错
    const fourDim = makeFourDim({ value: 50 });
    const text1 = "稳健务实型协作者";
    const text2 = "探索进取型开拓者";
    expect(detectReverseWords(text1, fourDim)).toHaveLength(0);
    expect(detectReverseWords(text2, fourDim)).toHaveLength(0);
  });

  it("方向一致（偏探索 + 探索类词）→ 无冲突", () => {
    const fourDim = makeFourDim({ value: 78, workstyle: 70 });
    const text = "灵活进取型探索者 主动开拓 拼搏";
    const conflicts = detectReverseWords(text, fourDim);
    expect(conflicts).toHaveLength(0);
  });

  it("多维同时冲突 → 全部列出", () => {
    // 工作风格偏灵活（70）+ 价值驱动偏探索（75），但文案全是保守词
    const fourDim = makeFourDim({ workstyle: 70, value: 75 });
    const text = "按部就班的务实派 守规";
    const conflicts = detectReverseWords(text, fourDim);

    expect(conflicts.map((c) => c.dimension).sort()).toEqual([
      "value",
      "workstyle",
    ]);
  });

  it("「沉稳」不算 personality.left 反向词（避免对偏外向用户误判）", () => {
    // 故意把 personality 设偏右，验证"沉稳"不会被命中
    const fourDim = makeFourDim({ personality: 75 });
    const text = "沉稳协调者";
    const conflicts = detectReverseWords(text, fourDim);
    expect(conflicts.find((c) => c.dimension === "personality")).toBeUndefined();
  });
});
