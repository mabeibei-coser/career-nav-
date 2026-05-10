import type {
  QuizAnswer,
  QuizBank,
  QuizQuestion,
  ScoringResult,
  AbilityKey,
  QuizDimension,
  DimensionScore,
  AbilityScore,
} from "./types";
import { QUIZ_DIMENSION_NAMES, ABILITY_NAMES } from "./types";

const DIMENSION_ORDER: QuizDimension[] = [
  "personality",
  "workstyle",
  "value",
  "direction",
];

const ABILITY_ORDER: AbilityKey[] = [
  "communication",
  "collaboration",
  "execution",
  "learning",
  "data",
  "stress",
];

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return 50;
  return Math.max(lo, Math.min(hi, n));
}

function linearMap1to5(avg: number): number {
  if (!Number.isFinite(avg)) return 50;
  return ((avg - 1) / 4) * 100;
}

function buildQuestionIndex(bank: QuizBank): Map<string, QuizQuestion> {
  const idx = new Map<string, QuizQuestion>();
  for (const dim of bank.dimensions) {
    for (const q of dim.questions) {
      idx.set(q.id, q);
    }
  }
  return idx;
}

export function scoreQuiz(
  answers: QuizAnswer[],
  bank: QuizBank
): ScoringResult {
  const qIndex = buildQuestionIndex(bank);

  // 收集每题的 (question, score)，过滤掉找不到的 questionId
  const scored: { q: QuizQuestion; score: number }[] = [];
  for (const ans of answers) {
    const q = qIndex.get(ans.questionId);
    if (!q) continue; // 不存在的 questionId 跳过
    const score = q.reverse ? 6 - ans.raw : ans.raw;
    scored.push({ q, score });
  }

  // ===== 四维雷达 =====
  const fourDim: DimensionScore[] = DIMENSION_ORDER.map((dim) => {
    const items = scored.filter((s) => s.q.dimension === dim);
    let score: number;
    if (items.length === 0) {
      score = 50;
    } else {
      const avg = items.reduce((sum, s) => sum + s.score, 0) / items.length;
      score = linearMap1to5(avg);
    }
    return {
      dimension: dim,
      name: QUIZ_DIMENSION_NAMES[dim],
      score: clamp(Math.round(score), 0, 100),
    };
  });

  // ===== 能力雷达 =====
  const ability: AbilityScore[] = ABILITY_ORDER.map((k) => {
    let weightedSum = 0;
    let weightTotal = 0;
    for (const s of scored) {
      const w = s.q.weights[k];
      if (typeof w === "number" && w > 0) {
        weightedSum += w * s.score;
        weightTotal += w;
      }
    }
    let score: number;
    if (weightTotal === 0) {
      score = 50; // 无题贡献，默认中性
    } else {
      const avg = weightedSum / weightTotal;
      score = linearMap1to5(avg);
    }
    return {
      key: k,
      name: ABILITY_NAMES[k],
      score: clamp(Math.round(score), 0, 100),
    };
  });

  return { fourDim, ability };
}

// TODO V1 todo#9: inline tests removed; rewrite as proper unit tests under lib/__tests__/scoring.test.ts using a test runner
