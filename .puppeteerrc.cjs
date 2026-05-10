// 国内 npmmirror 镜像 —— Chromium 从 Google CDN 下载极慢 / 经常超时
// 注：必须嵌套在 chrome 和 chrome-headless-shell 下，顶层 downloadBaseUrl 不生效
const MIRROR = "https://cdn.npmmirror.com/binaries/chrome-for-testing";

module.exports = {
  chrome: { downloadBaseUrl: MIRROR },
  "chrome-headless-shell": { downloadBaseUrl: MIRROR },
};
