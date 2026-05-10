"use client";

import { Loader2 } from "lucide-react";
import { StepIndicator } from "@/components/ui/step-indicator";

export default function QuizLoading() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="fixed inset-0 bg-gradient-to-br from-[var(--blue-50)] via-white to-[var(--blue-100)]" />
      <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <StepIndicator currentStep={1} compact />
        <div className="mt-20 flex flex-col items-center gap-4">
          <Loader2 className="size-8 animate-spin text-[var(--blue-500)]" />
          <p className="text-sm text-slate-500">正在加载测评…</p>
        </div>
      </div>
    </div>
  );
}
