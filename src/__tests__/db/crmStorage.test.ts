import { promises as fs } from "fs";
import os from "os";
import path from "path";
import {
  deleteClientById,
  readCrmData,
  replaceCrmData,
  writeCrmData,
} from "@/server/crm/storage";
import type { CrmData } from "@/features/clients/types";

const createCrmData = (overrides: Partial<CrmData> = {}): CrmData => ({
  clients: overrides.clients ?? [],
  clientProjects: overrides.clientProjects ?? [],
  clientSessions: overrides.clientSessions ?? [],
  clientTasks: overrides.clientTasks ?? [],
  clientCorrespondence: overrides.clientCorrespondence ?? [],
});

const createClient = (overrides: Partial<CrmData["clients"][number]> = {}) => ({
  id: overrides.id ?? "client-1",
  name: overrides.name ?? "Test Client",
  status: overrides.status ?? "active",
  primaryContact: overrides.primaryContact ?? "Alex",
  email: overrides.email ?? "client@example.com",
  phone: overrides.phone,
  ratePerHour: overrides.ratePerHour ?? 120,
  tags: overrides.tags ?? [],
  lastContactAt: overrides.lastContactAt ?? new Date().toISOString(),
  nextSessionAt: overrides.nextSessionAt,
  notes: overrides.notes,
});

describe("CRM storage", () => {
  let tempDir = "";
  const originalDbPath = process.env.STUDIO_COCKPIT_DB_PATH;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "crm-storage-"));
    process.env.STUDIO_COCKPIT_DB_PATH = path.join(tempDir, "data", "test.db");
  });

  afterEach(async () => {
    process.env.STUDIO_COCKPIT_DB_PATH = originalDbPath;
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("upserts clients without duplicating rows", async () => {
    const initial = createClient({ id: "client-1", name: "First" });
    await replaceCrmData(createCrmData({ clients: [initial] }));

    const updated = createClient({ id: "client-1", name: "Updated" });
    await writeCrmData(createCrmData({ clients: [updated] }));

    const data = await readCrmData();
    const client = data.clients.find((entry) => entry.id === "client-1");
    expect(client?.name).toBe("Updated");
    expect(data.clients.filter((entry) => entry.id === "client-1")).toHaveLength(1);
  });

  it("replaces data when using replaceCrmData", async () => {
    const first = createClient({ id: "client-1" });
    const second = createClient({ id: "client-2", email: "two@example.com" });
    await replaceCrmData(createCrmData({ clients: [first, second] }));

    const replacement = createClient({ id: "client-3", email: "three@example.com" });
    await replaceCrmData(createCrmData({ clients: [replacement] }));

    const data = await readCrmData();
    expect(data.clients).toHaveLength(1);
    expect(data.clients[0].id).toBe("client-3");
  });

  it("deletes clients by id", async () => {
    const first = createClient({ id: "client-1" });
    const second = createClient({ id: "client-2", email: "two@example.com" });
    await replaceCrmData(createCrmData({ clients: [first, second] }));

    await deleteClientById("client-2");
    const data = await readCrmData();
    expect(data.clients).toHaveLength(1);
    expect(data.clients[0].id).toBe("client-1");
  });
});
