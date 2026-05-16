/**
 * 报告统一生成端点（单次请求 · 单次 LLM 调用 · 一次性吐 5 章节）
 *
 * 设计：让 LLM 一次性输出包含 5 个模块的完整 JSON。
 *   - 章节间的逻辑一致性由 prompt 内的"全局规则"约束（性格定位→优势→推荐岗位→行动建议）
 *   - 任意一处失败 → 整体走 mock，不再有"局部 fallback"
 *
 * 兼容性：response 结构保持 { data: { overview, strength, positioning, resumeDiagnosis, advice } }
 * 前端 report-client.ts / loading 页无需改动。
 */
import { NextRequest, NextResponse } from "next/server";
import {
  APPLICANT_BASELINE,
  buildBaseContext,
  callWithFallback,
  COMPANY_NO_NAME_NOTE,
  FORBIDDEN_FRAUD_NOTE,
} from "@/lib/report-shared";
import {
  MOCK_ADVICE,
  MOCK_OVERVIEW,
  MOCK_POSITIONING,
  MOCK_RESUME_DIAGNOSIS,
  MOCK_STRENGTH,
} from "@/lib/mocks/report-mocks";
import type {
  Advice,
  InterviewQ1Q2,
  JobFormData,
  Overview,
  Positioning,
  PositionRecommendation,
  ResumeDiagnosis,
  ScoringResult,
  Strength,
} from "@/lib/types";

export const runtime = "nodejs";
// 单次 LLM 调用：输出 ~7000-8000 tokens，P95 估 60-90s
// 讯飞兜底最坏 120s + 120s = 240s，maxDuration 留足 buffer
export const maxDuration = 300;

// 单次大调用硬超时：120s × 2 次（DeepSeek + 讯飞兜底）= 最坏 240s
const COMBINED_TIMEOUT_MS = 120_000;

// ============================================================
// 通用 helpers
// ============================================================

const PLACEHOLDER_RE = [
  /^\.{2,}$/, /^<[^>]*>$/, /^x{2,}$/i, /^示例/, /^请填/, /^\d+\s*-\s*\d+\s*字/,
];
function isBad(s: unknown, min = 2): boolean {
  if (typeof s !== "string") return true;
  const t = s.trim();
  return t.length < min || PLACEHOLDER_RE.some((re) => re.test(t));
}

function clampScore(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v)));
}

function numClamp(n: number, lo: number, hi: number) {
  return !Number.isFinite(n) ? lo : Math.min(Math.max(n, lo), hi);
}

const ABILITY_NAMES = ["沟通表达", "协作意识", "执行落地", "学习能力", "信息处理", "压力适应"];
const PRIORITY_VALUES = ["high", "medium", "low"] as const;
type Priority = (typeof PRIORITY_VALUES)[number];
function isPriority(v: unknown): v is Priority {
  return typeof v === "string" && (PRIORITY_VALUES as readonly string[]).includes(v);
}

const VAGUE_WHOLE_STRINGS: RegExp[] = [
  /^多投简历$/, /^提升能力$/, /^准备面试$/, /^好好学习$/, /^加油$/,
];

// ============================================================
// 合并 system prompt
// ============================================================

