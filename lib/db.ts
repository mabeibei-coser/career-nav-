import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DATA_DIR = path.resolve(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "career-report.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(path.join(DATA_DIR, "reports"), { recursive: true });
  fs.mkdirSync(path.join(DATA_DIR, "resumes"), { recursive: true });
  fs.mkdirSync(path.join(DATA_DIR, "temp"), { recursive: true });
  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.exec(`
    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at INTEGER NOT NULL,
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
      duration_ms INTEGER
    )
  `);
  _db.exec(
    `CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC)`
  );
  return _db;
}
