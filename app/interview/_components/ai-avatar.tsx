"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AiAvatarProps {
  /** 播放/思考时呼吸 */
  isActive?: boolean;
  size?: number;
  className?: string;
}

export function AiAvatar({ isActive = false, size = 28, className }: AiAvatarProps) {
  return (
    <motion.div
      className={cn("rounded-full shrink-0 relative overflow-hidden", className)}
      style={{
        width: size,
        height: size,
        background: "radial-gradient(circle at 32% 28%, #93c5fd 0%, #6366f1 55%, #4338ca 100%)",
        boxShadow:
          "0 2px 6px rgba(99,102,241,0.4), inset 0 1px 2px rgba(255,255,255,0.45), inset 0 -2px 3px rgba(0,0,0,0.18)",
      }}
      animate={
        isActive
          ? { scale: [1, 1.08, 1] }
          : { scale: 1 }
      }
      transition={{
        duration: 1.6,
        repeat: isActive ? Infinity : 0,
        ease: "easeInOut",
      }}
    >
      {/* glass highlight */}
      <span
        className="absolute pointer-events-none"
        style={{
          top: "12%",
          left: "20%",
          width: "32%",
          height: "26%",
          background: "rgba(255,255,255,0.55)",
          borderRadius: "50%",
          filter: "blur(1.5px)",
        }}
      />
    </motion.div>
  );
}
