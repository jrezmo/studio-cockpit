import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { POST } from "@/app/api/session-stats/route";

const buildRequest = (body: unknown) =>
  new Request("http://localhost/api/session-stats", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

describe("Session stats API route", () => {
  let tempDir = "";
  const originalDbPath = process.env.STUDIO_COCKPIT_DB_PATH;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "session-stats-api-"));
    process.env.STUDIO_COCKPIT_DB_PATH = path.join(tempDir, "data", "test.db");
  });

  afterEach(async () => {
    process.env.STUDIO_COCKPIT_DB_PATH = originalDbPath;
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("rejects invalid session payloads", async () => {
    const response = await POST(
      buildRequest({
        action: "ingestSessions",
        payload: { name: "Missing fields" },
      })
    );

    expect(response.status).toBe(400);
    const result = await response.json();
    expect(result.ok).toBe(false);
    expect(result.error).toContain("id");
  });

  it("ingests a valid session", async () => {
    const response = await POST(
      buildRequest({
        action: "ingestSessions",
        payload: {
          id: "sess-1",
          fingerprint: "fingerprint-1",
          name: "Session One",
          tracks: [],
          plugins: [],
        },
      })
    );

    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.ok).toBe(true);
    expect(result.data.sessions).toHaveLength(1);
    expect(result.data.sessions[0].fingerprint).toBe("fingerprint-1");
  });
});
