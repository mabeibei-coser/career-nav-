"use client";

import { Loader2 } from "lucide-react";
import { StepIndicator } from "@/components/ui/step-indicator";

export default function InterviewLoading() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)" }}
    >
      <div className="px-4 sm:px-6 pt-5 pb-3 border-b border-slate-200/60 bg-white/70">
        <div className="max-w-2xl mx-auto">
          <StepIndicator currentStep={1} compact />
        </div>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <Loader2 className="size-8 animate-spin text-[var(--blue-500)]" />
        <p className="text-sm text-slate-500">正在加载访谈…</p>
      </div>
    </div>
  );
}
