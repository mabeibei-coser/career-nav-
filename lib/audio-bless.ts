let blessedAudio: HTMLAudioElement | null = null;

// Call in a user gesture handler (e.g. form submit) to "bless" an Audio instance.
// iOS Safari allows subsequent play() calls on this same element without gesture.
export function blessAudio() {
  if (typeof window === "undefined") return;
  const a = new Audio(
    "data:audio/mp3;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCA",
  );
  a.volume = 1.0;
  a.play().catch(() => {});
  blessedAudio = a;
}

// Reuse the blessed Audio instance to play TTS base64. Returns true if blessed
// instance was available; false means caller should fall back to new Audio().
export function playWithBlessedAudio(
  base64: string,
  onEnded?: () => void,
): boolean {
  if (!blessedAudio) return false;
  const a = blessedAudio;
  a.pause();
  a.currentTime = 0;
  a.onended = () => onEnded?.();
  a.onerror = () => onEnded?.();
  a.src = "data:audio/mp3;base64," + base64;
  a.volume = 1.0;
  a.play().catch(() => onEnded?.());
  return true;
}

export function stopBlessedAudio() {
  if (!blessedAudio) return;
  blessedAudio.pause();
  blessedAudio.currentTime = 0;
  blessedAudio.onended = null;
  blessedAudio.onerror = null;
}
