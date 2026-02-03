// CRM storage layer backed by SQLite with UPSERT-based writes.
import { getDb } from "@/server/db";
import { existsSync, readFileSync } from "fs";
import path from "path";
import { seedCrmData } from "@/features/clients/seed";
import type {
  Client,
  ClientCorrespondence,
  ClientProject,
  ClientSession,
  ClientTask,
  CrmData,
} from "@/features/clients/types";

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

const UPSERT_CLIENT_SQL = `
  INSERT INTO clients (
    id, name, status, primary_contact, email, phone, rate_per_hour,
    tags, last_contact_at, next_session_at, notes
  ) VALUES (
    @id, @name, @status, @primaryContact, @email, @phone, @ratePerHour,
    @tags, @lastContactAt, @nextSessionAt, @notes
  )
  ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    status = excluded.status,
    primary_contact = excluded.primary_contact,
    email = excluded.email,
    phone = excluded.phone,
    rate_per_hour = excluded.rate_per_hour,
    tags = excluded.tags,
    last_contact_at = excluded.last_contact_at,
    next_session_at = excluded.next_session_at,
    notes = excluded.notes
`;

const UPSERT_PROJECT_SQL = `
  INSERT INTO client_projects (
    id, client_id, name, status, protools_project_id, due_date,
    last_session_at, total_logged_minutes
  ) VALUES (
    @id, @clientId, @name, @status, @protoolsProjectId, @dueDate,
    @lastSessionAt, @totalLoggedMinutes
  )
  ON CONFLICT(id) DO UPDATE SET
    client_id = excluded.client_id,
    name = excluded.name,
    status = excluded.status,
    protools_project_id = excluded.protools_project_id,
    due_date = excluded.due_date,
    last_session_at = excluded.last_session_at,
    total_logged_minutes = excluded.total_logged_minutes
`;

const UPSERT_SESSION_SQL = `
  INSERT INTO client_sessions (
    id, client_id, project_id, type, start_time, end_time,
    duration_minutes, billable_rate, notes
  ) VALUES (
    @id, @clientId, @projectId, @type, @startTime, @endTime,
    @durationMinutes, @billableRate, @notes
  )
  ON CONFLICT(id) DO UPDATE SET
    client_id = excluded.client_id,
    project_id = excluded.project_id,
    type = excluded.type,
    start_time = excluded.start_time,
    end_time = excluded.end_time,
    duration_minutes = excluded.duration_minutes,
    billable_rate = excluded.billable_rate,
    notes = excluded.notes
`;

const UPSERT_TASK_SQL = `
  INSERT INTO client_tasks (
    id, client_id, project_id, title, status, due_at, assignee
  ) VALUES (
    @id, @clientId, @projectId, @title, @status, @dueAt, @assignee
  )
  ON CONFLICT(id) DO UPDATE SET
    client_id = excluded.client_id,
    project_id = excluded.project_id,
    title = excluded.title,
    status = excluded.status,
    due_at = excluded.due_at,
    assignee = excluded.assignee
`;

const UPSERT_CORRESPONDENCE_SQL = `
  INSERT INTO client_correspondence (
    id, client_id, channel, direction, subject, summary, occurred_at, participants
  ) VALUES (
    @id, @clientId, @channel, @direction, @subject, @summary, @occurredAt, @participants
  )
  ON CONFLICT(id) DO UPDATE SET
    client_id = excluded.client_id,
    channel = excluded.channel,
    direction = excluded.direction,
    subject = excluded.subject,
    summary = excluded.summary,
    occurred_at = excluded.occurred_at,
    participants = excluded.participants
`;

function clearCrmTables(db: ReturnType<typeof getDb>) {
  db.exec(`
    DELETE FROM client_correspondence;
    DELETE FROM client_tasks;
    DELETE FROM client_sessions;
    DELETE FROM client_projects;
    DELETE FROM clients;
  `);
}

