import bcrypt from "bcryptjs";
import crypto from "crypto";
import readline from "readline";

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function question(prompt) {
  return new Promise((resolve) => rl.question(prompt, resolve));
}

async function main() {
  console.log("=== 管理员密码初始化 ===\n");

  let password;
  while (true) {
    password = await question("请输入管理员密码（至少 8 位）: ");
    if (password.length < 8) {
      console.log("密码至少 8 位，请重试。\n");
      continue;
    }
    const confirm = await question("再输一次确认: ");
    if (password !== confirm) {
      console.log("两次输入不一致，请重试。\n");
      continue;
    }
    break;
  }

  console.log("\n正在生成 bcrypt hash（cost=12，约需 2-3 秒）...");
  const hash = await bcrypt.hash(password, 12);
  // Base64-encode the hash to avoid dotenv $ expansion issues in .env.local
  const hashB64 = Buffer.from(hash).toString("base64");
  const sessionPwd = crypto.randomBytes(24).toString("base64url");

  console.log("\n=== 请将以下两行复制到 .env.local ===\n");
  console.log(`ADMIN_PASSWORD_HASH=${hashB64}`);
  console.log(`ADMIN_SESSION_PASSWORD=${sessionPwd}`);
  console.log("\n======================================");

  rl.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
