/**
 * 文本字段归一化
 * ————————————
 * AI 返回的"应该是字符串的字段"偶尔会被包装成 `{summary: "..."}` /
 * `{value: "..."}` / `{text: "..."}` 三种常见 shape（模型惯性复制同章节其它
 * 字段的嵌套结构）。直接在 JSX 里渲染这种对象会抛 React error #31。
 *
 * asText 提供一个**兜底解包** + **空值兜底**的纯函数：
 * - string → 原样返回
 * - {summary|value|text: string} → 取其中的字符串
 * - 其它（null / undefined / 数组 / 其它 object）→ 空串
 *
 * 用于两个防御层：
 * 1. Server：API route 返回前对已知字段调 normalizeStringLikeFields，治本
 * 2. Client：组件渲染时兜一次，防止治本漏了
 */

/** AI 可能返回的"字符串型"值的宽松形状。 */
export type TextLike =
  | string
  | null
  | undefined
  | { summary?: unknown; value?: unknown; text?: unknown };

/**
 * 把宽松 shape 规整为字符串。未命中规则返回空串。
 */
export function asText(v: unknown): string {
  if (typeof v === "string") return v;
  if (v == null) return "";
  if (typeof v === "object") {
    const obj = v as Record<string, unknown>;
    if (typeof obj.summary === "string") return obj.summary;
    if (typeof obj.value === "string") return obj.value;
    if (typeof obj.text === "string") return obj.text;
  }
  return "";
}

/**
 * 就地把 obj 里指定字段全部 asText 化。
 * 支持嵌套 key（"companyInsight.summary"），只下钻 1 层够用。
 * 返回同一个 obj 引用，方便链式调用。
 */
export function normalizeStringLikeFields<T extends Record<string, unknown>>(
  obj: T | null | undefined,
  keys: readonly string[]
): T | null | undefined {
  if (!obj || typeof obj !== "object") return obj;
  for (const key of keys) {
    const parts = key.split(".");
    if (parts.length === 1) {
      (obj as Record<string, unknown>)[parts[0]] = asText(obj[parts[0]]);
    } else if (parts.length === 2) {
      const parent = (obj as Record<string, unknown>)[parts[0]];
      if (parent && typeof parent === "object") {
        const p = parent as Record<string, unknown>;
        p[parts[1]] = asText(p[parts[1]]);
      }
    }
    // 3+ 层暂不实现（当前 schema 最多 2 层）
  }
  return obj;
}
