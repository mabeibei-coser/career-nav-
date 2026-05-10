'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface UseAudioPlayerReturn {
  play: (audioBase64: string) => void;
  stop: () => void;
  isPlaying: boolean;
}

export function useAudioPlayer(onEnded?: () => void): UseAudioPlayerReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const onEndedRef = useRef(onEnded);

  // keep ref in sync without re-creating play/stop
  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.onended = null;
      audio.onerror = null;
    }
    audioRef.current = null;
    setIsPlaying(false);
  }, []);

  const play = useCallback(
    (audioSrc: string) => {
      // stop any existing playback first
      stop();

      // Accept either: full URL ("/audio/foo.mp3" / "http..."), or raw base64 (legacy)
      const src =
        audioSrc.startsWith("/") || /^https?:/i.test(audioSrc)
          ? audioSrc
          : "data:audio/mp3;base64," + audioSrc;
      const audio = new Audio(src);

      audio.onended = () => {
        setIsPlaying(false);
        audioRef.current = null;
        onEndedRef.current?.();
      };

      audio.onerror = () => {
        setIsPlaying(false);
        audioRef.current = null;
        onEndedRef.current?.();
      };

      audioRef.current = audio;
      setIsPlaying(true);
      audio.play().catch(() => {
        setIsPlaying(false);
        audioRef.current = null;
        onEndedRef.current?.();
      });
    },
    [stop],
  );

  // cleanup on unmount
  useEffect(() => {
    return () => {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.onended = null;
        audio.onerror = null;
        audioRef.current = null;
      }
    };
  }, []);

  return { play, stop, isPlaying };
}
