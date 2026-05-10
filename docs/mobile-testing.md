# 移动端测试指南

## 一、日常用法

```bash
# 跑全部 project（Desktop Chrome + iPhone 14 + Pixel 7）
npm run test:e2e

# 只跑移动端（交付前必须通过）
npm run test:e2e:mobile

# 交互式调试（可单步执行、看截图）
npm run test:e2e:ui

# 查看最近一次 HTML 报告
npm run test:e2e:report
```

**首次安装浏览器二进制（~600 MB，只需运行一次）：**

```bash
npm run playwright:install
```

如果下载慢（国内网络），在 Git Bash 里先 export mirror 再运行：

```bash
PLAYWRIGHT_DOWNLOAD_HOST=https://npmmirror.com/mirrors/playwright npm run playwright:install
```

---

## 二、测试覆盖范围说明

| 场景 | Desktop Chrome | iPhone 14 (WebKit) | Pixel 7 (Chromium) | 真机抽查 |
|---|:-:|:-:|:-:|:-:|
| 首页加载 | ✅ | ✅ | ✅ | – |
| 4 字段表单填写 | ✅ | ✅ | ✅ | – |
| 简历上传 PDF | ✅ | ✅ | ✅ | – |
| 6 题 quiz 答题 | ✅ | ✅ | ✅ | – |
| 报告 5/6 个章节渲染 | ✅ | ✅ | ✅ | – |
| PDF 导出 | ✅ | ⚠️ 跳过 | ⚠️ 跳过 | iPhone Safari ✅ |
| input font-size ≥16px | – | ✅ | ✅ | – |
| 触控目标 ≥44px | – | ✅ | ✅ | – |
| 录音编解码正确性 | ❌ | ❌ | ❌ | **必须真机** |
| 微信内置浏览器 | ❌ | ❌ | ❌ | **必须真机** |

---

## 三、iPhone 真机 USB 调试（5 步）

> 需要：iPhone + USB 线 + 电脑上的 Git Bash

1. **iPhone**：设置 → Safari → 高级 → 打开「Web 检查器」
2. **iPhone**：用 USB 线连接电脑，在 iPhone 上弹出的对话框选「信任」
3. **电脑**：安装 [ios-safari-remote-debug-kit](https://github.com/HimbeersaftLP/ios-safari-remote-debug-kit)（按 README 里 Windows 步骤）
4. 运行 `start.ps1`（或按 README 里的启动命令）
5. 浏览器访问 `http://localhost:9222`，即可看到 iPhone Safari 当前标签页的 DevTools

调试场景示例：
- 开发机 `npm run dev` → iPhone Safari 访问 `http://[电脑局域网IP]:3000`
- 在 DevTools Console 检查录音权限是否获取
- 在 Network 面板看 API 请求实际耗时

---

## 四、Android 真机 USB 调试（3 步）

1. **Android 手机**：设置 → 关于手机 → 连续点击「版本号」7 次 → 开发者选项 → 打开「USB 调试」
2. USB 连接电脑，手机弹出对话框选「允许」
3. 电脑 Chrome 地址栏输入 `chrome://inspect/#devices`，看到设备后点「inspect」

---

## 五、能力边界（Playwright 抓不到的问题）

### ✅ Playwright 覆盖得到
- 页面布局、文字截断、颜色对比
- input/textarea 字号（≥16px 防缩放）
- 按钮触控目标大小
- 表单交互（填写、选择、提交）
- 所有 section 是否渲染、data-pdf-section 属性
- PDF 导出按钮（Desktop Chrome 验证下载文件）
- sessionStorage 状态机正确流转

### ⚠️ 半覆盖
- 麦克风权限弹窗：Chromium 可用 `--use-fake-ui-for-media-stream` 跳过；WebKit 受限
- PDF 导出在 iOS WebKit：可点击，但 Safari 的下载行为需真机验证

### ❌ 必须真机
- **webm/opus 真实编解码**：Playwright 的 fake media stream 不生成真实音频帧
- **讯飞 ASR 转写准确率**：依赖真实音频字节流
- **微信 WebView（MicroMessenger UA）**：Playwright 无法模拟微信内置浏览器环境
- **iOS 系统权限弹窗动画**：如麦克风授权弹出时机
- **真实蜂窝网络延迟**：Wi-Fi 下跑通不代表 5G/4G 正常

---

## 六、常见问题排查

**Q：`npm run playwright:install` 下载卡住**
```bash
# 换 npmmirror 镜像
PLAYWRIGHT_DOWNLOAD_HOST=https://npmmirror.com/mirrors/playwright npm run playwright:install
# 或手动清缓存后重试
npx playwright install --force
```

**Q：webServer 启动超时（120s）**
- 检查 3000 端口是否被占用：`netstat -aon | findstr ":3000"`
- 手动先跑 `E2E_MOCK_MODE=true npm run dev` 确认能正常启动

**Q：test:e2e:mobile 报错 "No tests found"**
- 检查 `e2e/specs/mobile-specifics.spec.ts` 的 `test.skip` 条件是否正确
- 用 `--project "iPhone 14"` 显式指定 project

**Q：quiz 测试在 Q3 卡住（options 一直 loading）**
- 确认 dev server 启动时确实有 `E2E_MOCK_MODE=true` 环境变量
- 在 dev server 终端搜索 `[quiz] E2E mock` 看有没有日志