function buildMegaSystemPrompt(hasResume: boolean): string {
  const resumeBlock = hasResume
    ? `
【模块 ④：resumeDiagnosis（简历快诊）】
身份：职业指导老师（不是招聘官，支持性而非审判性措辞）
- overallScore: 0-100（评估"简历呈现质量"，不是用户能力本身）
- issues: 1-4 条 { title (10-15字), detail (40-80字), priority "high"/"medium"/"low", quotedSnippet?, revisionExample (40-80字针对本条问题的具体改写) }
- suggestions: 2-4 条 { title, detail（具体可执行） }
- revisionExample 格式：「改前：XXX → 改后：XXX」或直接给出改后版本
硬约束：
- 用"可以补充"、"建议加上"，不用"问题严重"、"完全没有"
- 不嘲讽空白期；Q1/Q2 提供的空白期解释，建议组织进简历
- 不建议造假；不指名具体公司；不出现 MBTI/大五等
- 建议方向参考 overview 性格定位，措辞保持一致
`
    : "\n【模块 ④：resumeDiagnosis】用户未上传简历，本字段必须输出为 null（不要输出对象）\n";

  return `你是黄浦区职业咨询师，一次性生成用户的完整职业导航报告（5 个模块）。

${APPLICANT_BASELINE}

【全局规则 — 必须严格遵守，章节间逻辑闭环】
1. 章节生成顺序在脑子里走：overview → strength → positioning → resumeDiagnosis → advice
2. **性格定位**（overview.personality.type）一旦确定，strength 的优势描述语气、positioning 的选岗逻辑、advice 的行动方向都要与之呼应
3. **推荐岗位**（positioning.primary/secondary.position）一旦确定，advice 的 topThree 不能给出与推荐岗位方向矛盾的建议
4. **能力雷达**（strength.abilityRadar、positioning.coreCompetencies）的 score **必须使用入参 scoring 中的数值**，禁止重新计算（后端会再次覆写，输出错也会被改对）
5. **四维评分**（overview.fourDimRadar）同样照搬入参 scoring.fourDim 数值
6. 简历改进建议（resumeDiagnosis.suggestions）一旦给出，advice 不要重复同样内容

【模块 ① overview（总评）】
1. personality.type：4-10 字纯中文职业性格定位（如"稳健型执行者"），严禁字母代码/缩写
2. personality.traits：3-4 个性格标签（每个 2-4 字）
3. personality.description：80-120 字，结合四维评分和 Q1/Q2 访谈，写职场实际表现
4. fourDimRadar：4 项 { name, score, conclusion }，name 严格用「性格底色/工作风格/价值驱动/适配方向」，score 照搬入参，conclusion ≤30 字
5. summary：120-150 字综述，鼓励 + 务实语气，融入访谈信息
硬约束：personality.type 严禁出现 MBTI/大五/霍兰德/ISTJ/ENFJ 等专有名词或字母代码

【模块 ② strength（优势发现）】
1. abilityRadar: 6 项 { name, score }。name 严格按「沟通表达/协作意识/执行落地/学习能力/信息处理/压力适应」，score 照搬入参
2. strengths: 3 条 { title (8-12字), detail (60-80字，结合简历找具体证据) }
3. growth: 2 条 { title, detail }，用"可以多做 X"的正向语气，避免审判性
硬约束：
- recent_grad 重点说"潜力"；求职者重点说"已积累的经验"，不嘲讽空白期
- 描述语气与 overview.personality 保持一致

【模块 ③ positioning（职业定位）】
- primary: { position, matchScore (0-100), culture, teamRole, coreResponsibilities (5条，14-25字，长度刻意错落), coreCompetencies ([{name}] 必须 5 项，name 从「沟通表达/协作意识/执行落地/学习能力/信息处理/压力适应」6 项里选，**不要输出 score 字段**), fitReason (60-80字), specialNote (40-70字具体可执行建议) }
- secondary: 同结构，coreCompetencies 与 primary 至少 1-2 个不同维度
- position 要具体（如「薪酬绩效专员」而不是「人力资源」）
- targetPosition 是用户自述方向，不是默认首选：
  a) 与能力契合 → 首选可以是它或升阶版
  b) 方向对但够不着 → 首选推更匹配的，次选放目标
  c) 明显不匹配 → 首选推真正匹配的，fitReason 诚恳说明
硬约束：
- ${COMPANY_NO_NAME_NOTE}
- ${FORBIDDEN_FRAUD_NOTE}
- general_unemployed 必须从 APPLICANT_BASELINE 白名单选岗
- 与 overview.personality.type、strength.strengths 的主要优势保持逻辑一致
${resumeBlock}
【模块 ⑤ advice（行动建议）】
topThree — 用户下一步最重要的三件事，按优先级从高到低。每件事：
- title：4-10 字动作标题（如"重写简历核心经历"）
- detail：50-100 字，必须包含「做什么 + 怎么做 + 做到什么程度」，不泛泛而谈
- deadline：建议完成时间锚点（如"本周内"、"两周内"），不写"尽快"
硬约束：
- 严格 3 条
- detail 必须含具体动作+可验证产出，禁用空话（"多投简历"、"提升能力"等）
- 严格遵守 APPLICANT_BASELINE 禁用词清单
- 不指名具体公司/培训机构
- **行动方向必须与 positioning 推荐岗位一致**，不能与之矛盾

【最终输出 JSON schema】
{
  "overview": {
    "personality": { "type": "string", "traits": ["string"], "description": "string" },
    "fourDimRadar": [{ "name": "string", "score": 0, "conclusion": "string" }],
    "summary": "string"
  },
  "strength": {
    "abilityRadar": [{ "name": "string", "score": 0 }],
    "strengths": [{ "title": "string", "detail": "string" }],
    "growth": [{ "title": "string", "detail": "string" }]
  },
  "positioning": {
    "primary": { "position": "string", "matchScore": 0, "culture": "string", "teamRole": "string", "coreResponsibilities": ["string"], "coreCompetencies": [{ "name": "string" }], "fitReason": "string", "specialNote": "string" },
    "secondary": { ... }
  },
  "resumeDiagnosis": ${hasResume ? `{ "overallScore": 0, "issues": [...], "suggestions": [...] }` : "null"},
  "advice": { "topThree": [{ "title": "string", "detail": "string", "deadline": "string" }] }
}`;
}

