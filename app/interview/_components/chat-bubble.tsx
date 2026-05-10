"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { AiAvatar } from "./ai-avatar";
import { WaveIndicator } from "./wave-indicator";

interface ChatBubbleProps {
  role: "ai" | "user" | "ai-typing" | "user-typing";
  children?: React.ReactNode;
  /** 在 AI 气泡内显示音波（TTS 播放中） */
  speaking?: boolean;
  /** 强制不显示头像（连续 AI 消息） */
  hideAvatar?: boolean;
  className?: string;
}

export function ChatBubble({
  role,
  children,
  speaking,
  hideAvatar,
  className,
}: ChatBubbleProps) {
  const isUser = role === "user" || role === "user-typing";
  const isTyping = role === "ai-typing" || role === "user-typing";

  // Three dots
  const dots = (
    <div className="flex gap-1 items-center py-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: isUser ? "rgba(255,255,255,0.85)" : "#94a3b8" }}
          animate={{ scale: [1, 1.45, 1], opacity: [0.45, 1, 0.45] }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.15,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );

  if (isUser) {
    return (
      <div className={cn("flex items-end justify-end mb-1.5", className)}>
        <motion.div
          initial={{ opacity: 0, y: 6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="max-w-[78%] rounded-[16px] rounded-br-[6px] px-4 py-2.5 text-[15px] leading-[1.55] text-white"
          style={{
            background: "linear-gradient(135deg, #4f8cff 0%, #3b82f6 100%)",
            boxShadow:
              "0 1px 2px rgba(59,130,246,0.25), 0 6px 16px rgba(59,130,246,0.18)",
          }}
        >
          {isTyping ? dots : children}
        </motion.div>
      </div>
    );
  }

  // AI bubble
  return (
    <div className={cn("flex items-end gap-2 mb-1.5", className)}>
      <div className="w-7 shrink-0">
        {!hideAvatar && (
          <AiAvatar isActive={speaking || isTyping} size={28} />
        )}
      </div>
      <motion.div
        initial={{ opacity: 0, y: 6, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="max-w-[80%] rounded-[16px] rounded-bl-[6px] px-4 py-2.5 text-[15px] leading-[1.6] text-slate-800"
        style={{
          background: "linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)",
          boxShadow:
            "0 1px 2px rgba(15,23,42,0.06), 0 0 0 1px rgba(15,23,42,0.04)",
        }}
      >
        {isTyping ? (
          dots
        ) : (
          <div className="flex flex-col gap-1.5">
            <div>{children}</div>
            {speaking && <WaveIndicator className="self-start" />}
          </div>
        )}
      </motion.div>
    </div>
  );
}
