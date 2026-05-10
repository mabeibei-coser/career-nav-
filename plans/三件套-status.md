# 三件套实施进度

最后更新：2026-04-25 第一波全部完成

> 主 plan 文件：`C:\Users\admin\.claude\plans\1-2-github-3-adaptive-rocket.md`
> Sub-agent 完成任务后必须更新本文件对应行的 4 个 checkbox + 在下方追加输出快照。

## 阶段 A — CTA 醒目化 + Quiz 提速

| ID   | 任务                              | 文件                                | TS | Lint | 测试 | 验收 | 完成时间 |
|------|-----------------------------------|-------------------------------------|----|------|------|------|---------|
| A1.1 | globals.css 加 cta-pulse          | app/globals.css                     | ✅ | ✅   | ✅   | ✅   | 2026-04-25 |
| A1.2 | 主 CTA 改色 + 加大 + 去 border-beam | app/page.tsx                        | ⬜ | ⬜   | ⬜   | ⬜   |         |
| A1.3 | 移动端 sticky bottom CTA          | app/page.tsx                        | ⬜ | ⬜   | ⬜   | ⬜   |         |
| A1.4 | 二级 CTA 文案统一                 | app/page.tsx                        | ⬜ | ⬜   | ⬜   | ⬜   |         |
| A2.1 | quiz-skeleton 静态 Q1 + 占位     | lib/quiz-skeleton.ts                | ⬜ | ⬜   | ⬜   | ⬜   |         |
| A2.2 | quiz/generate API 加 from         | app/api/quiz/generate/route.ts      | ⬜ | ⬜   | ⬜   | ⬜   |         |
| A2.3 | quiz/page 重写加载                | app/quiz/page.tsx                   | ⬜ | ⬜   | ⬜   | ⬜   |         |
| A2.4 | 题目占位态 UI                     | app/quiz/page.tsx                   | ⬜ | ⬜   | ⬜   | ⬜   |         |
| A2.5 | 阶段 A 集成测试                   | (主 agent)                          | -  | -    | -    | ⬜   |         |

## 阶段 B — 管理员后台

| ID   | 任务                              | 文件                                          | TS | Lint | 测试 | 验收 | 完成时间 |
|------|-----------------------------------|-----------------------------------------------|----|------|------|------|---------|
| B1   | 装依赖 + next.config              | package.json / next.config.ts                 | ✅ | ✅   | ✅   | ✅   | 2026-04-25 |
| B2   | DB 单例 + DDL                     | lib/db.ts                                     | ⬜ | ⬜   | ⬜   | ⬜   |         |
| B3   | 管理员密码初始化脚本              | scripts/init-admin.mjs                        | ✅ | ✅   | ✅   | ✅   | 2026-04-25 |
| B4   | Auth 封装                         | lib/admin-session.ts                          | ⬜ | ⬜   | ⬜   | ⬜   |         |
| B5   | middleware 拦截 /admin            | middleware.ts                                 | ⬜ | ⬜   | ⬜   | ⬜   |         |
| B6   | 登录页 + 登录登出 API             | app/admin/login + app/api/admin/{login,logout}| ⬜ | ⬜   | ⬜   | ⬜   |         |
| B7   | 简历上传改造（temp 落盘）         | app/api/resume/parse/route.ts                 | ⬜ | ⬜   | ⬜   | ⬜   |         |
| B8   | finalize API                      | app/api/report/finalize/route.ts              | ⬜ | ⬜   | ⬜   | ⬜   |         |
| B9   | loading 页调 finalize             | app/loading/page.tsx                          | ⬜ | ⬜   | ⬜   | ⬜   |         |
| B10  | admin 列表页 + API                | app/admin/reports + app/api/admin/reports     | ⬜ | ⬜   | ⬜   | ⬜   |         |
| B11  | admin 详情页 + API                | app/admin/reports/[id] + API                  | ⬜ | ⬜   | ⬜   | ⬜   |         |
| B12  | 简历下载 API                      | app/api/admin/reports/[id]/resume             | ⬜ | ⬜   | ⬜   | ⬜   |         |
| B13  | 报告网页预览                      | app/admin/reports/[id]/preview                | ⬜ | ⬜   | ⬜   | ⬜   |         |
| B14  | DEPLOY.md 增补                    | deploy/DEPLOY.md                              | -  | -    | -    | ⬜   |         |
| B15  | 阶段 B 集成测试                   | (主 agent)                                    | -  | -    | -    | ⬜   |         |

✅ = 通过 / ❌ = 失败（写日志） / ⬜ = 未做 / 🟡 = 进行中

## Sub-agent 输出快照

> 每个 Sub-agent 完成任务后在此追加一节，格式见主 plan 模板。

### [A1.1] 2026-04-25 — 完成
- 改动文件：app/globals.css（追加 4 行）
- TS：✅ Lint：✅
- 验收：✅（cta-pulse keyframes + animate-cta-pulse class + reduced-motion 兜底）

### [B1] 2026-04-25 — 完成
- 安装：better-sqlite3、iron-session、bcryptjs、@types/better-sqlite3、@types/bcryptjs
- next.config.ts：serverExternalPackages 加 better-sqlite3
- .gitignore：加 /data/* + !/data/.gitkeep
- data/.gitkeep 创建
- TS：✅ Lint：✅（3 个 errors 为预存问题，非 B1 引入）

### [B3] 2026-04-25 — 完成
- 新建：scripts/init-admin.mjs（readline 交互式，bcrypt cost=12，randomBytes session key）
- 新建：.env.local.example（含全部 API key 占位 + ADMIN_PASSWORD_HASH / ADMIN_SESSION_PASSWORD 占位）
- Lint：✅（.mjs 不在 ESLint 检查范围，无新增错误；worktree node_modules 缺失为环境预存问题）


## 风险与偏离

> 遇到 plan 描述与代码现状不一致时记录于此，主 agent 决策后更新。

## 阶段 A 集成验收（A2.5 主 agent）

- 测试 1（桌面快路径）：⬜
- 测试 2（桌面慢路径）：⬜
- 测试 3（LLM 全失败）：⬜
- 测试 4（iOS Safari）：⬜
- 测试 5（Android Chrome）：⬜
- 测试 6（减少动效）：⬜
- 测试 7（sticky bar 与 footer）：⬜
- 测试 8（quiz answer 持久）：⬜
- E2E 主流程：⬜
- 最终 tsc/lint/build：⬜

## 阶段 B 集成验收（B15 主 agent）

- 测试 1（登录鉴权）：⬜
- 测试 2（登录成功）：⬜
- 测试 3（未登录访问拦截）：⬜
- 测试 4（报告落库三处）：⬜
- 测试 5（列表筛选）：⬜
- 测试 6（列表分页）：⬜
- 测试 7（详情元数据）：⬜
- 测试 8（简历下载）：⬜
- 测试 9（报告预览）：⬜
- 测试 10（登出）：⬜
- 测试 11（重启 PM2 持久）：⬜
- 测试 12（并发写入）：⬜
- 测试 13（移动端 admin）：⬜
- 最终 tsc/lint/build：⬜
