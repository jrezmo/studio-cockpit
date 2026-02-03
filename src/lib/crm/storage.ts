import { getDb } from "@/lib/db";
import { existsSync, readFileSync } from "fs";
import path from "path";
import { seedCrmData } from "./seed";
import type { CrmData } from "./types";

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function loadLegacyCrmData(): CrmData | null {
  const legacyPath = path.join(process.cwd(), "data", "crm.json");
  if (!existsSync(legacyPath)) return null;
  try {
    const raw = readFileSync(legacyPath, "utf-8");
    return JSON.parse(raw) as CrmData;
  } catch {
    return null;
  }
}

function ensureSeed() {
  const db = getDb();
  const row = db.prepare("SELECT COUNT(*) as count FROM clients").get() as {
    count: number;
  };
  if (row.count === 0) {
    const legacy = loadLegacyCrmData();
    writeCrmData(legacy ?? seedCrmData);
  }
}

export async function readCrmData(): Promise<CrmData> {
  const db = getDb();
  ensureSeed();

  const clients = db
    .prepare("SELECT * FROM clients ORDER BY rowid DESC")
    .all()
    .map((row) => ({
      id: row.id as string,
      name: row.name as string,
      status: row.status as CrmData["clients"][number]["status"],
      primaryContact: row.primary_contact as string,
      email: row.email as string,
      phone: row.phone as string | undefined,
      ratePerHour: row.rate_per_hour as number,
      tags: parseJson<string[]>(row.tags as string | null, []),
      lastContactAt: (row.last_contact_at as string) ?? "",
      nextSessionAt: row.next_session_at as string | undefined,
      notes: row.notes as string | undefined,
    }));

  const clientProjects = db
    .prepare("SELECT * FROM client_projects ORDER BY rowid DESC")
    .all()
    .map((row) => ({
      id: row.id as string,
      clientId: row.client_id as string,
      name: row.name as string,
      status: row.status as CrmData["clientProjects"][number]["status"],
      protoolsProjectId: row.protools_project_id as string | undefined,
      dueDate: row.due_date as string | undefined,
      lastSessionAt: row.last_session_at as string | undefined,
      totalLoggedMinutes: row.total_logged_minutes as number,
    }));

  const clientSessions = db
    .prepare("SELECT * FROM client_sessions ORDER BY rowid DESC")
    .all()
    .map((row) => ({
      id: row.id as string,
      clientId: row.client_id as string,
      projectId: row.project_id as string | undefined,
      type: row.type as CrmData["clientSessions"][number]["type"],
      startTime: row.start_time as string,
      endTime: row.end_time as string,
      durationMinutes: row.duration_minutes as number,
      billableRate: row.billable_rate as number | undefined,
      notes: row.notes as string | undefined,
    }));

  const clientTasks = db
    .prepare("SELECT * FROM client_tasks ORDER BY rowid DESC")
    .all()
    .map((row) => ({
      id: row.id as string,
      clientId: row.client_id as string,
      projectId: row.project_id as string | undefined,
      title: row.title as string,
      status: row.status as CrmData["clientTasks"][number]["status"],
      dueAt: row.due_at as string | undefined,
      assignee: row.assignee as string | undefined,
    }));

  const clientCorrespondence = db
    .prepare("SELECT * FROM client_correspondence ORDER BY rowid DESC")
    .all()
    .map((row) => ({
      id: row.id as string,
      clientId: row.client_id as string,
      channel: row.channel as CrmData["clientCorrespondence"][number]["channel"],
      direction: row.direction as CrmData["clientCorrespondence"][number]["direction"],
      subject: row.subject as string,
      summary: row.summary as string,
      occurredAt: row.occurred_at as string,
      participants: parseJson<string[]>(row.participants as string | null, []),
    }));

  return {
    clients,
    clientProjects,
    clientSessions,
    clientTasks,
    clientCorrespondence,
  };
}

export async function writeCrmData(data: CrmData): Promise<void> {
  const db = getDb();
  const transaction = db.transaction((payload: CrmData) => {
    db.exec(`
      DELETE FROM client_correspondence;
      DELETE FROM client_tasks;
      DELETE FROM client_sessions;
      DELETE FROM client_projects;
      DELETE FROM clients;
    `);

    const insertClient = db.prepare(`
      INSERT INTO clients (
        id, name, status, primary_contact, email, phone, rate_per_hour,
        tags, last_contact_at, next_session_at, notes
      ) VALUES (
        @id, @name, @status, @primaryContact, @email, @phone, @ratePerHour,
        @tags, @lastContactAt, @nextSessionAt, @notes
      )
    `);
    const insertProject = db.prepare(`
      INSERT INTO client_projects (
        id, client_id, name, status, protools_project_id, due_date,
        last_session_at, total_logged_minutes
      ) VALUES (
        @id, @clientId, @name, @status, @protoolsProjectId, @dueDate,
        @lastSessionAt, @totalLoggedMinutes
      )
    `);
    const insertSession = db.prepare(`
      INSERT INTO client_sessions (
        id, client_id, project_id, type, start_time, end_time,
        duration_minutes, billable_rate, notes
      ) VALUES (
        @id, @clientId, @projectId, @type, @startTime, @endTime,
        @durationMinutes, @billableRate, @notes
      )
    `);
    const insertTask = db.prepare(`
      INSERT INTO client_tasks (
        id, client_id, project_id, title, status, due_at, assignee
      ) VALUES (
        @id, @clientId, @projectId, @title, @status, @dueAt, @assignee
      )
    `);
    const insertCorrespondence = db.prepare(`
      INSERT INTO client_correspondence (
        id, client_id, channel, direction, subject, summary, occurred_at, participants
      ) VALUES (
        @id, @clientId, @channel, @direction, @subject, @summary, @occurredAt, @participants
      )
    `);

    payload.clients.forEach((client) =>
      insertClient.run({
        ...client,
        phone: client.phone ?? null,
        nextSessionAt: client.nextSessionAt ?? null,
        notes: client.notes ?? null,
        tags: JSON.stringify(client.tags ?? []),
      })
    );
    payload.clientProjects.forEach((project) =>
      insertProject.run({
        ...project,
        protoolsProjectId: project.protoolsProjectId ?? null,
        dueDate: project.dueDate ?? null,
        lastSessionAt: project.lastSessionAt ?? null,
      })
    );
    payload.clientSessions.forEach((session) =>
      insertSession.run({
        ...session,
        projectId: session.projectId ?? null,
        billableRate: session.billableRate ?? null,
        notes: session.notes ?? null,
      })
    );
    payload.clientTasks.forEach((task) =>
      insertTask.run({
        ...task,
        projectId: task.projectId ?? null,
        dueAt: task.dueAt ?? null,
        assignee: task.assignee ?? null,
      })
    );
    payload.clientCorrespondence.forEach((entry) =>
      insertCorrespondence.run({
        ...entry,
        participants: JSON.stringify(entry.participants ?? []),
      })
    );
  });

  transaction(data);
}
