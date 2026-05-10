import type { Page } from "@playwright/test";

export class HomePage {
  constructor(private page: Page) {}

  /** 进入首页并点击主 CTA「开始职业分析」，跳转到 /form */
  async gotoStart() {
    await this.page.goto("/");
    // "开始职业分析" 在 hero 区和 MobileStickyCTA 里各出现一次，取第一个
    await this.page
      .getByRole("link", { name: /开始职业分析/ })
      .first()
      .click();
    await this.page.waitForURL("**/form");
  }
}
