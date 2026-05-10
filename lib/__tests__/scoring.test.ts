import { describe, it, expect } from "vitest";
import { scoreQuiz } from "../scoring";
import type { QuizBank, QuizAnswer } from "../types";

// 构造一个 mock 题库，覆盖 4 维度，含正向题、反向题、有/无 ability 权重的题
function makeMockBank(): QuizBank {
  return {
    version: "test",
    dimensions: [
      {
        key: "personality",
        name: "性格底色",
        questions: [
          {
            id: "P-01",
            dimension: "personality",
            text: "正向题，给 communication 加权",
            reverse: false,
            weights: { communication: 1.0 },
          },
          {
            id: "P-02",
            dimension: "personality",
            text: "反向题",
            reverse: true,
            weights: { collaboration: 1.0 },
          },
        ],
      },
      {
        key: "workstyle",
        name: "工作风格",
        questions: [
          {
            id: "W-01",
            dimension: "workstyle",
            text: "正向题，给 execution 加权",
            reverse: false,
            weights: { execution: 1.0 },
          },
          {
            id: "W-02",
            dimension: "workstyle",
            text: "正向题，给 learning 加权",
            reverse: false,
            weights: { learning: 1.0 },
          },
        ],
      },
      {
        key: "value",
        name: "价值驱动",
        questions: [
          {
            // value 维度有题但 weights 完全空，专门测 ability 无贡献场景
            id: "V-01",
            dimension: "value",
            text: "无 ability 权重",
            reverse: false,
            weights: {},
          },
          {
            id: "V-02",
            dimension: "value",
            text: "无 ability 权重",
            reverse: false,
            weights: {},
          },
        ],
      },
      {
        key: "direction",
        name: "适配方向",
        questions: [
          {
            id: "D-01",
            dimension: "direction",
            text: "给 data 加权",
            reverse: false,
            weights: { data: 1.0 },
          },
          {
            id: "D-02",
            dimension: "direction",
            text: "给 stress 加权",
            reverse: false,
            weights: { stress: 1.0 },
          },
        ],
      },
    ],
  };
}

const ALL_QUESTION_IDS = [
  "P-01",
  "P-02",
  "W-01",
  "W-02",
  "V-01",
  "V-02",
  "D-01",
  "D-02",
];

function buildAnswers(
  raw: 1 | 2 | 3 | 4 | 5,
  ids: string[] = ALL_QUESTION_IDS,
): QuizAnswer[] {
  return ids.map((id) => {
    let dim: QuizAnswer["dimension"] = "personality";
    if (id.startsWith("W")) dim = "workstyle";
    else if (id.startsWith("V")) dim = "value";
    else if (id.startsWith("D")) dim = "direction";
    return { questionId: id, dimension: dim, raw };
  });
}

describe("scoreQuiz", () => {
  it("t1: 全 raw=3 → 所有维度 score=50", () => {
    const bank = makeMockBank();
    const answers = buildAnswers(3);
    const result = scoreQuiz(answers, bank);

    expect(result.fourDim).toHaveLength(4);
    for (const d of result.fourDim) {
      expect(d.score).toBe(50);
    }
  });

  it("t2: 反向题 raw=1, reverse=true → 维度 score=100", () => {
    const bank = makeMockBank();
    // 只回答 P-02（反向题），raw=1 → 反向后 score=5 → 维度均值 5 → 维度分 100
    const answers: QuizAnswer[] = [
      { questionId: "P-02", dimension: "personality", raw: 1 },
    ];
    const result = scoreQuiz(answers, bank);
    const personality = result.fourDim.find((d) => d.dimension === "personality");
    expect(personality).toBeDefined();
    expect(personality!.score).toBe(100);
  });

  it("t3: ability 无任何题贡献 weight → 默认 50（不 NaN）", () => {
    const bank = makeMockBank();
    // 只回答 V-01 和 V-02（weights 空），不会给任何 ability 加权
    const answers: QuizAnswer[] = [
      { questionId: "V-01", dimension: "value", raw: 5 },
      { questionId: "V-02", dimension: "value", raw: 5 },
    ];
    const result = scoreQuiz(answers, bank);
    for (const a of result.ability) {
      expect(Number.isFinite(a.score)).toBe(true);
      expect(a.score).toBe(50);
    }
  });

  it("t4: 全 raw=5 + 无反向 → 维度/ability 接近 100", () => {
    // 跳过反向题 P-02 以避免反向后压低均值
    const ids = ALL_QUESTION_IDS.filter((id) => id !== "P-02");
    const bank = makeMockBank();
    const answers = buildAnswers(5, ids);
    const result = scoreQuiz(answers, bank);

    // 维度：personality 只剩 P-01（正向 raw=5），其他维度全是正向 raw=5
    for (const d of result.fourDim) {
      expect(d.score).toBe(100);
    }

    // ability：communication / execution / learning / data / stress 都该接近 100
    // collaboration 没题贡献（P-02 被排除），按 t3 逻辑等于 50
    const abilityMap = Object.fromEntries(
      result.ability.map((a) => [a.key, a.score]),
    );
    expect(abilityMap.communication).toBe(100);
    expect(abilityMap.execution).toBe(100);
    expect(abilityMap.learning).toBe(100);
    expect(abilityMap.data).toBe(100);
    expect(abilityMap.stress).toBe(100);
    expect(abilityMap.collaboration).toBe(50);
  });

  it("t5: 不存在的 questionId 跳过不报错", () => {
    const bank = makeMockBank();
    const answers: QuizAnswer[] = [
      { questionId: "NOT-EXIST", dimension: "personality", raw: 5 },
      { questionId: "P-01", dimension: "personality", raw: 3 },
    ];
    expect(() => scoreQuiz(answers, bank)).not.toThrow();
    const result = scoreQuiz(answers, bank);
    // P-01 raw=3 → 维度均值 3 → score 50
    const personality = result.fourDim.find((d) => d.dimension === "personality");
    expect(personality!.score).toBe(50);
  });
});
