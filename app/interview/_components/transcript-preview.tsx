"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, Check, Sparkles, AlertCircle } from "lucide-react";

interface TranscriptPreviewProps {
  text: string; // initial recognized text (can be "" if ASR failed)
  onConfirm: (finalText: string) => void;
  onRetry: () => void;
  isLoading?: boolean;
  /** "重新录音" / "清空重写" 等 */
  retryLabel?: string;
}

export function TranscriptPreview({
  text,
  onConfirm,
  onRetry,
  isLoading = false,
  retryLabel = "重新录音",
}: TranscriptPreviewProps) {
  const [editedText, setEditedText] = useState(text);
  const [isFocused, setIsFocused] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Sync when prop text changes (e.g. ASR completes)
  useEffect(() => {
    setEditedText(text);
  }, [text]);

  // Auto-resize textarea to fit content (no scrollbar)
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.max(72, Math.min(220, ta.scrollHeight))}px`;
  }, [editedText]);

  const isAsrFailed = !isLoading && text === "";
  const canConfirm = editedText.trim().length > 0;
  const charCount = editedText.trim().length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className="w-full"
    >
      {/* === 卡片 === */}
      <motion.div
        animate={{
          boxShadow: isFocused
            ? "0 0 0 1px rgba(99,102,241,0.45), 0 8px 32px rgba(99,102,241,0.18), 0 2px 6px rgba(15,23,42,0.05)"
            : "0 0 0 1px rgba(15,23,42,0.06), 0 6px 20px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.03)",
          borderColor: isFocused ? "rgba(99,102,241,0.0)" : "rgba(255,255,255,0.0)",
        }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="rounded-2xl overflow-hidden border border-transparent"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.85) 100%)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
        }}
      >
        {/* 顶部信息条 */}
        <div className="flex items-center gap-2 px-4 pt-3.5 pb-2.5">
          <div
            className="size-5 rounded-full flex items-center justify-center shrink-0"
            style={{
              background: "linear-gradient(135deg, #93c5fd 0%, #6366f1 60%, #4338ca 100%)",
              boxShadow:
                "0 0 0 2px rgba(255,255,255,0.7) inset, 0 1px 2px rgba(99,102,241,0.4)",
            }}
          >
            <Sparkles size={10} strokeWidth={2.5} className="text-white" />
          </div>
          <span className="text-[11px] font-semibold tracking-[0.18em] uppercase text-slate-500">
            你的回答
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            <AnimatePresence>
              {charCount > 0 && (
                <motion.span
                  initial={{ opacity: 0, x: 4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 4 }}
                  className="text-[10px] font-mono text-slate-400 tabular-nums"
                >
                  {charCount} 字
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* 分隔线（focus 时变蓝渐变） */}
        <motion.div
          className="mx-4 h-px"
          animate={{
            background: isFocused
              ? "linear-gradient(90deg, transparent, rgba(99,102,241,0.5) 50%, transparent)"
              : "linear-gradient(90deg, transparent, rgba(15,23,42,0.08) 50%, transparent)",
          }}
          transition={{ duration: 0.25 }}
        />

        {/* 编辑区 */}
        <div className="relative px-4 pt-3 pb-2">
          <textarea
            ref={taRef}
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={
              isAsrFailed ? "未识别到内容，请手动输入..." : "可在此修改你的回答..."
            }
            disabled={isLoading}
            spellCheck={false}
            className="w-full bg-transparent border-0 resize-none p-0 text-slate-800 outline-none placeholder:text-slate-400/80"
            style={{
              fontSize: 16, // iOS prevents auto-zoom
              lineHeight: "1.7",
              minHeight: 72,
              maxHeight: 220,
              caretColor: "#6366f1",
            }}
          />
        </div>

        {/* ASR 失败提示 */}
        <AnimatePresence>
          {isAsrFailed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mx-4 mb-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200"
            >
              <AlertCircle size={11} className="text-amber-600 shrink-0" />
              <span className="text-[11px] text-amber-700">
                语音识别未成功，请手动输入或重录
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action footer */}
        <div
          className="flex items-center gap-2 px-3 pb-3 pt-1"
          style={{
            borderTop: "1px solid rgba(15,23,42,0.04)",
            marginTop: 4,
          }}
        >
          <button
            type="button"
            onClick={onRetry}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-slate-500 text-[12px] font-medium hover:bg-slate-100 hover:text-slate-700 active:scale-95 transition-all disabled:opacity-40"
          >
            <RotateCcw size={12} strokeWidth={2.4} />
            {retryLabel}
          </button>

          <div className="flex-1" />

          <motion.button
            type="button"
            onClick={() => onConfirm(editedText.trim())}
            disabled={isLoading || !canConfirm}
            whileTap={canConfirm ? { scale: 0.96 } : undefined}
            whileHover={canConfirm ? { y: -1 } : undefined}
            transition={{ duration: 0.15 }}
            className="relative flex items-center gap-1.5 px-4 py-1.5 rounded-full text-white text-[12px] font-semibold transition-opacity disabled:opacity-50 overflow-hidden"
            style={{
              background: canConfirm
                ? "linear-gradient(135deg, #6366f1 0%, #3b82f6 50%, #4f46e5 100%)"
                : "linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%)",
              boxShadow: canConfirm
                ? "0 2px 8px rgba(99,102,241,0.4), 0 0 0 1px rgba(99,102,241,0.2), inset 0 1px 0 rgba(255,255,255,0.3)"
                : "none",
            }}
          >
            {/* shimmer accent on hover */}
            {canConfirm && (
              <motion.span
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.45) 50%, transparent 70%)",
                  backgroundSize: "200% 100%",
                }}
                animate={{ backgroundPosition: ["-100% 0%", "200% 0%"] }}
                transition={{
                  duration: 2.4,
                  repeat: Infinity,
                  ease: "linear",
                  repeatDelay: 1.6,
                }}
              />
            )}
            <Check size={12} strokeWidth={2.8} className="relative" />
            <span className="relative">确认提交</span>
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