function upsertCrmPayload(db: ReturnType<typeof getDb>, payload: CrmData) {
  const upsertClient = db.prepare(UPSERT_CLIENT_SQL);
  const upsertProject = db.prepare(UPSERT_PROJECT_SQL);
  const upsertSession = db.prepare(UPSERT_SESSION_SQL);
  const upsertTask = db.prepare(UPSERT_TASK_SQL);
  const upsertCorrespondence = db.prepare(UPSERT_CORRESPONDENCE_SQL);

  payload.clients.forEach((client) =>
    upsertClient.run({
      ...client,
      phone: client.phone ?? null,
      nextSessionAt: client.nextSessionAt ?? null,
      notes: client.notes ?? null,
      tags: JSON.stringify(client.tags ?? []),
    })
  );
  payload.clientProjects.forEach((project) =>
    upsertProject.run({
      ...project,
      protoolsProjectId: project.protoolsProjectId ?? null,
      dueDate: project.dueDate ?? null,
      lastSessionAt: project.lastSessionAt ?? null,
    })
  );
  payload.clientSessions.forEach((session) =>
    upsertSession.run({
      ...session,
      projectId: session.projectId ?? null,
      billableRate: session.billableRate ?? null,
      notes: session.notes ?? null,
    })
  );
  payload.clientTasks.forEach((task) =>
    upsertTask.run({
      ...task,
      projectId: task.projectId ?? null,
      dueAt: task.dueAt ?? null,
      assignee: task.assignee ?? null,
    })
  );
  payload.clientCorrespondence.forEach((entry) =>
    upsertCorrespondence.run({
      ...entry,
      participants: JSON.stringify(entry.participants ?? []),
    })
  );
}

export async function readCrmData(): Promise<CrmData> {
  const db = getDb();
  ensureSeed();

  const clients = db
    .prepare("SELECT * FROM clients ORDER BY rowid DESC")
    .all()
    .map((r) => {
      const row = r as Record<string, unknown>;
      return {
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
      };
    });

  const clientProjects = db
    .prepare("SELECT * FROM client_projects ORDER BY rowid DESC")
    .all()
    .map((r) => {
      const row = r as Record<string, unknown>;
      return {
        id: row.id as string,
        clientId: row.client_id as string,
        name: row.name as string,
        status: row.status as CrmData["clientProjects"][number]["status"],
        protoolsProjectId: row.protools_project_id as string | undefined,
        dueDate: row.due_date as string | undefined,
        lastSessionAt: row.last_session_at as string | undefined,
        totalLoggedMinutes: row.total_logged_minutes as number,
      };
    });

  const clientSessions = db
    .prepare("SELECT * FROM client_sessions ORDER BY rowid DESC")
    .all()
    .map((r) => {
      const row = r as Record<string, unknown>;
      return {
        id: row.id as string,
        clientId: row.client_id as string,
        projectId: row.project_id as string | undefined,
        type: row.type as CrmData["clientSessions"][number]["type"],
        startTime: row.start_time as string,
        endTime: row.end_time as string,
        durationMinutes: row.duration_minutes as number,
        billableRate: row.billable_rate as number | undefined,
        notes: row.notes as string | undefined,
      };
    });

  const clientTasks = db
    .prepare("SELECT * FROM client_tasks ORDER BY rowid DESC")
    .all()
    .map((r) => {
      const row = r as Record<string, unknown>;
      return {
        id: row.id as string,
        clientId: row.client_id as string,
        projectId: row.project_id as string | undefined,
        title: row.title as string,
        status: row.status as CrmData["clientTasks"][number]["status"],
        dueAt: row.due_at as string | undefined,
        assignee: row.assignee as string | undefined,
      };
    });

  const clientCorrespondence = db
    .prepare("SELECT * FROM client_correspondence ORDER BY rowid DESC")
    .all()
    .map((r) => {
      const row = r as Record<string, unknown>;
      return {
        id: row.id as string,
        clientId: row.client_id as string,
        channel: row.channel as CrmData["clientCorrespondence"][number]["channel"],
        direction: row.direction as CrmData["clientCorrespondence"][number]["direction"],
        subject: row.subject as string,
        summary: row.summary as string,
        occurredAt: row.occurred_at as string,
        participants: parseJson<string[]>(row.participants as string | null, []),
      };
    });

  return {
    clients,
    clientProjects,
    clientSessions,
    clientTasks,
    clientCorrespondence,
  };
}