function buildMegaUserPrompt(
  formData: JobFormData,
  scoring: ScoringResult,
  q1q2: InterviewQ1Q2
): string {
  const ivParts: string[] = [];
  if (q1q2.Q1?.trim()) ivParts.push(`Q1 回答：${q1q2.Q1.trim()}`);
  if (q1q2.Q2?.trim()) ivParts.push(`Q2 回答：${q1q2.Q2.trim()}`);

  const baseCtx = buildBaseContext(formData, undefined, ivParts.join("\n") || undefined);
  const fourDimLines = scoring.fourDim
    .map((d) => `- ${d.name}（${d.dimension}）：${d.score} 分`)
    .join("\n");
  const abilityLines = scoring.ability
    .map((a) => `- ${a.name}：${a.score} 分`)
    .join("\n");

  return [
    `请严格按 schema 一次性输出包含 5 个模块的完整 JSON。`,
    "",
    baseCtx,
    "",
    "【性格四维评分（overview.fourDimRadar 和 strength 描述都要用这组数据）】",
    fourDimLines,
    "",
    "【能力六维评分（strength.abilityRadar 必须照搬，positioning.coreCompetencies 选 5 项）】",
    abilityLines,
    "",
    "提醒：所有 score 字段必须严格照抄上述数值，不要重新计算；后端会再次覆写，但你输出错会触发校验失败被重试。",
  ].join("\n");
}

// ============================================================
// 整体 validator
// ============================================================

interface AllSections {
  overview: Overview;
  strength: Strength;
  positioning: Positioning;
  resumeDiagnosis: ResumeDiagnosis | null;
  advice: Advice;
}

function validateOverview(d: Overview): string | null {
  if (!d?.personality) return "overview.personality 缺失";
  if (isBad(d.personality.type, 2)) return "overview.personality.type 占位符";
  if (!Array.isArray(d.personality.traits) || d.personality.traits.length < 3)
    return "overview.traits 不足 3 项";
  if (isBad(d.personality.description, 30)) return "overview.description 过短";
  if (!Array.isArray(d.fourDimRadar) || d.fourDimRadar.length !== 4)
    return "overview.fourDimRadar 必须 4 项";
  if (isBad(d.summary, 50)) return "overview.summary 过短";
  return null;
}

function validateStrength(d: Strength): string | null {
  if (!Array.isArray(d?.abilityRadar) || d.abilityRadar.length !== 6)
    return "strength.abilityRadar 必须 6 项";
  if (!Array.isArray(d.strengths) || d.strengths.length < 3) return "strength.strengths 至少 3 条";
  for (const s of d.strengths)
    if (!s || isBad(s.title) || isBad(s.detail, 20)) return "strength.strengths 条目缺失";
  if (!Array.isArray(d.growth) || d.growth.length < 2) return "strength.growth 至少 2 条";
  for (const g of d.growth)
    if (!g || isBad(g.title) || isBad(g.detail, 20)) return "strength.growth 条目缺失";
  return null;
}

