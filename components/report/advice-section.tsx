"use client";

import { motion } from "framer-motion";
import { SectionWrapper } from "./section-wrapper";
import { useReportRender } from "./report-context";
import type { Advice } from "@/lib/types";

interface Props {
  data: Advice | null | undefined;
  index: number;
  total: number;
}

const PUBLIC_GUIDE = (
  <div className="mt-6 p-4 rounded-md bg-[var(--blue-50)] border border-[var(--blue-200)] text-[14px] leading-[1.7] text-[var(--report-ink-soft)]">
    本评估为参考性质，实际岗位匹配请前往
    <a
      href="https://careers.sh.gov.cn"
      target="_blank"
      rel="noopener"
      className="text-[var(--primary)] underline mx-1"
    >
      上海市公共招聘网
    </a>
    {" / "}
    拨打 12333 公共就业服务热线
  </div>
);

export default function AdviceSection({ data, index, total }: Props) {
  const { exporting } = useReportRender();

  // 为空兜底：底部通用引导仍显示
  if (!data) {
    return (
      <SectionWrapper
        id="advice"
        title="下一步行动建议"
        index={index}
        total={total}
      >
        <p className="text-[14px] text-[var(--report-ink-muted)]">
          ⏳ 行动建议生成中…
        </p>
        {PUBLIC_GUIDE}
      </SectionWrapper>
    );
  }

  const applyDirection = Array.isArray(data.applyDirection)
    ? data.applyDirection
    : [];
  const skillUp = Array.isArray(data.skillUp) ? data.skillUp : [];
  const interviewTips = Array.isArray(data.interviewTips)
    ? data.interviewTips
    : [];

  const fadeIn = exporting
    ? {}
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.3 },
      };

  const stagger = (i: number) =>
    exporting
      ? {}
      : {
          initial: { opacity: 0, y: 8 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.3, delay: i * 0.05 },
        };

  return (
    <SectionWrapper
      id="advice"
      title="下一步行动建议"
      index={index}
      total={total}
    >
      {/* 第一组：投递方向 */}
      {applyDirection.length > 0 && (
        <motion.div {...fadeIn} className="mb-6">
          <h3 className="text-[15px] sm:text-[16px] font-semibold text-[var(--navy-950)] mb-3">
            投递方向
          </h3>
          <ol className="space-y-3">
            {applyDirection.map((item, i) => (
              <motion.li
                key={i}
                {...stagger(i)}
                className="flex gap-3 py-3 px-3 rounded-md bg-[var(--report-soft-bg,transparent)]"
              >
                <span className="flex-none inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--primary)] text-white text-[13px] font-semibold tabular-nums">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    {item.channel && (
                      <span className="report-chip">{item.channel}</span>
                    )}
                  </div>
                  <p className="text-[14px] sm:text-[15px] leading-[1.7] text-[var(--report-ink-soft)]">
                    {item.tip}
                  </p>
                </div>
              </motion.li>
            ))}
          </ol>
        </motion.div>
      )}

      {/* 第二组：技能提升 */}
      {skillUp.length > 0 && (
        <motion.div {...fadeIn} className="mb-6">
          <h3 className="text-[15px] sm:text-[16px] font-semibold text-[var(--navy-950)] mb-3">
            技能提升
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {skillUp.map((item, i) => (
              <motion.div
                key={i}
                {...stagger(i)}
                className="p-4 rounded-md border border-[var(--report-border)] bg-white"
              >
                <div className="flex flex-wrap items-start justify-between gap-2 mb-1.5">
                  <h4 className="text-[14px] sm:text-[15px] font-semibold text-[var(--navy-950)] flex-1 min-w-0">
                    {item.skill}
                  </h4>
                  {item.duration && (
                    <span className="report-chip flex-none">
                      {item.duration}
                    </span>
                  )}
                </div>
                {item.resource && (
                  <p className="text-[13px] leading-[1.6] text-[var(--report-ink-muted)]">
                    {item.resource}
                  </p>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* 第三组：面试要点 */}
      {interviewTips.length > 0 && (
        <motion.div {...fadeIn} className="mb-2">
          <h3 className="text-[15px] sm:text-[16px] font-semibold text-[var(--navy-950)] mb-3">
            面试要点
          </h3>
          <ul className="space-y-2">
            {interviewTips.map((tip, i) => (
              <motion.li
                key={i}
                {...stagger(i)}
                className="flex gap-2 py-1 text-[14px] sm:text-[15px] leading-[1.7] text-[var(--report-ink-soft)]"
              >
                <span
                  aria-hidden
                  className="flex-none mt-[0.55em] h-1.5 w-1.5 rounded-full bg-[var(--primary)]"
                />
                <span className="flex-1 min-w-0">{tip}</span>
              </motion.li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* 底部固定通用引导（不依赖 data，必须显示） */}
      {PUBLIC_GUIDE}
    </SectionWrapper>
  );
}
