'use client';

import { useEffect, useRef, useState } from 'react';

const FFT_SIZE = 256;

interface UseAudioVisualizerReturn {
  amplitude: number;
}

export function useAudioVisualizer(mediaStream: MediaStream | null): UseAudioVisualizerReturn {
  const [amplitude, setAmplitude] = useState(0);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const dataArrayRef = useRef<Float32Array<ArrayBuffer>>(new Float32Array(FFT_SIZE) as Float32Array<ArrayBuffer>);

  useEffect(() => {
    if (!mediaStream) {
      // tear down
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }
      if (analyserRef.current) {
        analyserRef.current.disconnect();
        analyserRef.current = null;
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAmplitude(0);
      return;
    }

    // set up
    const audioCtx = new AudioContext();
    audioCtxRef.current = audioCtx;

    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    analyserRef.current = analyser;

    const source = audioCtx.createMediaStreamSource(mediaStream);
    sourceRef.current = source;
    source.connect(analyser);

    dataArrayRef.current = new Float32Array(analyser.fftSize) as Float32Array<ArrayBuffer>;

    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);
      const data = dataArrayRef.current;
      analyser.getFloatTimeDomainData(data);
      // compute RMS
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        sum += data[i] * data[i];
      }
      const rms = Math.sqrt(sum / data.length);
      // clamp to 0-1
      setAmplitude(Math.min(1, rms));
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      source.disconnect();
      analyser.disconnect();
      audioCtx.close().catch(() => {});
      audioCtxRef.current = null;
      analyserRef.current = null;
      sourceRef.current = null;
    };
  }, [mediaStream]);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      sourceRef.current?.disconnect();
      analyserRef.current?.disconnect();
      audioCtxRef.current?.close().catch(() => {});
    };
  }, []);

  return { amplitude };
}
