"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";

interface TransitionCardProps {
  onComplete: () => void;
}

export function TransitionCard({ onComplete }: TransitionCardProps) {
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in");

  useEffect(() => {
    // 200ms fade in → 1100ms hold → 200ms fade out → call onComplete
    const holdTimer = setTimeout(() => setPhase("hold"), 200);
    const outTimer = setTimeout(() => setPhase("out"), 1300); // 200 + 1100
    const doneTimer = setTimeout(() => onComplete(), 1500); // 200 + 1100 + 200

    return () => {
      clearTimeout(holdTimer);
      clearTimeout(outTimer);
      clearTimeout(doneTimer);
    };
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: phase === "out" ? 0 : 1 }}
      transition={{
        duration: 0.2,
        ease: "easeInOut",
      }}
    >
      <div className="flex flex-col items-center gap-6 px-8 text-center">
        {/* Checkmark */}
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.05, duration: 0.25, ease: "easeOut" }}
          className="flex flex-col items-center gap-2"
        >
          <CheckCircle className="h-14 w-14 text-green-400" strokeWidth={1.8} />
          <span className="text-lg font-semibold text-green-400">
            ✓ 测评完成
          </span>
        </motion.div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.25 }}
          className="text-xl font-medium text-white"
        >
          接下来 AI 想和你聊聊
        </motion.p>

        {/* Circular spinner */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.2 }}
        >
          <svg
            className="h-8 w-8 animate-spin text-blue-400"
            viewBox="0 0 24 24"
            fill="none"
            aria-label="加载中"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        </motion.div>
      </div>
    </motion.div>
  );
}
