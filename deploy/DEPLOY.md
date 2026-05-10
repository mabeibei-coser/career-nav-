# 腾讯云 CVM 部署指引 — career-nav

目标：在与 career-report 同一台 CVM 上，以子路径 `/a300` 部署。
访问地址：`https://h100.jsai100.com/a300`
career-nav 端口：**3001**（career-report 占 3000，互不冲突）

---

## 一次性准备（career-report 已跑通则跳过）

```bash
# Node 20、pm2、中文字体、Puppeteer 系统依赖——参考 career-report 的部署文档
# 如果是同一台机器，直接跳到"部署应用"
```

---

## 首次部署

```bash
# 拉代码
cd /var/www
git clone https://github.com/<your-repo>/career-nav.git
cd career-nav

# 配置生产环境变量
cp deploy/env.production.example .env.production.local
vim .env.production.local
# 填入：DEEPSEEK_API_KEY / IFLYTEK_API_KEY / VOLC_TTS_APP_KEY / VOLC_TTS_ACCESS_KEY / SESSION_SECRET
# NEXT_PUBLIC_BASE_PATH=/a300 已在模板中，不要删除

# 安装依赖（跳过 Chromium 下载，国内网络不稳定）
PUPPETEER_SKIP_DOWNLOAD=true npm ci

# 构建（NEXT_PUBLIC_BASE_PATH 在构建时内嵌到 client bundle）
npm run build

# 建日志目录
mkdir -p logs

# pm2 启动（进程名 career-nav，端口 3001）
pm2 start ecosystem.config.js
pm2 save
```

验证：`curl -I http://127.0.0.1:3001/a300` 应返回 200。

---

## 配置 Nginx 子路径代理

在 h100.jsai100.com 的 HTTPS server block（`/etc/nginx/conf.d/h100.conf` 或类似文件）内追加：

```nginx
# 参照 deploy/nginx.conf.example 里的两个 location 块
# 1. /a300/_next/  — 静态资源（strip /a300 前缀）
# 2. /a300         — 页面 + API
```

```bash
# 追加配置后验证并热重载
sudo nginx -t && sudo systemctl reload nginx
```

验证：`curl -I https://h100.jsai100.com/a300` 应返回 200。

---

## 后续更新

```bash
cd /var/www/career-nav
git pull
PUPPETEER_SKIP_DOWNLOAD=true npm ci
npm run build
pm2 restart career-nav
```

---

## 生成 SESSION_SECRET

```bash
openssl rand -base64 32
```

粘贴到 `.env.production.local` 的 `SESSION_SECRET=` 后面。

---

## 常用 pm2 命令

```bash
pm2 status
pm2 logs career-nav          # 查实时日志
pm2 logs career-nav --err    # 只看错误
pm2 restart career-nav
pm2 stop career-nav
```

---

## 故障排查

- **`curl 127.0.0.1:3001/a300` 404**：确认 `NEXT_PUBLIC_BASE_PATH=/a300` 在 `.env.production.local` 且构建时已生效（重新 `npm run build`）
- **静态资源 404**：nginx `_next` location 的 rewrite 是否正确 strip 了 `/a300` 前缀？
- **API 请求 404**：PM2 logs 里有没有收到请求？没有说明 nginx 还在把请求路由到 career-report（3000）
- **AI 返回 mock**：检查 `.env.production.local` 里 `DEEPSEEK_API_KEY` 是否正确；`pm2 logs career-nav` 里找 "fallback" 字样
- **端口被占**：`ss -tlnp | grep 3001`
