"use client";

import { Fragment } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const REPORT_STEPS = ["填写职业意向", "快速职业评估", "生成职业报告"] as const;

interface StepIndicatorProps {
  /** 0-indexed current step (0=form, 1=quiz/interview, 2=loading/report) */
  currentStep: number;
  className?: string;
  /** if true, hide labels on small screens (still show numbers + connectors) */
  compact?: boolean;
}

export function StepIndicator({ currentStep, className, compact }: StepIndicatorProps) {
  return (
    <div className={cn("flex items-center justify-between gap-1.5 sm:gap-2 w-full", className)}>
      {REPORT_STEPS.map((label, i) => {
        const done = i < currentStep;
        const active = i === currentStep;

        return (
          <Fragment key={i}>
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <div
                className={cn(
                  "w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[11px] sm:text-xs font-semibold transition-all",
                  active && "bg-blue-500 text-white shadow-md shadow-blue-500/40 ring-2 ring-blue-100",
                  done && "bg-blue-100 text-blue-600",
                  !active && !done && "bg-slate-200 text-slate-400"
                )}
              >
                {done ? <Check size={13} strokeWidth={2.5} /> : i + 1}
              </div>
              <span
                className={cn(
                  "text-xs sm:text-sm font-medium whitespace-nowrap transition-colors",
                  active && "text-slate-800",
                  done && "text-slate-500",
                  !active && !done && "text-slate-400",
                  compact && !active && "hidden sm:inline"
                )}
              >
                {label}
              </span>
            </div>
            {i < REPORT_STEPS.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-px transition-colors",
                  done ? "bg-blue-300" : "bg-slate-200"
                )}
              />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