function validatePositionRec(
  rec: PositionRecommendation | undefined,
  label: string
): string | null {
  if (!rec || typeof rec !== "object") return `${label} 缺失`;
  if (isBad(rec.position, 2)) return `${label}.position 缺失`;
  if (typeof rec.matchScore !== "number" || !Number.isFinite(rec.matchScore))
    return `${label}.matchScore 非数字`;
  if (isBad(rec.culture, 4)) return `${label}.culture 缺失`;
  if (isBad(rec.teamRole, 2)) return `${label}.teamRole 缺失`;
  return null;
}

function validatePositioning(d: Positioning): string | null {
  const p = validatePositionRec(d?.primary, "positioning.primary");
  if (p) return p;
  const s = validatePositionRec(d?.secondary, "positioning.secondary");
  if (s) return s;
  return null;
}

function validateResumeDiagnosis(data: ResumeDiagnosis): string | null {
  if (!data || typeof data !== "object") return "resumeDiagnosis 不是对象";
  if (typeof data.overallScore !== "number") return "resumeDiagnosis.overallScore 不是数字";
  data.overallScore = Math.round(numClamp(data.overallScore, 0, 100));
  if (!Array.isArray(data.issues) || data.issues.length === 0) return "resumeDiagnosis.issues 为空";
  if (data.issues.length > 4) data.issues = data.issues.slice(0, 4);
  for (const it of data.issues) {
    if (!it || typeof it.title !== "string" || !it.title.trim()) return "resumeDiagnosis.issue.title 缺失";
    if (typeof it.detail !== "string" || !it.detail.trim()) return "resumeDiagnosis.issue.detail 缺失";
    if (!isPriority(it.priority)) return `resumeDiagnosis.issue.priority 非法: ${String(it.priority)}`;
  }
  if (!Array.isArray(data.suggestions) || data.suggestions.length < 2)
    return "resumeDiagnosis.suggestions 不足 2 条";
  if (data.suggestions.length > 4) data.suggestions = data.suggestions.slice(0, 4);
  for (const s of data.suggestions) {
    if (typeof s.title !== "string" || !s.title.trim()) return "resumeDiagnosis.suggestion.title 缺失";
    if (typeof s.detail !== "string" || !s.detail.trim()) return "resumeDiagnosis.suggestion.detail 缺失";
  }
  return null;
}

function validateAdvice(d: Advice): string | null {
  if (!Array.isArray(d?.topThree) || d.topThree.length < 3) return "advice.topThree 必须 3 条";
  for (const item of d.topThree) {
    if (!item || typeof item !== "object") return "advice.topThree 元素非对象";
    if (isBad(item.title, 4) || VAGUE_WHOLE_STRINGS.some((re) => re.test(String(item.title))))
      return "advice.topThree.title 缺失/过泛";
    if (isBad(item.detail, 20)) return "advice.topThree.detail 缺失/过短";
    if (isBad(item.deadline, 2)) return "advice.topThree.deadline 缺失";
  }
  return null;
}

function buildAllValidator(hasResume: boolean) {
  return (d: AllSections): string | null => {
    const oErr = validateOverview(d.overview);
    if (oErr) return oErr;
    const sErr = validateStrength(d.strength);
    if (sErr) return sErr;
    const pErr = validatePositioning(d.positioning);
    if (pErr) return pErr;
    if (hasResume) {
      if (d.resumeDiagnosis === null) return "hasResume=true 但 resumeDiagnosis 为 null";
      const rErr = validateResumeDiagnosis(d.resumeDiagnosis);
      if (rErr) return rErr;
    }
    // 无简历时 resumeDiagnosis 容忍 null 或缺失字段；不强校验
    const aErr = validateAdvice(d.advice);
    if (aErr) return aErr;
    return null;
  };
}

// ============================================================
// 后处理（normalize / patch / 强制覆写 score）
// ============================================================

