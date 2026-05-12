import type { Page } from "@playwright/test";

/**
 * 访谈页 4 题流程：
 * - Q1Q2：API 动态生成（E2E_MOCK_MODE 下立即返回 mock）
 * - Q3Q4：客户端从题库抽签（无 API 调用）
 * - 默认语音输入；E2E 走文字输入更稳
 *
 * 状态机：init → greeting → ready → text-input → preview → ready(下题) → ... → done(跳 /loading)
 * Q3 之前会出现一次性导语 "q3-intro"，需点"继续作答"。
 */
export class InterviewPage {
  constructor(private page: Page) {}

  /**
   * 全程使用文字输入提交 4 个回答。
   * @param answers 4 个回答文本（每个 ≥ 5 字）
   */
  async answerAllText(answers: string[]) {
    if (answers.length !== 4) {
      throw new Error(`interview.answerAllText: 需要 4 个回答，传入 ${answers.length}`);
    }

    // 1. 等"开始访谈"按钮（greeting 阶段）
    const startBtn = this.page.getByRole("button", {
      name: /开始访谈/,
    });
    await startBtn.waitFor({ state: "visible", timeout: 30_000 });
    await startBtn.click();

    for (let i = 0; i < 4; i++) {
      // 进 Q3 前可能出现一次性导语过渡页
      if (i === 2) {
        const continueBtn = this.page.getByRole("button", {
          name: "继续作答",
        });
        try {
          await continueBtn.waitFor({ state: "visible", timeout: 8_000 });
          await continueBtn.click();
        } catch {
          // 没出导语（极少；缓存命中时不弹），继续往下走
        }
      }

      // 等题面卡片渲染（"第 N / 4 题"）
      await this.page
        .getByText(new RegExp(`第\\s*${i + 1}\\s*/\\s*4\\s*题`))
        .first()
        .waitFor({ state: "visible", timeout: 30_000 });

      // 切到文字输入：
      //   - voiceSupported=true（Chromium）：右上角"改为文字"按钮
      //   - voiceSupported=false（iPhone WebKit / 不支持麦克风）：底部蓝色"文字输入"按钮
      const switchBtn = this.page.getByRole("button", { name: "改为文字" });
      const textOnlyBtn = this.page.getByRole("button", { name: "文字输入" });

      const switchToTextWithRetry = async () => {
        for (let attempt = 0; attempt < 3; attempt++) {
          if ((await switchBtn.count()) > 0) {
            await switchBtn.first().click();
            return;
          }
          if ((await textOnlyBtn.count()) > 0) {
            await textOnlyBtn.first().click();
            return;
          }
          await this.page.waitForTimeout(500);
        }
        // 找不到按钮：可能已经处于 text-input；下游 textarea 等待会兜底
      };
      await switchToTextWithRetry();

      // textarea 出现 → 输入答案 → 点"确认提交"
      const textarea = this.page.locator("textarea").first();
      await textarea.waitFor({ state: "visible", timeout: 10_000 });
      await textarea.fill(answers[i]);

      const confirmBtn = this.page.getByRole("button", {
        name: /确认提交/,
      });
      await confirmBtn.waitFor({ state: "visible", timeout: 5_000 });
      await confirmBtn.click();
    }

    // 全部 4 题答完 → 自动跳 /loading
    await this.page.waitForURL("**/loading", { timeout: 30_000 });
  }

  /**
   * 跳过整段访谈：点顶部"跳过访谈" → 弹窗"跳过"。
   * 跳过后直接跳 /loading（不走 4 题）。
   */
  async skipAll() {
    await this.page
      .getByRole("button", { name: /跳过访谈/ })
      .first()
      .click();
    await this.page
      .getByRole("button", { name: /^跳过$/ })
      .click();
    await this.page.waitForURL("**/loading", { timeout: 15_000 });
  }
}
