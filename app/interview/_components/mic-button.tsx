"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic } from "lucide-react";

interface MicButtonProps {
  onRecordStart: () => void;
  onRecordStop: () => void;
  onRecordCancel: () => void;
  isRecording: boolean;
  durationSec: number;
  disabled?: boolean;
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

const SWIPE_CANCEL_THRESHOLD = 80; // px upward to trigger cancel

export function MicButton({
  onRecordStart,
  onRecordStop,
  onRecordCancel,
  isRecording,
  durationSec,
  disabled = false,
}: MicButtonProps) {
  const touchStartYRef = useRef<number | null>(null);
  const [swipingToCancel, setSwipingToCancel] = useState(false);

  // ── Desktop handlers ──────────────────────────────────────────────────────
  function handleMouseDown(e: React.MouseEvent) {
    if (disabled) return;
    e.preventDefault();
    onRecordStart();
  }

  function handleMouseUp(e: React.MouseEvent) {
    if (disabled) return;
    e.preventDefault();
    if (isRecording) onRecordStop();
  }

  // Guard: if user drags mouse off the button while holding
  function handleMouseLeave(e: React.MouseEvent) {
    if (disabled) return;
    // Only stop if the primary button is still held
    if (e.buttons === 1 && isRecording) {
      onRecordStop();
    }
  }

  // ── Mobile handlers ───────────────────────────────────────────────────────
  function handleTouchStart(e: React.TouchEvent) {
    if (disabled) return;
    const touch = e.touches[0];
    touchStartYRef.current = touch.clientY;
    setSwipingToCancel(false);
    onRecordStart();
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!isRecording || touchStartYRef.current === null) return;
    const touch = e.touches[0];
    const deltaY = touchStartYRef.current - touch.clientY; // positive = upward
    setSwipingToCancel(deltaY >= SWIPE_CANCEL_THRESHOLD);
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (disabled) return;
    if (!isRecording) return;

    const touch = e.changedTouches[0];
    const startY = touchStartYRef.current ?? touch.clientY;
    const deltaY = startY - touch.clientY; // positive = upward

    touchStartYRef.current = null;
    setSwipingToCancel(false);

    if (deltaY >= SWIPE_CANCEL_THRESHOLD) {
      onRecordCancel();
    } else {
      onRecordStop();
    }
  }

  function handleTouchCancel() {
    if (disabled) return;
    touchStartYRef.current = null;
    setSwipingToCancel(false);
    if (isRecording) onRecordCancel();
  }

  // ── Derived visual state ──────────────────────────────────────────────────
  const isCancelMode = isRecording && swipingToCancel;

  const buttonBg = isCancelMode
    ? "bg-red-500"
    : isRecording
      ? "bg-violet-600"
      : "bg-blue-500";

  const label = isCancelMode
    ? "松开取消"
    : isRecording
      ? formatDuration(durationSec)
      : "按住说话";

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      {/* Button wrapper — position:relative so ripples are clipped */}
      <div className="relative flex items-center justify-center">
        {/* Ripple rings — only visible while recording */}
        <AnimatePresence>
          {isRecording && !isCancelMode &&
            [0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="absolute rounded-full border-2 border-violet-400 pointer-events-none"
                style={{ width: 80, height: 80 }}
                initial={{ opacity: 0.6, scale: 1 }}
                animate={{ opacity: 0, scale: 2.6 }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 1.8,
                  delay: i * 0.5,
                  repeat: Infinity,
                  ease: "easeOut",
                }}
              />
            ))}
        </AnimatePresence>

        {/* Main button */}
        <motion.button
          type="button"
          disabled={disabled}
          aria-label={isRecording ? "录音中" : "按住录音"}
          aria-pressed={isRecording}
          className={[
            "relative z-10 flex items-center justify-center rounded-full",
            "w-20 h-20",
            buttonBg,
            "text-white",
            "cursor-pointer",
            "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-300",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            "transition-colors duration-150",
          ].join(" ")}
          style={{
            touchAction: "none",
            userSelect: "none",
            WebkitTouchCallout: "none",
          } as React.CSSProperties}
          // Desktop
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          // Mobile
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
          // Framer Motion press feedback
          whileTap={disabled ? {} : { scale: 0.93 }}
          animate={{
            scale: isRecording ? [1, 1.04, 1] : 1,
          }}
          transition={
            isRecording
              ? { scale: { duration: 0.8, repeat: Infinity, ease: "easeInOut" } }
              : { scale: { duration: 0.15 } }
          }
        >
          <Mic className="w-8 h-8" strokeWidth={2} />
        </motion.button>
      </div>

      {/* Label / timer below button */}
      <motion.span
        key={label}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
        className={[
          "text-sm font-medium tracking-wide tabular-nums",
          isCancelMode
            ? "text-red-500"
            : isRecording
              ? "text-violet-600"
              : "text-slate-500",
        ].join(" ")}
      >
        {label}
      </motion.span>
    </div>
  );
}
