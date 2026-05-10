"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import { motion } from "framer-motion";
import { SectionWrapper } from "./section-wrapper";
import { useReportRender } from "./report-context";
import type { Overview, ReportMeta } from "@/lib/types";

interface Props {
  data: Overview | null | undefined;
  meta?: ReportMeta;
  index: number;
  total: number;
}

export function OverviewSection({ data, index, total }: Props) {
  const { exporting } = useReportRender();

  // 为空兜底：不报错、不显示空雷达
  if (!data) {
    return (
      <SectionWrapper id="overview" title="总评" index={index} total={total}>
        <p className="text-[14px] text-[var(--report-ink-muted)]">
          ⏳ 总评模块生成中…
        </p>
      </SectionWrapper>
    );
  }

  const personality = data.personality;
  const traits = Array.isArray(personality?.traits) ? personality.traits : [];
  const radarData = Array.isArray(data.fourDimRadar)
    ? data.fourDimRadar.map((d) => ({
        name: d.name,
        score: typeof d.score === "number" ? d.score : 0,
      }))
    : [];

  const fadeIn = exporting
    ? {}
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: { duration: 0.3 },
      };

  return (
    <SectionWrapper id="overview" title="总评" index={index} total={total}>
      {/* 顶部：性格类型 + 标签云 */}
      {personality && (
        <motion.div
          {...fadeIn}
          className="flex flex-wrap items-center gap-2 mb-5"
        >
          {personality.type && (
            <span className="inline-flex items-center rounded-full bg-[var(--primary)] px-3 py-1.5 text-[15px] sm:text-[16px] font-bold text-white tracking-wide min-h-[44px] min-w-[44px] justify-center">
              {personality.type}
            </span>
          )}
          {traits.map((t) => (
            <span key={t} className="report-chip">
              {t}
            </span>
          ))}
        </motion.div>
      )}

      {/* 中部：左描述 + 右雷达，移动端纵向 */}
      <motion.div
        {...fadeIn}
        className="grid gap-5 md:grid-cols-2 md:gap-6 mb-5 items-start"
      >
        {personality?.description && (
          <p className="text-[14px] sm:text-[15px] leading-[1.7] text-[var(--report-ink-soft)] order-2 md:order-1">
            {personality.description}
          </p>
        )}

        {radarData.length > 0 && (
          <div className="order-1 md:order-2 w-full h-[220px] md:h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="72%">
                <PolarGrid stroke="var(--report-border)" />
                <PolarAngleAxis
                  dataKey="name"
                  tick={{
                    fontSize: 12,
                    fill: "var(--report-ink-soft)",
                  }}
                />
                <PolarRadiusAxis
                  domain={[0, 100]}
                  tick={false}
                  axisLine={false}
                />
                <Radar
                  dataKey="score"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  fill="oklch(0.40 0.07 237 / 0.3)"
                  isAnimationActive={!exporting}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}
      </motion.div>

      {/* 底部：综述（蓝条 takeaway 样式） */}
      {data.summary && (
        <motion.p {...fadeIn} className="report-takeaway">
          {data.summary}
        </motion.p>
      )}
    </SectionWrapper>
  );
}
