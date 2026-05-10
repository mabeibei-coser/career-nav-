import type { Page } from "@playwright/test";

const LIKERT_LABELS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "非常不同意",
  2: "不同意",
  3: "中立",
  4: "同意",
  5: "非常同意",
};

export class QuizPage {
  constructor(private page: Page) {}

  /**
   * 依次回答 8 题量表（每题 5 级 Likert 1-5）。
   * 中间题 0.3s 自动跳下题；最后一题不跳，需手动点"提交并进入访谈"。
   *
   * 关键时序点：
   *   - AnimatePresence mode="wait"：当前题 exit 动画 ~200ms 完成后，下一题才挂载
   *   - 顶栏 "i / total" 在 currentIndex 变化的瞬间就更新（不等动画），不能作为
   *     "下一题已挂载"的信号
   *   - 因此：每次 click 后都等"已完成 N/total"计数变化（state commit 标志），
   *     然后等下一题的题号"Qn"徽标出现（mount 完成标志）。
   *
   * @param rawValues 8 个 1-5 的整数；length 应等于题数
   */
  async answerAll(rawValues: number[]) {
    const total = rawValues.length;
    // 等首题渲染（题号 Q1 出现）
    await this.page
      .locator("text=/^Q1$/")
      .first()
      .waitFor({ state: "visible", timeout: 30_000 });

    for (let i = 0; i < total; i++) {
      const raw = rawValues[i];
      if (raw < 1 || raw > 5 || !Number.isInteger(raw)) {
        throw new Error(`quiz.answerAll: rawValues[${i}]=${raw} 不是 1-5 整数`);
      }
      const label = LIKERT_LABELS[raw as 1 | 2 | 3 | 4 | 5];

      // 等当前题号 Q(i+1) 渲染（mount + enter 动画大致完成）
      // Q(i+1) 的 badge 文本在 motion.div 内部，AnimatePresence mode="wait"
      // 保证它出现时上一题已完全 unmount。
      await this.page
        .locator(`text=/^Q${i + 1}$/`)
        .first()
        .waitFor({ state: "visible", timeout: 30_000 });

      // 防御性：等 motion.div enter 动画稳定（200ms）。
      // 不等的话 Q(i+1) 可能还在 opacity 上升中，pointer 路径上仍是上一题的残影。
      await this.page.waitForTimeout(250);

      // 锁定到当前题面卡片内点击，避免 AnimatePresence 残影元素误匹配
      const optionBtn = this.page
        .getByRole("button", { name: new RegExp(`^${label}`) })
        .last(); // 同时存在两题时 .last() 取新题（DOM 顺序：旧题在前，新题在后）
      await optionBtn.waitFor({ state: "visible", timeout: 10_000 });
      await optionBtn.click();

      // 等"已完成 N/total" 计数到达 i+1（state commit 信号；不依赖 aria-pressed）
      await this.page
        .getByText(new RegExp(`已完成\\s*${i + 1}\\s*/\\s*${total}`))
        .first()
        .waitFor({ state: "visible", timeout: 10_000 });
    }

    // 最后一题点提交
    const submitBtn = this.page.getByRole("button", {
      name: "提交并进入访谈",
    });
    await submitBtn.waitFor({ state: "visible", timeout: 10_000 });
    // 防御性：等按钮 enabled
    await this.page.waitForFunction(
      () => {
        const btns = Array.from(document.querySelectorAll("button"));
        const sub = btns.find((b) => b.textContent?.includes("提交并进入访谈"));
        return sub != null && !(sub as HTMLButtonElement).disabled;
      },
      undefined,
      { timeout: 10_000 },
    );
    await submitBtn.click();
    await this.page.waitForURL("**/interview", { timeout: 30_000 });
  }
}
