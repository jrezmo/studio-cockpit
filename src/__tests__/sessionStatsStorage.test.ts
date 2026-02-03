import { promises as fs } from "fs";
import os from "os";
import path from "path";
import {
  readSessionStatsData,
  upsertSessionStatsSessions,
  writeSessionStatsData,
} from "@/server/session-stats/storage";
import type { SessionStatsData, SessionStatsSession } from "@/features/session-stats/types";

describe("session-stats storage", () => {
  const originalCwd = process.cwd();
  let tempDir = "";

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "session-stats-"));
    process.chdir(tempDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("creates seed data when missing", async () => {
    const data = await readSessionStatsData();
    expect(data.sessions.length).toBeGreaterThan(0);

    const filePath = path.join(tempDir, "data", "studio-cockpit.db");
    const exists = await fs
      .access(filePath)
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(true);
  });

  it("upserts sessions by fingerprint", async () => {
    const seed: SessionStatsData = {
      sessions: [
        {
          id: "s1",
          fingerprint: "fingerprint-1",
          name: "Initial",
          tracks: [],
          plugins: [],
        },
      ],
      lastIngestedAt: "2026-02-01T00:00:00Z",
    };
    await writeSessionStatsData(seed);

    const update: SessionStatsSession = {
      id: "s1b",
      fingerprint: "fingerprint-1",
      name: "Updated",
      tracks: [],
      plugins: [],
    };

    const result = await upsertSessionStatsSessions([update]);
    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0].name).toBe("Updated");
    expect(result.lastIngestedAt).toBeTruthy();
  });
});