function normalizeOverview(d: Overview, scoring: ScoringResult): Overview {
  // 强制覆写 fourDimRadar.score；保留 LLM 生成的 conclusion
  d.fourDimRadar = scoring.fourDim.map((dim, i) => ({
    name: dim.name,
    score: dim.score,
    ...(d.fourDimRadar[i]?.conclusion ? { conclusion: d.fourDimRadar[i].conclusion } : {}),
  }));
  // 剥掉 LLM 可能残留的字母代码前缀（MBTI 红线兜底）
  if (d.personality?.type) {
    d.personality.type = d.personality.type
      .replace(/^[A-Za-z]{2,6}\s*[·\-:、|/]\s*/, "")
      .replace(/[（(][A-Za-z\s/]{2,12}[）)]/g, "")
      .trim();
  }
  return d;
}

function normalizeStrength(d: Strength, scoring: ScoringResult): Strength {
  d.abilityRadar = scoring.ability.map((a) => ({ name: a.name, score: a.score }));
  return d;
}

function normalizePositioning(d: Positioning, scoring: ScoringResult): Positioning {
  const abilityScores = scoring.ability.map((a) => a.score);
  const userMax = Math.max(...abilityScores);
  const userMin = Math.min(...abilityScores);
  const range = Math.max(userMax - userMin, 1);
  const toMatch = (raw: number) => Math.round(68 + ((raw - userMin) / range) * 28);
  const matchMap = new Map(scoring.ability.map((a) => [a.name, toMatch(a.score)]));
  const rawMap = new Map(scoring.ability.map((a) => [a.name, a.score]));

  const normalizeRec = (rec: PositionRecommendation): PositionRecommendation => {
    const rawComps = Array.isArray(rec.coreCompetencies) ? rec.coreCompetencies : [];
    const pickedNames = rawComps
      .filter((c) => c && typeof c.name === "string")
      .map((c) => String(c.name).trim())
      .filter((n) => matchMap.has(n));
    const unique = [...new Set(pickedNames)];
    const comps: { name: string; score: number }[] = unique.map((n) => ({
      name: n,
      score: matchMap.get(n)!,
    }));
    if (comps.length < 5) {
      const picked = new Set(comps.map((c) => c.name));
      const remaining = [...scoring.ability]
        .filter((a) => !picked.has(a.name))
        .sort((x, y) => rawMap.get(y.name)! - rawMap.get(x.name)!);
      for (const a of remaining) {
        if (comps.length >= 5) break;
        comps.push({ name: a.name, score: matchMap.get(a.name)! });
      }
    }
    return {
      ...rec,
      matchScore: clampScore(rec.matchScore),
      industries: (rec.industries ?? []).map((s) => String(s).trim()).filter(Boolean),
      coreResponsibilities: Array.isArray(rec.coreResponsibilities)
        ? rec.coreResponsibilities.map((r) => String(r).trim()).filter(Boolean)
        : undefined,
      coreCompetencies: comps.slice(0, 5),
      fitReason:
        typeof rec.fitReason === "string" && rec.fitReason.trim()
          ? rec.fitReason.trim()
          : undefined,
      specialNote:
        typeof rec.specialNote === "string" && rec.specialNote.trim()
          ? rec.specialNote.trim()
          : undefined,
    };
  };
  return { primary: normalizeRec(d.primary), secondary: normalizeRec(d.secondary) };
}

function patchAdvice(d: Advice): Advice {
  const valid = Array.isArray(d.topThree)
    ? d.topThree.filter(
        (item) =>
          item &&
          !isBad(item.title, 4) &&
          !VAGUE_WHOLE_STRINGS.some((re) => re.test(String(item.title))) &&
          !isBad(item.detail, 20) &&
          !isBad(item.deadline, 2),
      )
    : [];
  let i = 0;
  while (valid.length < 3 && i < MOCK_ADVICE.topThree.length) {
    const cand = MOCK_ADVICE.topThree[i++];
    if (!valid.some((x) => x.title === cand.title)) valid.push(cand);
  }
  return { topThree: valid.slice(0, 3) };
}

