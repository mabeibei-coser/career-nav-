"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useReportRender } from "./report-context";

export interface SectionWrapperProps {
  id?: string;
  title: string;
  index: number;
  total: number;
  takeaway?: string;
  meta?: React.ReactNode;
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function SectionWrapper({
  id,
  title,
  index,
  total,
  takeaway,
  meta,
  children,
  delay = 0,
  className,
}: SectionWrapperProps) {
  const { exporting } = useReportRender();
  const Wrapper = exporting ? "section" : motion.section;
  const motionProps = exporting
    ? {}
    : {
        initial: { opacity: 0, y: 16 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.45, delay, ease },
      };

  const paddedIndex = String(index).padStart(2, "0");
  const paddedTotal = String(total).padStart(2, "0");

  return (
    <Wrapper
      id={id}
      data-pdf-section={id ?? title}
      {...motionProps}
      className={cn(
        "report-card p-5 sm:p-7 break-inside-avoid-page",
        className
      )}
    >
      <header className="mb-5 sm:mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex h-6 items-center rounded-full bg-[var(--blue-500)] px-2 text-[11px] font-semibold text-white tabular-nums">
            {paddedIndex} / {paddedTotal}
          </span>
          <span className="text-xs text-[var(--report-ink-muted)] uppercase tracking-wider">
            Section
          </span>
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--navy-950)] tracking-tight">
            {title}
          </h2>
          {meta && (
            <div className="text-[13px] text-[var(--report-ink-muted)]">
              {meta}
            </div>
          )}
        </div>
        {takeaway && (
          <p className="report-takeaway mt-4">{takeaway}</p>
        )}
      </header>
      {children}
    </Wrapper>
  );
}
