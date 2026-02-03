import Database from "better-sqlite3";
import path from "path";
import { existsSync, mkdirSync, readdirSync, readFileSync } from "fs";
import { fileURLToPath } from "url";

const DEFAULT_DB_FILENAME = "studio-cockpit.db";
const MIGRATIONS_TABLE = "schema_migrations";

let db: Database.Database | null = null;
let cachedPath = "";

const moduleDir =
  typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

export function getDbPath() {
  return (
    process.env.STUDIO_COCKPIT_DB_PATH ||
    path.join(process.cwd(), "data", DEFAULT_DB_FILENAME)
  );
}

function ensureDbDir(dbPath: string) {
  mkdirSync(path.dirname(dbPath), { recursive: true });
}

function getMigrationsDir() {
  const candidates = [
    process.env.STUDIO_COCKPIT_MIGRATIONS_PATH,
    path.join(process.cwd(), "src", "lib", "db", "migrations"),
    path.join(process.cwd(), "lib", "db", "migrations"),
    path.join(moduleDir, "migrations"),
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }

  return path.join(process.cwd(), "src", "lib", "db", "migrations");
}

type Migration = {
  id: string;
  order: number;
  sql: string;
};

function loadMigrations(): Migration[] {
  const migrationsDir = getMigrationsDir();
  if (!existsSync(migrationsDir)) return [];
  const files = readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));

  return files
    .map((file) => {
      const id = file.replace(/\.sql$/, "");
      const match = id.match(/^(\d+)/);
      const order = match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
      const sql = readFileSync(path.join(migrationsDir, file), "utf-8");
      return { id, order, sql };
    })
    .sort((a, b) => (a.order !== b.order ? a.order - b.order : a.id.localeCompare(b.id)));
}

function ensureMigrationsTable(dbInstance: Database.Database) {
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);
}

function applyMigrations(dbInstance: Database.Database) {
  ensureMigrationsTable(dbInstance);
  const migrations = loadMigrations();
  if (migrations.length === 0) return;

  const appliedRows = dbInstance
    .prepare(`SELECT id FROM ${MIGRATIONS_TABLE}`)
    .all() as { id: string }[];
  const applied = new Set(appliedRows.map((row) => row.id));
  const insert = dbInstance.prepare(
    `INSERT INTO ${MIGRATIONS_TABLE} (id, applied_at) VALUES (@id, @appliedAt)`
  );
  const now = new Date().toISOString();

  const transaction = dbInstance.transaction(() => {
    for (const migration of migrations) {
      if (applied.has(migration.id)) continue;
      dbInstance.exec(migration.sql);
      insert.run({ id: migration.id, appliedAt: now });
    }
  });

  transaction();
  const latestVersion = Math.max(
    ...(migrations.map((migration) => migration.order).filter(Number.isFinite) as number[])
  );
  if (Number.isFinite(latestVersion) && latestVersion > 0) {
    dbInstance.pragma(`user_version = ${latestVersion}`);
  }
}

export function getDb() {
  const dbPath = getDbPath();
  if (db && cachedPath === dbPath) return db;
  if (db) db.close();
  ensureDbDir(dbPath);
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  applyMigrations(db);
  cachedPath = dbPath;
  return db;
}
