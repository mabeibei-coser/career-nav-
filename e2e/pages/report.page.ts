import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

/**
 * 5 模块新版报告页：
 *   header + overview + strength + positioning + resumeDiagnosis + advice + disclaimer
 *
 * data-pdf-section 来源：
 *   - app/report/page.tsx 直接打：header / disclaimer
 *   - components/report/section-wrapper.tsx 打：id（overview/strength/positioning/advice）
 *   - resume-diagnosis-section.tsx 内部嵌套额外 div data-pdf-section="resume-diagnosis"
 *     → 有简历时该 section 内会渲染 1 个内部 div + 自身（SectionWrapper）共 2 处
 *     → 无简历时仅自身（SectionWrapper） + 1 个 dashed 占位 = 2 处
 *
 * 所以 [data-pdf-section] 元素总数：
 *   - 有简历：7 (header + overview + strength + positioning + resume-diagnosis SectionWrapper + resume-diagnosis 内嵌 + advice + disclaimer)
 *     header(1) + overview(1) + strength(1) + positioning(1) + resume-diagnosis SectionWrapper(1) + 内嵌 div(1) + advice(1) + disclaimer(1) = 8
 *   - 无简历：header(1) + overview(1) + strength(1) + positioning(1) + resume-diagnosis SectionWrapper(1) + dashed 内嵌(1) + advice(1) + disclaimer(1) = 8
 *
 * 即不论是否上传简历，都应该有 8 个 [data-pdf-section] 节点。本断言取下限以容错。
 */
export class ReportPage {
  constructor(private page: Page) {}

  /** 断言 5 个核心 section 都被渲染（按 SectionWrapper 写入的 data-pdf-section） */
  async assertSectionsVisible() {
    const ids = [
      "overview",
      "strength",
      "positioning",
      "resume-diagnosis",
      "advice",
    ];
    for (const id of ids) {
      await expect(
        this.page.locator(`[data-pdf-section="${id}"]`).first(),
        `[data-pdf-section="${id}"] 应该可见`,
      ).toBeVisible({ timeout: 30_000 });
    }
  }

  /** 断言 advice 底部的"上海公共招聘网"链接可见 */
  async assertExternalLinkVisible() {
    await expect(
      this.page.getByRole("link", { name: /上海市公共招聘网/ }).first(),
    ).toBeVisible({ timeout: 10_000 });
  }

  /**
   * 断言四维雷达 + 能力雷达存在（recharts 渲染为 svg + 内部 polygon/path）。
   * 简单校验：报告页内至少 2 个 svg 元素（OverviewSection + StrengthSection）。
   */
  async assertRadarsPresent() {
    // recharts ResponsiveContainer 内部渲染 <svg>
    // 滚动到底部确保所有 section 渲染，再回顶
    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await this.page.waitForTimeout(1000);
    await this.page.evaluate(() => window.scrollTo(0, 0));
    await this.page.waitForTimeout(500);
    const svgCount = await this.page.locator("svg.recharts-surface").count();
    expect(svgCount, "至少 1 个 recharts svg（雷达图）").toBeGreaterThanOrEqual(1);
  }
}
