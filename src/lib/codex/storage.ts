import { promises as fs } from "fs";
import path from "path";
import { seedCodexData } from "./seed";
import { normalizeSession } from "./utils";
import type { CodexData, CodexSession } from "./types";

const dataDir = path.join(process.cwd(), "data");
const codexFile = path.join(dataDir, "codex.json");

async function ensureCodexFile() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(codexFile);
  } catch {
    await fs.writeFile(codexFile, JSON.stringify(seedCodexData, null, 2), "utf-8");
  }
}

function normalizeData(data: CodexData): CodexData {
  const sessions = data.sessions.map((session) => normalizeSession(session));
  return { ...data, sessions };
}

export async function readCodexData(): Promise<CodexData> {
  await ensureCodexFile();
  const raw = await fs.readFile(codexFile, "utf-8");
  const parsed = JSON.parse(raw) as CodexData;
  return normalizeData(parsed);
}

export async function writeCodexData(data: CodexData): Promise<void> {
  await ensureCodexFile();
  await fs.writeFile(
    codexFile,
    JSON.stringify(normalizeData(data), null, 2),
    "utf-8"
  );
}

export async function upsertCodexSessions(
  sessions: CodexSession[]
): Promise<CodexData> {
  const data = await readCodexData();
  const normalized = sessions.map((session) => normalizeSession(session));
  const merged = new Map<string, CodexSession>();
  data.sessions.forEach((session) => merged.set(session.fingerprint, session));
  normalized.forEach((session) => merged.set(session.fingerprint, session));
  const updated: CodexData = {
    sessions: Array.from(merged.values()),
    lastIngestedAt: new Date().toISOString(),
  };
  await writeCodexData(updated);
  return updated;
}