/** Upsert all CRM entities in a single transaction. */
export async function writeCrmData(data: CrmData): Promise<void> {
  const db = getDb();
  const transaction = db.transaction((payload: CrmData) => {
    upsertCrmPayload(db, payload);
  });

  transaction(data);
}

/** Replace all CRM tables with the provided payload (use for imports only). */
export async function replaceCrmData(data: CrmData): Promise<void> {
  const db = getDb();
  const transaction = db.transaction((payload: CrmData) => {
    clearCrmTables(db);
    upsertCrmPayload(db, payload);
  });
  transaction(data);
}

/** Upsert a single client row. */
export async function upsertClient(client: Client): Promise<void> {
  const db = getDb();
  db.prepare(UPSERT_CLIENT_SQL).run({
    ...client,
    phone: client.phone ?? null,
    nextSessionAt: client.nextSessionAt ?? null,
    notes: client.notes ?? null,
    tags: JSON.stringify(client.tags ?? []),
  });
}

/** Upsert a single client project row. */
export async function upsertClientProject(project: ClientProject): Promise<void> {
  const db = getDb();
  db.prepare(UPSERT_PROJECT_SQL).run({
    ...project,
    protoolsProjectId: project.protoolsProjectId ?? null,
    dueDate: project.dueDate ?? null,
    lastSessionAt: project.lastSessionAt ?? null,
  });
}

/** Upsert a single client session row. */
export async function upsertClientSession(session: ClientSession): Promise<void> {
  const db = getDb();
  db.prepare(UPSERT_SESSION_SQL).run({
    ...session,
    projectId: session.projectId ?? null,
    billableRate: session.billableRate ?? null,
    notes: session.notes ?? null,
  });
}

/** Upsert a single client task row. */
export async function upsertClientTask(task: ClientTask): Promise<void> {
  const db = getDb();
  db.prepare(UPSERT_TASK_SQL).run({
    ...task,
    projectId: task.projectId ?? null,
    dueAt: task.dueAt ?? null,
    assignee: task.assignee ?? null,
  });
}

/** Upsert a single client correspondence entry. */
export async function upsertClientCorrespondence(
  entry: ClientCorrespondence
): Promise<void> {
  const db = getDb();
  db.prepare(UPSERT_CORRESPONDENCE_SQL).run({
    ...entry,
    participants: JSON.stringify(entry.participants ?? []),
  });
}

/** Delete a client and any dependent rows via cascade. */
export async function deleteClientById(id: string): Promise<void> {
  const db = getDb();
  db.prepare("DELETE FROM clients WHERE id = ?").run(id);
}

/** Delete a client project by id. */
export async function deleteClientProjectById(id: string): Promise<void> {
  const db = getDb();
  db.prepare("DELETE FROM client_projects WHERE id = ?").run(id);
}

/** Delete a client session by id. */
export async function deleteClientSessionById(id: string): Promise<void> {
  const db = getDb();
  db.prepare("DELETE FROM client_sessions WHERE id = ?").run(id);
}

/** Delete a client task by id. */
export async function deleteClientTaskById(id: string): Promise<void> {
  const db = getDb();
  db.prepare("DELETE FROM client_tasks WHERE id = ?").run(id);
}

/** Delete a correspondence entry by id. */
export async function deleteClientCorrespondenceById(id: string): Promise<void> {
  const db = getDb();
  db.prepare("DELETE FROM client_correspondence WHERE id = ?").run(id);
}
