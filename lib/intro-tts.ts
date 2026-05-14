/**
 * intro 页 TTS 音频预取 + 平台检测
 * ———————————————
 * preparing 页 mount 时 prefetchIntroTTS()，利用 ~10s 过场动画提前拉好欢迎语音频。
 * intro 页 consumeIntroTTS() 命中缓存即用，miss 则自己 fetch。
 *
 * 平台分流（iOS autoplay policy 限制）：
 *   - Android：保留自动播放（user activation 跨页面持久 + AudioContext 解锁后稳定）
 *   - iOS：改为点击播放（iOS 18 解锁后 ~5s 重新上锁，跨 12s 过场必失败）
 */

export const INTRO_TEXT =
  "你好，我是你的 AI 职业助理。接下来我们一起完成两个环节：第一，职业导航自测；第二，AI 语音访谈。你准备好了吗？准备好了，我们就开始测评。";

let cachedAudio: string | null = null;
let fetchPromise: Promise<string | null> | null = null;

/** preparing 页调用：提前拉 TTS，存模块级缓存。幂等，重复调用无副作用。 */
export function prefetchIntroTTS(): void {
  if (typeof window === "undefined") return;
  if (cachedAudio || fetchPromise) return; // 已取过或正在取
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  fetchPromise = fetch(`${base}/api/interview/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: INTRO_TEXT }),
  })
    .then((r) => r.json() as Promise<{ audioBase64?: string }>)
    .then((d) => {
      cachedAudio = d?.audioBase64 ?? null;
      return cachedAudio;
    })
    .catch(() => null);
}

/**
 * intro 页调用：
 * - 命中缓存 → 直接返回
 * - 正在预取 → 等它完成
 * - 没预取过 → 返回 null（intro 页自己 fetch 兜底）
 */
export function consumeIntroTTS(): Promise<string | null> {
  if (cachedAudio) return Promise.resolve(cachedAudio);
  if (fetchPromise) return fetchPromise;
  return Promise.resolve(null);
}

/** iOS 设备检测（含 iPadOS 13+ 伪装成 Mac 的情况） */
export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return (
    /iP(hone|ad|od)/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}
