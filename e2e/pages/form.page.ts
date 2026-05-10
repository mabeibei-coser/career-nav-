import type { Page } from "@playwright/test";

export interface FormData {
  /** 身份选择 */
  identity: "graduate" | "jobseeker";
  /** 目标岗位（自由文本） */
  targetPosition: string;
  /** 学历，使用 EDUCATION_OPTIONS value：high_school / junior_college / bachelor / master / phd / other */
  education: string;
  /** 工作年限，使用 WORK_YEARS_OPTIONS value：none / lt1 / 1to3 / 3to5 / 5to10 / gt10 */
  workYears: string;
  /** 可选：上传简历的文件名（fixture，E2E_MOCK_MODE 下跳过真实解析） */
  resumeFileName?: string;
}

const IDENTITY_LABELS: Record<FormData["identity"], string> = {
  graduate: "应届毕业生",
  jobseeker: "求职/失业中",
};

const EDUCATION_LABELS: Record<string, string> = {
  high_school: "高中及以下",
  junior_college: "大专",
  bachelor: "本科",
  master: "硕士",
  phd: "博士",
  other: "其他",
};

const WORK_YEARS_LABELS: Record<string, string> = {
  none: "无工作经验",
  lt1: "1 年以内",
  "1to3": "1-3 年",
  "3to5": "3-5 年",
  "5to10": "5-10 年",
  gt10: "10 年以上",
};

export class FormPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto("/form");
  }

  /**
   * 填写表单 4 个必填字段（+ 可选简历）。
   * 注意：identity 是双卡片按钮，targetPosition 是 input，education/workYears 是 @base-ui/react Select。
   */
  async fill(data: FormData) {
    // 1. identity 双卡片按钮：accessible name = "标题 描述" 拼接，所以匹配描述里的关键短语
    const idDescriptionFragment =
      data.identity === "graduate" ? "在校大学生" : "已离开学校";
    await this.page
      .locator(`button:has-text("${idDescriptionFragment}")`)
      .first()
      .click();

    // 2. targetPosition input
    await this.page.locator("#targetPosition").fill(data.targetPosition);

    // 3. education Select：点 trigger → 等 popup → 点选项
    await this.page.locator("#education").click();
    const educationLabel = EDUCATION_LABELS[data.education] ?? data.education;
    await this.page
      .getByRole("option", { name: educationLabel, exact: true })
      .click();

    // 4. workYears Select
    await this.page.locator("#workYears").click();
    const workYearsLabel =
      WORK_YEARS_LABELS[data.workYears] ?? data.workYears;
    await this.page
      .getByRole("option", { name: workYearsLabel, exact: true })
      .click();

    // 5. 可选简历
    if (data.resumeFileName) {
      await this.uploadResume(data.resumeFileName);
    }
  }

  /**
   * 上传简历（模拟 PDF）。
   * E2E_MOCK_MODE 下 /api/resume/parse 直接返回 fixture 文本，无需真实 PDF 内容。
   */
  async uploadResume(fileName = "test-resume.pdf") {
    const fileInput = this.page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: fileName,
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 E2E test resume placeholder"),
    });
    // 等待上传组件显示「已解析」
    await this.page.getByText("已解析").waitFor({ timeout: 15_000 });
  }

  /** 提交表单，等待跳转到 /quiz */
  async submit() {
    await this.page.getByRole("button", { name: "下一步" }).click();
    await this.page.waitForURL("**/quiz", { timeout: 30_000 });
  }
}
