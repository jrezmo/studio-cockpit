import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { POST } from "@/app/api/crm/route";

const buildRequest = (body: unknown) =>
  new Request("http://localhost/api/crm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

describe("CRM API route", () => {
  let tempDir = "";
  const originalDbPath = process.env.STUDIO_COCKPIT_DB_PATH;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "crm-api-"));
    process.env.STUDIO_COCKPIT_DB_PATH = path.join(tempDir, "data", "test.db");
  });

  afterEach(async () => {
    process.env.STUDIO_COCKPIT_DB_PATH = originalDbPath;
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("rejects invalid payloads", async () => {
    const response = await POST(
      buildRequest({
        action: "addClient",
        payload: {
          name: "Test",
          primaryContact: "Alex",
          email: "not-an-email",
          lastContactAt: new Date().toISOString(),
          ratePerHour: 100,
        },
      })
    );

    expect(response.status).toBe(400);
    const result = await response.json();
    expect(result.ok).toBe(false);
    expect(result.error).toContain("email");
  });

  it("creates a client with defaults", async () => {
    const response = await POST(
      buildRequest({
        action: "addClient",
        payload: {
          name: "Test Client",
          primaryContact: "Alex Engineer",
          email: "client@example.com",
          lastContactAt: new Date().toISOString(),
          ratePerHour: "150",
        },
      })
    );

    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.ok).toBe(true);
    const created = result.data.clients.find(
      (client: { email: string }) => client.email === "client@example.com"
    );
    expect(created).toBeTruthy();
    expect(created.status).toBe("active");
    expect(created.tags).toEqual([]);
    expect(created.ratePerHour).toBe(150);
  });
});
