"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Crown, Star } from "lucide-react";
import { SectionWrapper } from "./section-wrapper";
import { useReportRender } from "./report-context";
import { cn } from "@/lib/utils";
import type { Positioning, PositionRecommendation } from "@/lib/types";

interface Props {
  data: Positioning | null | undefined;
  index?: number;
  total?: number;
}

const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];

function PositionCard({
  rec,
  variant,
  delay,
  exporting,
}: {
  rec: PositionRecommendation;
  variant: "primary" | "secondary";
  delay: number;
  exporting: boolean;
}) {
  const isPrimary = variant === "primary";
  const Icon = isPrimary ? Crown : Star;

  const Wrapper = exporting ? "div" : motion.div;
  const motionProps = exporting
    ? {}
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.3, delay, ease },
      };

  const safeIndustries = Array.isArray(rec.industries) ? rec.industries : [];
  const score = typeof rec.matchScore === "number" ? Math.max(0, Math.min(100, Math.round(rec.matchScore))) : null;

  return (
    <Wrapper
      {...motionProps}
      className={cn(
        "relative report-card p-5 break-inside-avoid",
        isPrimary &&
          "ring-2 ring-[var(--blue-500)] border-[var(--blue-500)] bg-gradient-to-br from-[var(--blue-50)] to-white"
      )}
    >
      {/* 角标：首选 / 次选 */}
      <span
        className={cn(
          "absolute -top-2.5 right-4 inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold shadow-sm",
          isPrimary
            ? "border-[var(--blue-500)] bg-[var(--blue-500)] text-white"
            : "border-[var(--blue-200)] bg-white text-[var(--navy-700)]"
        )}
      >
        <Icon className="size-3" />
        {isPrimary ? "首选" : "次选"}
      </span>

      {/* 顶部：岗位名称 + 匹配度 */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3
          className={cn(
            "font-bold tracking-tight leading-tight text-[var(--navy-950)]",
            isPrimary ? "text-[20px] sm:text-[22px]" : "text-[18px] sm:text-[20px]"
          )}
        >
          {rec.position || "—"}
        </h3>
        {score !== null && (
          <div className="report-kpi shrink-0" aria-label={`匹配度 ${score}%`}>
            <span className="n">{score}</span>
            <span className="u">%</span>
          </div>
        )}
      </div>

      {/* reasoning */}
      {rec.reasoning && (
        <p className="text-[13.5px] leading-[1.65] text-[var(--navy-800)] mb-4">
          {rec.reasoning}
        </p>
      )}

      {/* industries 标签云 */}
      {safeIndustries.length > 0 && (
        <div className="mb-4">
          <div className="text-[11px] font-semibold tracking-wider uppercase text-[var(--report-ink-muted)] mb-2">
            行业方向
          </div>
          <div className="flex flex-wrap gap-1.5">
            {safeIndustries.map((ind, i) => (
              <span key={`${ind}-${i}`} className="report-chip">
                {ind}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* culture + teamRole */}
      <div className="space-y-2 pt-3 border-t border-[var(--report-divider,rgba(15,23,42,0.06))]">
        {rec.culture && (
          <div className="flex gap-2 text-[13px] leading-[1.6]">
            <span className="shrink-0 w-[64px] text-[var(--report-ink-muted)] font-medium">
              企业文化
            </span>
            <span className="text-[var(--navy-800)]">{rec.culture}</span>
          </div>
        )}
        {rec.teamRole && (
          <div className="flex gap-2 text-[13px] leading-[1.6]">
            <span className="shrink-0 w-[64px] text-[var(--report-ink-muted)] font-medium">
              团队角色
            </span>
            <span className="text-[var(--navy-800)]">{rec.teamRole}</span>
          </div>
        )}
      </div>
    </Wrapper>
  );
}

export default function PositioningSection({
  data,
  index = 3,
  total = 5,
}: Props) {
  const { exporting } = useReportRender();

  if (!data || !data.primary) {
    return (
      <SectionWrapper
        id="positioning"
        title="职业定位推荐"
        index={index}
        total={total}
      >
        <div className="rounded-xl border border-dashed border-[var(--blue-200)] bg-[var(--blue-50)]/40 px-5 py-8 text-center text-[13.5px] text-[var(--report-ink-muted)]">
          ⏳ 职业定位生成中…
        </div>
      </SectionWrapper>
    );
  }

  const takeaway = data.secondary?.position
    ? `首选：${data.primary.position} · 次选：${data.secondary.position}`
    : `首选方向：${data.primary.position}`;

  return (
    <SectionWrapper
      id="positioning"
      title="职业定位推荐"
      index={index}
      total={total}
      takeaway={takeaway}
    >
      <div className="grid gap-4 md:grid-cols-2 md:gap-5 pt-1">
        <PositionCard
          rec={data.primary}
          variant="primary"
          delay={0}
          exporting={exporting}
        />
        {data.secondary && (
          <PositionCard
            rec={data.secondary}
            variant="secondary"
            delay={0.1}
            exporting={exporting}
          />
        )}
      </div>
    </SectionWrapper>
  );
}
