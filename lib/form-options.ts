import type { UserIdentity } from "./types";

export const USER_IDENTITY_OPTIONS: { value: UserIdentity; label: string; description: string }[] = [
  { value: "graduate", label: "应届毕业生", description: "在校大学生或毕业 2 年内" },
  { value: "jobseeker", label: "求职/失业中", description: "已离开学校，正在找工作或失业中" },
];

export const EDUCATION_OPTIONS = [
  { value: "high_school", label: "高中及以下" },
  { value: "junior_college", label: "大专" },
  { value: "bachelor", label: "本科" },
  { value: "master", label: "硕士" },
  { value: "phd", label: "博士" },
  { value: "other", label: "其他" },
];

export const WORK_YEARS_OPTIONS = [
  { value: "none", label: "无工作经验" },
  { value: "lt1", label: "1 年以内" },
  { value: "1to3", label: "1-3 年" },
  { value: "3to5", label: "3-5 年" },
  { value: "5to10", label: "5-10 年" },
  { value: "gt10", label: "10 年以上" },
];
