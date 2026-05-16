/**
 * 一次性数据迁移脚本：把混在 career-report.db 里的 career-nav 历史数据搬到独立的 career-nav.db。
 *
 * 起因：career-nav 早期开发时和 career-report 共用 data/career-report.db。
 * 现在拆库（V1 整合 plan，T2 ATTACH DATABASE 架构），需要把这部分数据物理搬出。
 *
 * 启发式：career-nav 的 finalize 必写 uuid (randomUUID)，career-report 老 schema 没 uuid 字段。
 * 所以 `WHERE uuid IS NOT NULL` 的行 = career-nav 的报告。
 *
 * 用法：
 *   # 必须先停掉两侧 dev/prod 进程，避免迁移期间有写入丢失
 *   # 然后在 career-nav 项目根目录跑：
 *   npx tsx scripts/migrate-extract-nav-data.ts
 *
 *   # 可选参数（默认指向 ../career-report/data/career-report.db）：
 *   SOURCE_DB=/path/to/career-report.db TARGET_DB=/path/to/career-nav.db npx tsx scripts/migrate-extract-nav-data.ts
 *
 *   # 仅审计不动数据：
 *   DRY_RUN=1 npx tsx scripts/migrate-extract-nav-data.ts
 *
 * 回滚：备份文件以 .backup-{timestamp} 形式保留在 source 旁边。
 * 回滚 = cp 备份 覆盖 source + rm target，再启服。
 */

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const ROOT = path.resolve(__dirname, "..");
const DEFAULT_SOURCE = path.resolve(ROOT, "..", "career-report", "data", "career-report.db");
const DEFAULT_TARGET = path.resolve(ROOT, "data", "career-nav.db");

const SOURCE_DB = process.env.SOURCE_DB ?? DEFAULT_SOURCE;
const TARGET_DB = process.env.TARGET_DB ?? DEFAULT_TARGET;
const DRY_RUN = process.env.DRY_RUN === "1";

function log(...args: unknown[]) {
  console.log("[migrate]", ...args);
}

function fail(msg: string): never {
  console.error("[migrate] ERROR:", msg);
  process.exit(1);
}

// ---------- 前置检查 ----------
if (!fs.existsSync(SOURCE_DB)) {
  log(`source DB 不存在: ${SOURCE_DB}`);
  log("如果 career-nav 从未与 career-report 共用数据库，那本次迁移无事可做。退出。");
  process.exit(0);
}

// 1. 备份 source DB
const ts = new Date().toISOString().replace(/[:.]/g, "-");
const backupPath = `${SOURCE_DB}.backup-${ts}`;
if (!DRY_RUN) {
  fs.copyFileSync(SOURCE_DB, backupPath);
  log(`备份 source DB → ${backupPath}`);
} else {
  log(`[DRY_RUN] 跳过备份（生产应跑：cp ${SOURCE_DB} ${backupPath}）`);
}

// 2. 打开 source DB（只读优先，但 DELETE 步骤需要写权限）
const sourceDb = new Database(SOURCE_DB);
sourceDb.pragma("busy_timeout = 5000");

// 检查 uuid 列是否存在（如果 career-nav 从未 ALTER 过 source schema，可能没有这列）
const sourceCols = (sourceDb.prepare("PRAGMA table_info(reports)").all() as Array<{ name: string }>).map(c => c.name);
const hasUuidCol = sourceCols.includes("uuid");

if (!hasUuidCol) {
  log("source DB 的 reports 表没有 uuid 列 —— 说明 career-nav 从未对它做 ALTER。无事可做，退出。");
  sourceDb.close();
  process.exit(0);
}

// 3. 审计：数 uuid IS NOT NULL 行
const auditCount = (sourceDb.prepare("SELECT COUNT(*) AS c FROM reports WHERE uuid IS NOT NULL").get() as { c: number }).c;
log(`source DB 中 uuid IS NOT NULL 行数：${auditCount}`);

if (auditCount === 0) {
  log("没有 career-nav 数据要迁移，退出。");
  sourceDb.close();
  process.exit(0);
}

// CEO 评审挖出的红线：如果数量异常大（> 100），可能 source 历史也写过 uuid，启发式失败。
// 由用户自行确认。
if (auditCount > 100) {
  log(`⚠️  WARNING: uuid IS NOT NULL 行数较多（${auditCount}），请人工确认这些都是 career-nav 的数据。`);
  log("    如果 career-report 历史上也写过 uuid，这个启发式会误把它们标成 nav 数据。");
  if (!DRY_RUN && process.env.FORCE !== "1") {
    log("    阻塞退出。确认无误后用 FORCE=1 跳过此检查重跑。");
    sourceDb.close();
    process.exit(2);
  }
}

