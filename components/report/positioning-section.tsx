"use client";

import { motion } from "framer-motion";
import { Crown, Star } from "lucide-react";
import { SectionWrapper } from "./section-wrapper";
import { useReportRender } from "./report-context";
import { cn } from "@/lib/utils";
import type { Positioning, PositionRecommendation } from "@/lib/types";

// ---- SVG 雷达图 ----

function SvgRadar({ items }: { items: { name: string; score: number }[] }) {
  if (items.length < 3) return null;
  const SIZE = 220;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const R = 72; // 数据最外圈半径
  const n = items.length;

  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const pt = (i: number, ratio: number) => ({
    x: cx + R * ratio * Math.cos(angle(i)),
    y: cy + R * ratio * Math.sin(angle(i)),
  });

  // 4 层同心多边形网格
  const grid = [0.25, 0.5, 0.75, 1].map((ratio) => {
    const pts = Array.from({ length: n }, (_, i) => pt(i, ratio));
    return (
      pts.map((p, j) => `${j === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + "Z"
    );
  });

  // 轴线（中心 → 顶点）
  const spokes = Array.from({ length: n }, (_, i) => {
    const end = pt(i, 1);
    return `M${cx},${cy}L${end.x.toFixed(1)},${end.y.toFixed(1)}`;
  });

  // 数据多边形
  const dataPts = items.map((d, i) => pt(i, Math.max(0.05, d.score / 100)));
  const dataPath =
    dataPts.map((p, j) => `${j === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + "Z";

  // 标签（轴顶点外侧）
  const labelR = R + 20;
  const labels = items.map((d, i) => {
    const a = angle(i);
    const x = cx + labelR * Math.cos(a);
    const y = cy + labelR * Math.sin(a);
    const eps = 0.2;
    const anchor: "start" | "end" | "middle" =
      Math.cos(a) > eps ? "start" : Math.cos(a) < -eps ? "end" : "middle";
    return { text: d.name, x, y, anchor };
  });

  return (
    <svg
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      aria-hidden
      className="overflow-visible"
    >
      {/* 网格 */}
      {grid.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="var(--blue-100)" strokeWidth={i === 3 ? 1 : 0.7} />
      ))}
      {/* 轴线 */}
      {spokes.map((d, i) => (
        <path key={i} d={d} stroke="var(--blue-100)" strokeWidth="0.7" />
      ))}
      {/* 数据填充 */}
      <path
        d={dataPath}
        fill="var(--blue-500)"
        fillOpacity="0.18"
        stroke="var(--blue-500)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* 数据节点 */}
      {dataPts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="var(--blue-500)" />
      ))}
      {/* 标签 */}
      {labels.map((l, i) => (
        <text
          key={i}
          x={l.x}
          y={l.y}
          textAnchor={l.anchor}
          dominantBaseline="central"
          fontSize="11"
          fill="var(--navy-700)"
          fontFamily="inherit"
        >
          {l.text}
        </text>
      ))}
    </svg>
  );
}

// ---- 岗位卡片 ----

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

  const safeResp = Array.isArray(rec.coreResponsibilities)
    ? rec.coreResponsibilities.slice(0, 5)
    : [];
  const safeComp = Array.isArray(rec.coreCompetencies)
    ? rec.coreCompetencies.slice(0, 6)
    : [];

  return (
    <Wrapper
      {...(motionProps as Record<string, unknown>)}
      className={cn(
        "rounded-xl border bg-white p-5 break-inside-avoid",
        isPrimary
          ? "border-[var(--blue-500)] ring-1 ring-[var(--blue-500)]"
          : "border-[var(--blue-100)]"
      )}
    >
      {/* 顶部：角标 + 岗位名 */}
      <div className="flex items-start gap-3 mb-4">
        <span
          className={cn(
            "shrink-0 inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
            isPrimary
              ? "border-[var(--blue-500)] bg-[var(--blue-500)] text-white"
              : "border-[var(--blue-200)] bg-white text-[var(--navy-700)]"
          )}
        >
          <Icon className="size-3" />
          {isPrimary ? "首选" : "次选"}
        </span>
        <h3
          className={cn(
            "flex-1 min-w-0 font-bold tracking-tight leading-tight text-[var(--navy-950)]",
            isPrimary ? "text-[20px] sm:text-[22px]" : "text-[18px] sm:text-[20px]"
          )}
        >
          {rec.position || "—"}
        </h3>
      </div>

      {/* 核心职责 */}
      {safeResp.length > 0 && (
        <div className="mb-4">
          <div className="text-[11px] font-semibold tracking-wider uppercase text-[var(--report-ink-muted)] mb-2">
            核心职责
          </div>
          <ul className="space-y-1.5">
            {safeResp.map((r, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-[13.5px] leading-[1.65] text-[var(--navy-800)]"
              >
                <span className="mt-[6px] shrink-0 size-1.5 rounded-full bg-[var(--blue-500)]" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 核心能力：条形 + 雷达图 */}
      {safeComp.length > 0 && (
        <div className="mb-4">
          <div className="text-[11px] font-semibold tracking-wider uppercase text-[var(--report-ink-muted)] mb-3">
            核心能力
          </div>

          {/* 横向条形（仅名称 + 条，无分数无等级） */}
          <div className="space-y-2.5 mb-5">
            {safeComp.map((c, i) => {
              const pct = Math.max(2, Math.min(100, c.score));
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-[5rem] shrink-0 text-[12.5px] text-[var(--navy-700)] text-right leading-tight">
                    {c.name}
                  </span>
                  <div className="flex-1 h-[7px] rounded-full bg-[var(--blue-50)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--blue-500)]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* 雷达图 */}
          <div className="flex justify-center py-2">
            <SvgRadar items={safeComp} />
          </div>
        </div>
      )}

      {/* 为什么适合你 */}
      {rec.fitReason && (
        <div className="rounded-xl border border-[var(--blue-200)] bg-gradient-to-br from-[var(--blue-50)] to-white p-4">
          <div className="flex items-center gap-1.5 mb-1.5">
            <svg
              className="size-3.5 text-[var(--blue-500)]"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden
            >
              <path
                d="M8 1l2.35 4.76L16 6.54l-4 3.9.94 5.5L8 13.27l-4.94 2.67.94-5.5-4-3.9 5.65-.78L8 1z"
                fill="currentColor"
              />
            </svg>
            <span className="text-[12px] font-bold text-[var(--blue-700)]">
              为什么适合你
            </span>
          </div>
          <p className="text-[13.5px] leading-[1.75] text-[var(--navy-800)]">
            {rec.fitReason}
          </p>
        </div>
      )}
    </Wrapper>
  );
}

// ---- Section 入口 ----

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
      <div className="space-y-5 pt-1">
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
