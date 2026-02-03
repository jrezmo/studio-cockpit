import { promises as fs } from "fs";
import path from "path";
import { seedCrmData } from "./seed";
import type { CrmData } from "./types";

const dataDir = path.join(process.cwd(), "data");
const crmFile = path.join(dataDir, "crm.json");

async function ensureCrmFile() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(crmFile);
  } catch {
    await fs.writeFile(crmFile, JSON.stringify(seedCrmData, null, 2), "utf-8");
  }
}

export async function readCrmData(): Promise<CrmData> {
  await ensureCrmFile();
  const raw = await fs.readFile(crmFile, "utf-8");
  return JSON.parse(raw) as CrmData;
}

export async function writeCrmData(data: CrmData): Promise<void> {
  await ensureCrmFile();
  await fs.writeFile(crmFile, JSON.stringify(data, null, 2), "utf-8");
}
