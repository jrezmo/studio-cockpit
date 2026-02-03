import { promises as fs } from "fs";
import path from "path";
import { seedSessionStatsData } from "./seed";
import { normalizeSession } from "./utils";
import type { SessionStatsData, SessionStatsSession } from "./types";

const dataDir = path.join(process.cwd(), "data");
const sessionStatsFile = path.join(dataDir, "session-stats.json");

async function ensureSessionStatsFile() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(sessionStatsFile);
  } catch {
    await fs.writeFile(
      sessionStatsFile,
      JSON.stringify(seedSessionStatsData, null, 2),
      "utf-8"
    );
  }
}

function normalizeData(data: SessionStatsData): SessionStatsData {
  const sessions = data.sessions.map((session) => normalizeSession(session));
  return { ...data, sessions };
}

export async function readSessionStatsData(): Promise<SessionStatsData> {
  await ensureSessionStatsFile();
  const raw = await fs.readFile(sessionStatsFile, "utf-8");
  const parsed = JSON.parse(raw) as SessionStatsData;
  return normalizeData(parsed);
}

export async function writeSessionStatsData(
  data: SessionStatsData
): Promise<void> {
  await ensureSessionStatsFile();
  await fs.writeFile(
    sessionStatsFile,
    JSON.stringify(normalizeData(data), null, 2),
    "utf-8"
  );
}

export async function upsertSessionStatsSessions(
  sessions: SessionStatsSession[]
): Promise<SessionStatsData> {
  const data = await readSessionStatsData();
  const normalized = sessions.map((session) => normalizeSession(session));
  const merged = new Map<string, SessionStatsSession>();
  data.sessions.forEach((session) => merged.set(session.fingerprint, session));
  normalized.forEach((session) => merged.set(session.fingerprint, session));
  const updated: SessionStatsData = {
    sessions: Array.from(merged.values()),
    lastIngestedAt: new Date().toISOString(),
  };
  await writeSessionStatsData(updated);
  return updated;
}
