import Database from "better-sqlite3";
import path from "path";
import { mkdirSync } from "fs";

const DEFAULT_DB_FILENAME = "studio-cockpit.db";

let db: Database.Database | null = null;
let cachedPath = "";

export function getDbPath() {
  return (
    process.env.STUDIO_COCKPIT_DB_PATH ||
    path.join(process.cwd(), "data", DEFAULT_DB_FILENAME)
  );
}

function ensureDbDir(dbPath: string) {
  mkdirSync(path.dirname(dbPath), { recursive: true });
}

function migrate(dbInstance: Database.Database) {
  const version = dbInstance.pragma("user_version", { simple: true }) as number;
  if (version >= 1) return;

  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      status TEXT NOT NULL,
      primary_contact TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      rate_per_hour REAL NOT NULL,
      tags TEXT NOT NULL,
      last_contact_at TEXT NOT NULL,
      next_session_at TEXT,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS client_projects (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      name TEXT NOT NULL,
      status TEXT NOT NULL,
      protools_project_id TEXT,
      due_date TEXT,
      last_session_at TEXT,
      total_logged_minutes INTEGER NOT NULL,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS client_sessions (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      project_id TEXT,
      type TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      billable_rate REAL,
      notes TEXT,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
      FOREIGN KEY (project_id) REFERENCES client_projects(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS client_tasks (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      project_id TEXT,
      title TEXT NOT NULL,
      status TEXT NOT NULL,
      due_at TEXT,
      assignee TEXT,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
      FOREIGN KEY (project_id) REFERENCES client_projects(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS client_correspondence (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      channel TEXT NOT NULL,
      direction TEXT NOT NULL,
      subject TEXT NOT NULL,
      summary TEXT NOT NULL,
      occurred_at TEXT NOT NULL,
      participants TEXT NOT NULL,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS session_stats_sessions (
      id TEXT NOT NULL,
      fingerprint TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      artist TEXT,
      project TEXT,
      path TEXT,
      created_at TEXT,
      updated_at TEXT,
      sample_rate INTEGER,
      bit_depth INTEGER,
      bpm REAL,
      key TEXT,
      duration_seconds INTEGER,
      notes TEXT,
      tags TEXT NOT NULL,
      tracks TEXT NOT NULL,
      plugins TEXT NOT NULL,
      sources TEXT
    );

    CREATE TABLE IF NOT EXISTS session_stats_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_client_projects_client ON client_projects(client_id);
    CREATE INDEX IF NOT EXISTS idx_client_sessions_client ON client_sessions(client_id);
    CREATE INDEX IF NOT EXISTS idx_client_sessions_project ON client_sessions(project_id);
    CREATE INDEX IF NOT EXISTS idx_client_tasks_client ON client_tasks(client_id);
    CREATE INDEX IF NOT EXISTS idx_client_tasks_project ON client_tasks(project_id);
    CREATE INDEX IF NOT EXISTS idx_client_correspondence_client ON client_correspondence(client_id);
    CREATE INDEX IF NOT EXISTS idx_session_stats_name ON session_stats_sessions(name);
  `);

  dbInstance.pragma("user_version = 1");
}

export function getDb() {
  const dbPath = getDbPath();
  if (db && cachedPath === dbPath) return db;
  if (db) db.close();
  ensureDbDir(dbPath);
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  cachedPath = dbPath;
  return db;
}
