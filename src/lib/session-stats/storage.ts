import { getDb } from "@/lib/db";
import { existsSync, readFileSync } from "fs";
import path from "path";
import { seedSessionStatsData } from "./seed";
import { normalizeSession } from "./utils";
import type { SessionStatsData, SessionStatsSession } from "./types";

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function loadLegacySessionStatsData(): SessionStatsData | null {
  const legacyPath = path.join(process.cwd(), "data", "session-stats.json");
  if (!existsSync(legacyPath)) return null;
  try {
    const raw = readFileSync(legacyPath, "utf-8");
    return JSON.parse(raw) as SessionStatsData;
  } catch {
    return null;
  }
}

function normalizeData(data: SessionStatsData): SessionStatsData {
  const sessions = data.sessions.map((session) => normalizeSession(session));
  return { ...data, sessions };
}

export async function readSessionStatsData(): Promise<SessionStatsData> {
  const db = getDb();
  ensureSeed();

  const sessions = db
    .prepare("SELECT * FROM session_stats_sessions ORDER BY updated_at DESC, created_at DESC")
    .all()
    .map((row) =>
      normalizeSession({
        id: row.id as string,
        fingerprint: row.fingerprint as string,
        name: row.name as string,
        artist: row.artist as string | undefined,
        project: row.project as string | undefined,
        path: row.path as string | undefined,
        createdAt: row.created_at as string | undefined,
        updatedAt: row.updated_at as string | undefined,
        sampleRate: row.sample_rate as number | undefined,
        bitDepth: row.bit_depth as number | undefined,
        bpm: row.bpm as number | undefined,
        key: row.key as string | undefined,
        durationSeconds: row.duration_seconds as number | undefined,
        notes: row.notes as string | undefined,
        tags: parseJson<string[]>(row.tags as string | null, []),
        tracks: parseJson<SessionStatsSession["tracks"]>(
          row.tracks as string | null,
          []
        ),
        plugins: parseJson<SessionStatsSession["plugins"]>(
          row.plugins as string | null,
          []
        ),
        sources: parseJson<SessionStatsSession["sources"] | undefined>(
          row.sources as string | null,
          undefined
        ),
      })
    );

  const metaRow = db
    .prepare("SELECT value FROM session_stats_meta WHERE key = 'lastIngestedAt'")
    .get() as { value?: string } | undefined;

  return normalizeData({
    sessions,
    lastIngestedAt: metaRow?.value,
  });
}

export async function writeSessionStatsData(
  data: SessionStatsData
): Promise<void> {
  const db = getDb();
  const normalized = normalizeData(data);

  const transaction = db.transaction((payload: SessionStatsData) => {
    db.exec("DELETE FROM session_stats_sessions;");
    const insert = db.prepare(`
      INSERT INTO session_stats_sessions (
        id, fingerprint, name, artist, project, path,
        created_at, updated_at, sample_rate, bit_depth, bpm, key,
        duration_seconds, notes, tags, tracks, plugins, sources
      ) VALUES (
        @id, @fingerprint, @name, @artist, @project, @path,
        @createdAt, @updatedAt, @sampleRate, @bitDepth, @bpm, @key,
        @durationSeconds, @notes, @tags, @tracks, @plugins, @sources
      )
    `);

    payload.sessions.forEach((session) =>
      insert.run({
        ...session,
        artist: session.artist ?? null,
        project: session.project ?? null,
        path: session.path ?? null,
        createdAt: session.createdAt ?? null,
        updatedAt: session.updatedAt ?? null,
        sampleRate: session.sampleRate ?? null,
        bitDepth: session.bitDepth ?? null,
        bpm: session.bpm ?? null,
        key: session.key ?? null,
        durationSeconds: session.durationSeconds ?? null,
        notes: session.notes ?? null,
        tags: JSON.stringify(session.tags ?? []),
        tracks: JSON.stringify(session.tracks ?? []),
        plugins: JSON.stringify(session.plugins ?? []),
        sources: session.sources ? JSON.stringify(session.sources) : null,
      })
    );

    const upsertMeta = db.prepare(`
      INSERT INTO session_stats_meta (key, value)
      VALUES ('lastIngestedAt', @value)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);
    upsertMeta.run({ value: payload.lastIngestedAt ?? new Date().toISOString() });
  });

  transaction(normalized);
}

export async function upsertSessionStatsSessions(
  sessions: SessionStatsSession[]
): Promise<SessionStatsData> {
  const db = getDb();
  ensureSeed();

  const normalized = sessions.map((session) => normalizeSession(session));
  const now = new Date().toISOString();

  const transaction = db.transaction((payload: SessionStatsSession[]) => {
    const upsert = db.prepare(`
      INSERT INTO session_stats_sessions (
        id, fingerprint, name, artist, project, path,
        created_at, updated_at, sample_rate, bit_depth, bpm, key,
        duration_seconds, notes, tags, tracks, plugins, sources
      ) VALUES (
        @id, @fingerprint, @name, @artist, @project, @path,
        @createdAt, @updatedAt, @sampleRate, @bitDepth, @bpm, @key,
        @durationSeconds, @notes, @tags, @tracks, @plugins, @sources
      )
      ON CONFLICT(fingerprint) DO UPDATE SET
        id = excluded.id,
        name = excluded.name,
        artist = excluded.artist,
        project = excluded.project,
        path = excluded.path,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at,
        sample_rate = excluded.sample_rate,
        bit_depth = excluded.bit_depth,
        bpm = excluded.bpm,
        key = excluded.key,
        duration_seconds = excluded.duration_seconds,
        notes = excluded.notes,
        tags = excluded.tags,
        tracks = excluded.tracks,
        plugins = excluded.plugins,
        sources = excluded.sources
    `);

    payload.forEach((session) =>
      upsert.run({
        ...session,
        artist: session.artist ?? null,
        project: session.project ?? null,
        path: session.path ?? null,
        createdAt: session.createdAt ?? null,
        updatedAt: session.updatedAt ?? null,
        sampleRate: session.sampleRate ?? null,
        bitDepth: session.bitDepth ?? null,
        bpm: session.bpm ?? null,
        key: session.key ?? null,
        durationSeconds: session.durationSeconds ?? null,
        notes: session.notes ?? null,
        tags: JSON.stringify(session.tags ?? []),
        tracks: JSON.stringify(session.tracks ?? []),
        plugins: JSON.stringify(session.plugins ?? []),
        sources: session.sources ? JSON.stringify(session.sources) : null,
      })
    );

    const upsertMeta = db.prepare(`
      INSERT INTO session_stats_meta (key, value)
      VALUES ('lastIngestedAt', @value)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);
    upsertMeta.run({ value: now });
  });

  transaction(normalized);
  return readSessionStatsData();
}

function ensureSeed() {
  const db = getDb();
  const row = db
    .prepare("SELECT COUNT(*) as count FROM session_stats_sessions")
    .get() as { count: number };
  if (row.count === 0) {
    const legacy = loadLegacySessionStatsData();
    writeSessionStatsData(legacy ?? seedSessionStatsData);
  }
}
