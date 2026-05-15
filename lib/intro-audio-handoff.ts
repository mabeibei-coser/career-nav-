/**
 * intro 欢迎语音频：preparing 页 → intro 页的跨页面交接
 * ———————————————
 * iOS autoplay policy 要求播放必须在用户手势的同步栈里。
 * 把"必须的那次点击"放在 preparing 页的「开始」按钮上：
 *   1. 按钮 onClick 同步 new Audio().play()（手势栈内，iOS 认可）
 *   2. 把已在播放的 audio 元素通过本模块单例交接出去
 *   3. router.push('/intro')
 *   4. intro 页 mount 时 takeHandoffAudio() 取走并接管（绑 onended 等）
 *
 * SPA client-side 导航不会中断已在播放的 <audio> 元素，所以 intro 页
 * 接管时欢迎语仍在播 —— 用户体感等同"自动播放"。
 *
 * fallback：直接访问 /intro（刷新/分享链接）时单例为空，intro 页自行处理
 * （Android 自动播放，iOS 显示点击引导）。
 */

// intro 欢迎语静态音频（构建时由 scripts/generate-tts-cache.mjs 预生成）
export const INTRO_AUDIO_SRC = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/audio/intro-welcome.mp3`;
// 访谈页问候语静态音频（同上脚本预生成；与 app/interview/page.tsx 的 GREETING_TEXT 同步）
export const INTERVIEW_GREETING_AUDIO_SRC = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/audio/greeting.mp3`;

let handoffAudio: HTMLAudioElement | null = null;

/** preparing 页：把手势栈内已 play() 的 audio 元素交接出去 */
export function setHandoffAudio(audio: HTMLAudioElement): void {
  handoffAudio = audio;
}

/** intro 页：取走交接的 audio 元素（取出即清，避免重复接管） */
export function takeHandoffAudio(): HTMLAudioElement | null {
  const a = handoffAudio;
  handoffAudio = null;
  return a;
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
