import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E 测试配置
 *
 * 三个 project：
 *   - Desktop Chrome
 *   - iPhone 14  （WebKit，逼近 iOS Safari，Windows 上唯一免 Mac 方案）
 *   - Pixel 7    （Chromium + 移动 UA / 触控）
 *
 * webServer 自动启动 dev server，并注入 E2E_MOCK_MODE=true，
 * 让所有 LLM API 路由直接返回 lib/mocks/report-mocks.ts 里的数据，不消耗 API 额度。
 *
 * 真机调试指南：docs/mobile-testing.md
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // 单 dev server 顺序执行，避免并发压垮进程
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1, // 本地单 dev server 顺序跑；CI 同理
  timeout: 120_000, // 单测 2 分钟（mock 下每测 ~20-40s）
  reporter: [["html", { open: "never" }], ["list"]],

  use: {
    baseURL: "http://localhost:3000",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "Desktop Chrome",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      // WebKit binary for Windows — Microsoft 编译版，覆盖 ~90% iOS Safari 行为
      // 注意：WebKit 不支持 Chromium 的 permissions: ['microphone']
      name: "iPhone 14",
      use: { ...devices["iPhone 14"] },
    },
    {
      name: "Pixel 7",
      use: {
        ...devices["Pixel 7"],
        permissions: ["microphone"],
        launchOptions: {
          // 让麦克风权限 UI 不弹系统对话框（Chromium 专属 flag）
          args: [
            "--use-fake-ui-for-media-stream",
            "--use-fake-device-for-media-stream",
          ],
        },
      },
    },
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...(process.env as Record<string, string>),
      E2E_MOCK_MODE: "true",
    },
  },
});
