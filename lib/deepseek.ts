// DeepSeek 兼容 OpenAI SDK。注意 json_object 模式要求 prompt 内含 "json" 字符串（小写也可），否则 API 返回 400。
// model 锁死 deepseek-v4-flash（不读 env），DEEPSEEK_BASE_URL 可被 env 覆盖（默认 https://api.deepseek.com/v1）。
import OpenAI from "openai";

let cachedClient: OpenAI | null = null;

export function getDeepseekClient(): OpenAI {
  if (cachedClient) return cachedClient;
  cachedClient = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY ?? "missing",
    baseURL: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com/v1",
  });
  return cachedClient;
}

export const DEEPSEEK_MODEL = "deepseek-v4-flash";

// Back-compat default export using a Proxy so existing `client.chat.completions...` paths still work.
const clientProxy = new Proxy(
  {},
  {
    get(_target, prop) {
      // @ts-expect-error dynamic delegation
      return getDeepseekClient()[prop];
    },
  }
) as OpenAI;

export default clientProxy;
