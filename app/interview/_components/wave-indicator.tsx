"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface WaveIndicatorProps {
  className?: string;
  /** 0–1 amplitude — when provided, drives bar heights instead of looping */
  amplitude?: number;
  bars?: number;
  color?: "blue" | "violet";
}

export function WaveIndicator({
  className,
  amplitude,
  bars = 5,
  color = "blue",
}: WaveIndicatorProps) {
  const gradient =
    color === "blue"
      ? "linear-gradient(180deg, #93c5fd 0%, #3b82f6 100%)"
      : "linear-gradient(180deg, #d8b4fe 0%, #9333ea 100%)";

  // Heights for static-like resting pattern
  const restPattern = [0.4, 0.7, 1.0, 0.7, 0.4];

  return (
    <div
      className={cn("flex items-end gap-[3px]", className)}
      style={{ height: 14 }}
    >
      {Array.from({ length: bars }).map((_, i) => {
        const rest = restPattern[i % restPattern.length];
        const drivenHeight = amplitude !== undefined
          ? `${30 + Math.min(1, amplitude * (1 + (rest - 0.7))) * 70}%`
          : undefined;

        return (
          <motion.span
            key={i}
            style={{
              width: 2.5,
              borderRadius: 1.5,
              background: gradient,
              display: "block",
            }}
            animate={
              amplitude !== undefined
                ? { height: drivenHeight }
                : { height: ["28%", `${rest * 100}%`, "28%"] }
            }
            transition={
              amplitude !== undefined
                ? { duration: 0.1, ease: "easeOut" }
                : {
                    duration: 0.85,
                    repeat: Infinity,
                    delay: i * 0.09,
                    ease: "easeInOut",
                  }
            }
          />
        );
      })}
    </div>
  );
}
