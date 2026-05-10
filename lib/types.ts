// ========== 表单输入类型 ==========

export type UserIdentity = "graduate" | "jobseeker";

export interface JobFormData {
  identity: UserIdentity;
  targetPosition: string;
  education: string;
  workYears: string;
  resumeText?: string;
  resumeFileName?: string;
}

// ========== 量表测评类型 ==========

export type QuizDimension = "personality" | "workstyle" | "value" | "direction";

export const QUIZ_DIMENSION_NAMES: Record<QuizDimension, string> = {
  personality: "性格底色",
  workstyle: "工作风格",
  value: "价值驱动",
  direction: "适配方向",
};

export type AbilityKey =
  | "communication"
  | "collaboration"
  | "execution"
  | "learning"
  | "data"
  | "stress";

export const ABILITY_NAMES: Record<AbilityKey, string> = {
  communication: "沟通表达",
  collaboration: "协作意识",
  execution: "执行落地",
  learning: "学习能力",
  data: "信息处理",
  stress: "压力适应",
};

export interface QuizQuestion {
  id: string;
  dimension: QuizDimension;
  text: string;
  reverse: boolean;
  weights: Partial<Record<AbilityKey, number>>;
}

export interface QuizBankDimension {
  key: QuizDimension;
  name: string;
  questions: QuizQuestion[];
}

export interface QuizBank {
  version: string;
  dimensions: QuizBankDimension[];
}

export interface QuizAnswer {
  questionId: string;
  dimension: QuizDimension;
  raw: 1 | 2 | 3 | 4 | 5;
}

export interface DimensionScore {
  dimension: QuizDimension;
  name: string;
  score: number;
}

export interface AbilityScore {
  key: AbilityKey;
  name: string;
  score: number;
}

export interface ScoringResult {
  fourDim: DimensionScore[];
  ability: AbilityScore[];
}

// ========== 访谈类型 ==========

export type InterviewQuestionId = "Q1" | "Q2" | "Q3" | "Q4";

export interface InterviewQuestion {
  id: InterviewQuestionId;
  text: string;
  source: "dynamic" | "fixed";
}

export interface InterviewAnswer {
  questionId: InterviewQuestionId;
  text: string;
  inputMethod: "voice" | "text";
  audioDurationSec?: number;
}

export interface InterviewQ1Q2 {
  Q1?: string;
  Q2?: string;
}

// ========== 报告类型 ==========

export type ReportSectionKey =
  | "overview"
  | "strength"
  | "positioning"
  | "resumeDiagnosis"
  | "advice";

export interface ReportMeta {
  generatedAt: string;
  formData: JobFormData;
  scoring: ScoringResult;
  hasResume: boolean;
  interviewQ1Q2: InterviewQ1Q2;
}

// ① 总评：性格综述 + 四维雷达
export interface Overview {
  personality: {
    type: string;
    traits: string[];
    description: string;
  };
  fourDimRadar: {
    name: string;
    score: number;
  }[];
  summary: string;
}

// ② 优势发现：能力雷达 + 优势分析
export interface Strength {
  abilityRadar: {
    name: string;
    score: number;
  }[];
  strengths: {
    title: string;
    detail: string;
  }[];
  growth: {
    title: string;
    detail: string;
  }[];
}

// ③ 职业定位：首选 + 次选岗位
export interface PositionRecommendation {
  position: string;
  matchScore: number;
  reasoning: string;
  industries: string[];
  culture: string;
  teamRole: string;
}

export interface Positioning {
  primary: PositionRecommendation;
  secondary: PositionRecommendation;
}

// ④ 简历快诊：问题 + 建议
export interface ResumeDiagnosis {
  overallScore: number;
  issues: {
    title: string;
    detail: string;
    priority: "high" | "medium" | "low";
    quotedSnippet?: string;
  }[];
  suggestions: {
    title: string;
    detail: string;
  }[];
}

// ⑤ 行动建议：投递 + 技能 + 面试要点
export interface Advice {
  applyDirection: {
    channel: string;
    tip: string;
  }[];
  skillUp: {
    skill: string;
    resource: string;
    duration: string;
  }[];
  interviewTips: string[];
}

export interface ReportData {
  meta: ReportMeta;
  overview: Overview;
  strength: Strength;
  positioning: Positioning;
  resumeDiagnosis: ResumeDiagnosis | null;
  advice: Advice;
}

// ========== Section 调度类型（前端并发使用） ==========

export interface SectionProgress {
  key: ReportSectionKey;
  status: "pending" | "running" | "done" | "error" | "fallback";
  attempt: number;
  errorMessage?: string;
}