// 4. 取出所有 nav 行
const navRows = sourceDb
  .prepare("SELECT * FROM reports WHERE uuid IS NOT NULL ORDER BY id ASC")
  .all() as Record<string, unknown>[];
log(`已读取 ${navRows.length} 行待迁移`);

// 5. 打开 target DB（确保目录存在）
fs.mkdirSync(path.dirname(TARGET_DB), { recursive: true });
const targetDb = new Database(TARGET_DB);
targetDb.pragma("journal_mode = WAL");
targetDb.pragma("busy_timeout = 5000");

// target 必须已经有表（career-nav 第一次启动时 lib/db.ts 会建）
// 如果还没建，临时跑一遍建表 SQL（和 lib/db.ts 保持一致）
const targetTables = targetDb
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='reports'")
  .all() as Array<{ name: string }>;

if (targetTables.length === 0) {
  log("target DB 还没有 reports 表，自动建表（保持与 lib/db.ts 一致）");
  targetDb.exec(`
    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at INTEGER NOT NULL,
      uuid TEXT UNIQUE,
      user_identity TEXT,
      target_position TEXT NOT NULL,
      target_education TEXT,
      target_company TEXT,
      target_city_tier TEXT,
      has_resume INTEGER DEFAULT 0,
      resume_filename TEXT,
      resume_storage_path TEXT,
      report_storage_path TEXT,
      sections_status TEXT,
      ip TEXT,
      user_agent TEXT,
      duration_ms INTEGER,
      form_data_json TEXT,
      quiz_answers_json TEXT,
      scoring_json TEXT,
      interview_q1q2_json TEXT,
      report_json TEXT,
      status TEXT DEFAULT 'completed'
    );
    CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_reports_uuid ON reports(uuid);
  `);
}

// 6. 列对齐：target 列名 ∩ source 列名（target 应该是 source 的超集或相同集，因为 ALTER 是 career-nav 加的）
const targetCols = (targetDb.prepare("PRAGMA table_info(reports)").all() as Array<{ name: string }>).map(c => c.name);
const sharedCols = sourceCols.filter(c => targetCols.includes(c) && c !== "id");

log(`列映射：${sharedCols.length} 列共有（不含 id）`);

// 7. 插入到 target（事务性）
const placeholders = sharedCols.map(() => "?").join(", ");
const colList = sharedCols.join(", ");
const insertStmt = targetDb.prepare(`INSERT INTO reports (${colList}) VALUES (${placeholders})`);

const insertTx = targetDb.transaction(() => {
  for (const row of navRows) {
    const values = sharedCols.map(c => row[c] ?? null);
    insertStmt.run(...values);
  }
});

if (!DRY_RUN) {
  insertTx();
  log(`已插入 ${navRows.length} 行到 target DB`);
} else {
  log(`[DRY_RUN] 跳过插入。会插入 ${navRows.length} 行到 ${TARGET_DB}`);
}

// 8. 从 source DB 删除
if (!DRY_RUN) {
  const result = sourceDb.prepare("DELETE FROM reports WHERE uuid IS NOT NULL").run();
  log(`已从 source DB 删除 ${result.changes} 行（应等于 ${auditCount}）`);
  if (result.changes !== auditCount) {
    fail(`删除行数与审计不符：${result.changes} ≠ ${auditCount}。请检查备份恢复！`);
  }
} else {
  log(`[DRY_RUN] 跳过 source DELETE`);
}

// 9. 校验
const targetCount = (targetDb.prepare("SELECT COUNT(*) AS c FROM reports").get() as { c: number }).c;
const sourceRemainingNav = (sourceDb.prepare("SELECT COUNT(*) AS c FROM reports WHERE uuid IS NOT NULL").get() as { c: number }).c;
const sourceTotal = (sourceDb.prepare("SELECT COUNT(*) AS c FROM reports").get() as { c: number }).c;

log("---- 校验结果 ----");
log(`target DB 总行数：${targetCount}`);
log(`source DB 总行数：${sourceTotal}`);
log(`source DB 残余 uuid 行：${sourceRemainingNav}`);

if (!DRY_RUN && sourceRemainingNav !== 0) {
  fail(`source DB 还有 ${sourceRemainingNav} 行 uuid 数据，删除不完整！备份在 ${backupPath}`);
}

sourceDb.close();
targetDb.close();

log("---- 完成 ----");
if (!DRY_RUN) {
  log(`备份保留在：${backupPath}`);
  log("回滚：cp 上述备份 覆盖 source + rm target，重启两侧服务");
}
