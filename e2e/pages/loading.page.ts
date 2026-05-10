import type { Page } from "@playwright/test";

export class LoadingPage {
  constructor(private page: Page) {}

  /**
   * 等 5 模块全部 resolve 后跳 /report。
   * E2E_MOCK_MODE 下所有 section API 即时返回，通常 <5s 完成；给 90s 顶配。
   */
  async waitForReport(timeout = 90_000) {
    await this.page.waitForURL("**/report", { timeout });
  }
}
