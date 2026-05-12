import type { Page } from "@playwright/test";

type SJTChoice = "A" | "B" | "C" | "D";

export class QuizPage {
  constructor(private page: Page) {}

  /**
   * 依次回答 8 道 SJT 情境判断题（每题选 A/B/C/D）。
   * 中间题 400ms 自动跳下题；最后一题不跳，需手动点"提交并进入访谈"。
   *
   * 关键时序点：
   *   - AnimatePresence mode="wait"：当前题 exit 动画完成后，下一题才挂载
   *   - 顶栏 "i / total" 在 currentIndex 变化的瞬间就更新，不能作为
   *     "下一题已挂载"的信号
   *   - 因此：每次 click 后等"已完成 N/total"计数变化，然后等下一题的 Q 徽标出现。
   *
   * @param choices 8 个 A/B/C/D 选项
   */
  async answerAll(choices: SJTChoice[]) {
    const total = choices.length;
    await this.page
      .locator("text=/^Q1$/")
      .first()
      .waitFor({ state: "visible", timeout: 30_000 });

    for (let i = 0; i < total; i++) {
      const choice = choices[i];

      await this.page
        .locator(`text=/^Q${i + 1}$/`)
        .first()
        .waitFor({ state: "visible", timeout: 30_000 });

      await this.page.waitForTimeout(250);

      const optionBtn = this.page
        .getByRole("button", { name: new RegExp(`^选项 ${choice}`) })
        .last();
      await optionBtn.waitFor({ state: "visible", timeout: 10_000 });
      await optionBtn.click();

      await this.page
        .getByText(new RegExp(`已完成\\s*${i + 1}\\s*/\\s*${total}`))
        .first()
        .waitFor({ state: "visible", timeout: 10_000 });
    }

    const submitBtn = this.page.getByRole("button", {
      name: "提交并进入访谈",
    });
    await submitBtn.waitFor({ state: "visible", timeout: 10_000 });
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
    await this.page.waitForURL(/\/interview/, { timeout: 30_000 });
  }
}
