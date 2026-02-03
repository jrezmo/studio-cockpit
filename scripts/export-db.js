const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const DEFAULT_DB_FILENAME = "studio-cockpit.db";

function getDbPath() {
  return (
    process.env.STUDIO_COCKPIT_DB_PATH ||
    path.join(process.cwd(), "data", DEFAULT_DB_FILENAME)
  );
}

function parseJson(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function resolveOutDir(argv) {
  const idx = argv.indexOf("--out-dir");
  if (idx === -1) return path.join(process.cwd(), "data");
  const outDir = argv[idx + 1];
  if (!outDir) return path.join(process.cwd(), "data");
  return path.isAbsolute(outDir) ? outDir : path.join(process.cwd(), outDir);
}

function exportCrm(db) {
  const clients = db
    .prepare("SELECT * FROM clients ORDER BY rowid DESC")
    .all()
    .map((row) => ({
      id: row.id,
      name: row.name,
      status: row.status,
      primaryContact: row.primary_contact,
      email: row.email,
      phone: row.phone ?? undefined,
      ratePerHour: row.rate_per_hour,
      tags: parseJson(row.tags, []),
      lastContactAt: row.last_contact_at ?? "",
      nextSessionAt: row.next_session_at ?? undefined,
      notes: row.notes ?? undefined,
    }));

  const clientProjects = db
    .prepare("SELECT * FROM client_projects ORDER BY rowid DESC")
    .all()
    .map((row) => ({
      id: row.id,
      clientId: row.client_id,
      name: row.name,
      status: row.status,
      protoolsProjectId: row.protools_project_id ?? undefined,
      dueDate: row.due_date ?? undefined,
      lastSessionAt: row.last_session_at ?? undefined,
      totalLoggedMinutes: row.total_logged_minutes,
    }));

  const clientSessions = db
    .prepare("SELECT * FROM client_sessions ORDER BY rowid DESC")
    .all()
    .map((row) => ({
      id: row.id,
      clientId: row.client_id,
      projectId: row.project_id ?? undefined,
      type: row.type,
      startTime: row.start_time,
      endTime: row.end_time,
      durationMinutes: row.duration_minutes,
      billableRate: row.billable_rate ?? undefined,
      notes: row.notes ?? undefined,
    }));

  const clientTasks = db
    .prepare("SELECT * FROM client_tasks ORDER BY rowid DESC")
    .all()
    .map((row) => ({
      id: row.id,
      clientId: row.client_id,
      projectId: row.project_id ?? undefined,
      title: row.title,
      status: row.status,
      dueAt: row.due_at ?? undefined,
      assignee: row.assignee ?? undefined,
    }));

  const clientCorrespondence = db
    .prepare("SELECT * FROM client_correspondence ORDER BY rowid DESC")
    .all()
    .map((row) => ({
      id: row.id,
      clientId: row.client_id,
      channel: row.channel,
      direction: row.direction,
      subject: row.subject,
      summary: row.summary,
      occurredAt: row.occurred_at,
      participants: parseJson(row.participants, []),
    }));

  return {
    clients,
    clientProjects,
    clientSessions,
    clientTasks,
    clientCorrespondence,
  };
}

function exportSessionStats(db) {
  const sessions = db
    .prepare("SELECT * FROM session_stats_sessions ORDER BY updated_at DESC, created_at DESC")
    .all()
    .map((row) => ({
      id: row.id,
      fingerprint: row.fingerprint,
      name: row.name,
      artist: row.artist ?? undefined,
      project: row.project ?? undefined,
      path: row.path ?? undefined,
      createdAt: row.created_at ?? undefined,
      updatedAt: row.updated_at ?? undefined,
      sampleRate: row.sample_rate ?? undefined,
      bitDepth: row.bit_depth ?? undefined,
      bpm: row.bpm ?? undefined,
      key: row.key ?? undefined,
      durationSeconds: row.duration_seconds ?? undefined,
      notes: row.notes ?? undefined,
      tags: parseJson(row.tags, []),
      tracks: parseJson(row.tracks, []),
      plugins: parseJson(row.plugins, []),
      sources: parseJson(row.sources, undefined),
    }));

  const metaRow = db
    .prepare("SELECT value FROM session_stats_meta WHERE key = 'lastIngestedAt'")
    .get();

  return {
    sessions,
    lastIngestedAt: metaRow?.value,
  };
}

function main() {
  const dbPath = getDbPath();
  if (!fs.existsSync(dbPath)) {
    console.error(`Database not found: ${dbPath}`);
    process.exit(1);
  }

  const outDir = resolveOutDir(process.argv.slice(2));
  fs.mkdirSync(outDir, { recursive: true });

  const db = new Database(dbPath, { readonly: true });
  try {
    const crm = exportCrm(db);
    const sessionStats = exportSessionStats(db);

    const crmPath = path.join(outDir, "export-crm.json");
    const statsPath = path.join(outDir, "export-session-stats.json");

    fs.writeFileSync(crmPath, JSON.stringify(crm, null, 2), "utf-8");
    fs.writeFileSync(statsPath, JSON.stringify(sessionStats, null, 2), "utf-8");

    console.log(`Wrote ${crmPath}`);
    console.log(`Wrote ${statsPath}`);
  } finally {
    db.close();
  }
}

main();