// 全失败时的 mock 兜底（替代旧的"局部 mock"）
function buildAllMock(scoring: ScoringResult, hasResume: boolean): AllSections {
  return {
    overview: {
      ...MOCK_OVERVIEW,
      fourDimRadar: scoring.fourDim.map((d, i) => ({
        name: d.name,
        score: d.score,
        ...(MOCK_OVERVIEW.fourDimRadar[i]?.conclusion
          ? { conclusion: MOCK_OVERVIEW.fourDimRadar[i].conclusion }
          : {}),
      })),
    },
    strength: {
      ...MOCK_STRENGTH,
      abilityRadar: scoring.ability.map((a) => ({ name: a.name, score: a.score })),
    },
    positioning: MOCK_POSITIONING,
    resumeDiagnosis: hasResume ? MOCK_RESUME_DIAGNOSIS : null,
    advice: MOCK_ADVICE,
  };
}

// ============================================================
// Route Handler
// ============================================================

export async function POST(req: NextRequest) {
  if (process.env.E2E_MOCK_MODE === "true") {
    return NextResponse.json({
      data: {
        overview: MOCK_OVERVIEW,
        strength: MOCK_STRENGTH,
        positioning: MOCK_POSITIONING,
        resumeDiagnosis: MOCK_RESUME_DIAGNOSIS,
        advice: MOCK_ADVICE,
      } satisfies AllSections,
      source: "mock",
    });
  }

  let formData: JobFormData;
  let scoring: ScoringResult;
  let interviewQ1Q2: InterviewQ1Q2;

  try {
    const body = await req.json();
    formData = body.formData as JobFormData;
    scoring = body.scoring as ScoringResult;
    interviewQ1Q2 = (body.interviewQ1Q2 as InterviewQ1Q2) ?? {};

    if (!formData?.identity) {
      return NextResponse.json({
        data: null,
        source: "mock",
        errorMessage: "缺少 formData.identity",
      });
    }
    if (!scoring?.fourDim || !Array.isArray(scoring.fourDim) || scoring.fourDim.length !== 4) {
      return NextResponse.json({
        data: null,
        source: "mock",
        errorMessage: "scoring.fourDim 缺失或非 4 项",
      });
    }
    if (!scoring?.ability || !Array.isArray(scoring.ability) || scoring.ability.length !== 6) {
      return NextResponse.json({
        data: null,
        source: "mock",
        errorMessage: "scoring.ability 缺失或非 6 项",
      });
    }
  } catch {
    return NextResponse.json({
      data: null,
      source: "mock",
      errorMessage: "请求体解析失败",
    });
  }

  const hasResume = (formData.resumeText ?? "").trim().length >= 50;

  // ---- 单次大调用：一次 LLM 吐 5 章节 ----
  let raw: AllSections;
  try {
    raw = await callWithFallback<AllSections>({
      systemPrompt: buildMegaSystemPrompt(hasResume),
      userPrompt: buildMegaUserPrompt(formData, scoring, interviewQ1Q2),
      maxTokens: 8000,
      temperature: 0.6,
      timeoutMs: COMBINED_TIMEOUT_MS,
      validator: buildAllValidator(hasResume),
      context: "report-all",
    });
  } catch (e) {
    console.error("[generate] 单次大调用失败，全 mock 兜底:", e);
    return NextResponse.json({
      data: buildAllMock(scoring, hasResume),
      source: "mock",
      errorMessage: e instanceof Error ? e.message : String(e),
    });
  }

  // ---- 后处理：强制覆写 score / normalize / patch ----
  const overview = normalizeOverview(raw.overview, scoring);
  const strength = normalizeStrength(raw.strength, scoring);
  const positioning = normalizePositioning(raw.positioning, scoring);
  const resumeDiagnosis: ResumeDiagnosis | null = hasResume
    ? (raw.resumeDiagnosis ?? MOCK_RESUME_DIAGNOSIS)
    : null;
  const advice = patchAdvice(raw.advice);

  return NextResponse.json({
    data: {
      overview,
      strength,
      positioning,
      resumeDiagnosis,
      advice,
    } satisfies AllSections,
    source: "deepseek",
  });
}
