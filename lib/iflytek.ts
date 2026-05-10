import OpenAI from "openai";

export const IFLYTEK_MODEL = process.env.IFLYTEK_MODEL ?? "astron-code-latest";

const apiKey = process.env.IFLYTEK_API_KEY;
const baseURL =
  process.env.IFLYTEK_BASE_URL ??
  "https://maas-coding-api.cn-huabei-1.xf-yun.com/v2";

// 未配 IFLYTEK_API_KEY 时为 null；调用方必须先检查 hasIflytek
const iflytek = apiKey ? new OpenAI({ apiKey, baseURL }) : null;

export default iflytek;
export const hasIflytek = !!iflytek;
