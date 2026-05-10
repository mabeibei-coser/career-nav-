"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import { motion } from "framer-motion";
import { SectionWrapper } from "./section-wrapper";
import { useReportRender } from "./report-context";
import type { Strength } from "@/lib/types";

interface Props {
  data: Strength | null | undefined;
  index: number;
  total: number;
}

const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];

export default function StrengthSection({ data, index, total }: Props) {
  const { exporting } = useReportRender();

  // 为空兜底
  if (!data) {
    return (
      <SectionWrapper
        id="strength"
        title="优势发现"
        index={index}
        total={total}
      >
        <div className="flex items-center justify-center py-10 text-[14px] text-[var(--report-ink-muted)]">
          ⏳ 优势分析生成中…
        </div>
      </SectionWrapper>
    );
  }

  const safeRadar = Array.isArray(data.abilityRadar) ? data.abilityRadar : [];
  const safeStrengths = Array.isArray(data.strengths) ? data.strengths : [];
  const safeGrowth = Array.isArray(data.growth) ? data.growth : [];

  const radarData = safeRadar.map((a) => ({
    subject: a.name,
    value: a.score,
    fullMark: 100,
  }));

  // 卡片包装：导出时不动画
  const CardWrap = exporting ? "div" : motion.div;
  const cardMotion = (i: number) =>
    exporting
      ? {}
      : {
          initial: { opacity: 0, y: 8 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.3, delay: i * 0.05, ease },
        };

  return (
    <SectionWrapper
      id="strength"
      title="优势发现"
      index={index}
      total={total}
    >
      {/* 能力雷达图 */}
      {radarData.length > 0 && (
        <div className="rounded-xl border border-[var(--blue-100)] bg-white p-4 sm:p-5 mb-6 break-inside-avoid">
          <div className="text-[11px] font-semibold tracking-wider uppercase text-[var(--report-ink-muted)] mb-3">
            6 项能力雷达
          </div>
          <div className="flex items-center justify-center">
            <div className="w-full max-w-[420px] h-[220px] sm:h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="72%">
                  <PolarGrid stroke="var(--blue-200)" />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fontSize: 11, fill: "var(--navy-700)" }}
                  />
                  <Radar
                    dataKey="value"
                    stroke="var(--primary)"
                    fill="var(--primary)"
                    fillOpacity={0.28}
                    isAnimationActive={!exporting}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* 优势 */}
      {safeStrengths.length > 0 && (
        <div className="mb-6">
          <div className="text-[11px] font-semibold tracking-wider uppercase text-[var(--report-ink-muted)] mb-3">
            优势
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {safeStrengths.map((s, i) => (
              <CardWrap
                key={i}
                {...cardMotion(i)}
                className="report-card rounded-xl p-5 break-inside-avoid"
              >
                <h4 className="text-[15px] font-semibold text-[var(--blue-700)] mb-2">
                  {s.title}
                </h4>
                <p
                  className="text-[14px] text-[var(--navy-800)]"
                  style={{ lineHeight: 1.65 }}
                >
                  {s.detail}
                </p>
              </CardWrap>
            ))}
          </div>
        </div>
      )}

      {/* 可以更进一步 */}
      {safeGrowth.length > 0 && (
        <div>
          <div className="text-[11px] font-semibold tracking-wider uppercase text-[var(--blue-700)] mb-3">
            可以更进一步
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {safeGrowth.map((g, i) => (
              <CardWrap
                key={i}
                {...cardMotion(safeStrengths.length + i)}
                className="rounded-xl border border-[var(--blue-200)] p-5 break-inside-avoid"
                style={{ background: "var(--blue-50)" }}
              >
                <h4 className="text-[15px] font-semibold text-[var(--navy-900)] mb-2">
                  {g.title}
                </h4>
                <p
                  className="text-[14px] text-[var(--navy-800)]"
                  style={{ lineHeight: 1.65 }}
                >
                  {g.detail}
                </p>
              </CardWrap>
            ))}
          </div>
        </div>
      )}
    </SectionWrapper>
  );
}
