import { NextResponse } from "next/server";
import { z } from "zod";
import {
  deleteClientById,
  deleteClientCorrespondenceById,
  deleteClientProjectById,
  deleteClientSessionById,
  deleteClientTaskById,
  readCrmData,
  writeCrmData,
} from "@/lib/crm/storage";
import type {
  Client,
  ClientCorrespondence,
  ClientProject,
  ClientSession,
  ClientTask,
  CrmData,
} from "@/lib/crm/types";
import {
  clientPayloadSchema,
  correspondencePayloadSchema,
  projectPayloadSchema,
} from "@/lib/validation/clientSchema";
import { sessionPayloadSchema } from "@/lib/validation/sessionSchema";
import { taskPayloadSchema } from "@/lib/validation/taskSchema";

export const runtime = "nodejs";

const idSchema = z.object({ id: z.string().min(1) });
const clientUpdateSchema = clientPayloadSchema.extend({ id: z.string().min(1) });
const projectUpdateSchema = projectPayloadSchema.extend({ id: z.string().min(1) });
const sessionUpdateSchema = sessionPayloadSchema.extend({ id: z.string().min(1) });
const taskUpdateSchema = taskPayloadSchema.extend({ id: z.string().min(1) });
const correspondenceUpdateSchema = correspondencePayloadSchema.extend({
  id: z.string().min(1),
});

const crmActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("addSession"), payload: sessionPayloadSchema }),
  z.object({ action: z.literal("addTask"), payload: taskPayloadSchema }),
  z.object({
    action: z.literal("addCorrespondence"),
    payload: correspondencePayloadSchema,
  }),
  z.object({ action: z.literal("addClient"), payload: clientPayloadSchema }),
  z.object({ action: z.literal("addProject"), payload: projectPayloadSchema }),
  z.object({ action: z.literal("updateSession"), payload: sessionUpdateSchema }),
  z.object({ action: z.literal("updateTask"), payload: taskUpdateSchema }),
  z.object({
    action: z.literal("updateCorrespondence"),
    payload: correspondenceUpdateSchema,
  }),
  z.object({ action: z.literal("updateClient"), payload: clientUpdateSchema }),
  z.object({ action: z.literal("updateProject"), payload: projectUpdateSchema }),
  z.object({ action: z.literal("deleteSession"), payload: idSchema }),
  z.object({ action: z.literal("deleteTask"), payload: idSchema }),
  z.object({ action: z.literal("deleteCorrespondence"), payload: idSchema }),
  z.object({ action: z.literal("deleteClient"), payload: idSchema }),
  z.object({ action: z.literal("deleteProject"), payload: idSchema }),
]);

function withId<T extends { id?: string }>(payload: T) {
  return { ...payload, id: payload.id ?? crypto.randomUUID() };
}

function updateClientTimestamp(data: CrmData, clientId: string, timestamp: string) {
  data.clients = data.clients.map((client) =>
    client.id === clientId ? { ...client, lastContactAt: timestamp } : client
  );
}

function updateProjectMinutes(
  data: CrmData,
  projectId: string | undefined,
  durationMinutes: number,
  lastSessionAt: string
) {
  if (!projectId) return;
  data.clientProjects = data.clientProjects.map((project) =>
    project.id === projectId
      ? {
          ...project,
          totalLoggedMinutes: project.totalLoggedMinutes + durationMinutes,
          lastSessionAt,
        }
      : project
  );
}

function recalcProjectTotals(data: CrmData, projectId: string | undefined) {
  if (!projectId) return;
  const sessions = data.clientSessions.filter((session) => session.projectId === projectId);
  const totalLoggedMinutes = sessions.reduce(
    (sum, session) => sum + session.durationMinutes,
    0
  );
  const lastSessionAt = sessions
    .map((session) => session.endTime)
    .map((value) => new Date(value).getTime())
    .filter((value) => !Number.isNaN(value))
    .sort((a, b) => b - a)[0];

  data.clientProjects = data.clientProjects.map((project) =>
    project.id === projectId
      ? {
          ...project,
          totalLoggedMinutes,
          lastSessionAt:
            typeof lastSessionAt === "number"
              ? new Date(lastSessionAt).toISOString()
              : project.lastSessionAt,
        }
      : project
  );
}

function recalcClientLastContact(data: CrmData, clientId: string) {
  const timestamps = [
    ...data.clientSessions
      .filter((session) => session.clientId === clientId)
      .map((session) => session.endTime),
    ...data.clientCorrespondence
      .filter((entry) => entry.clientId === clientId)
      .map((entry) => entry.occurredAt),
  ]
    .map((value) => new Date(value).getTime())
    .filter((value) => !Number.isNaN(value));

  if (timestamps.length === 0) return;
  const latest = new Date(Math.max(...timestamps)).toISOString();
  data.clients = data.clients.map((client) =>
    client.id === clientId ? { ...client, lastContactAt: latest } : client
  );
}

export async function GET() {
  const data = await readCrmData();
  return NextResponse.json({ ok: true, data });
}

function formatZodError(error: z.ZodError) {
  return error.issues
    .map((issue) => {
      const path = issue.path.length ? issue.path.join(".") : "payload";
      return `${path}: ${issue.message}`;
    })
    .join("; ");
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON payload" },
      { status: 400 }
    );
  }

  const parsed = crmActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: formatZodError(parsed.error) },
      { status: 400 }
    );
  }

  const { action, payload } = parsed.data;
  const data = await readCrmData();

  switch (action) {
    case "addSession": {
      const session = withId(payload) as ClientSession;
      data.clientSessions = [session, ...data.clientSessions];
      updateClientTimestamp(data, session.clientId, session.endTime);
      updateProjectMinutes(
        data,
        session.projectId,
        session.durationMinutes,
        session.endTime
      );
      await writeCrmData(data);
      return NextResponse.json({ ok: true, data });
    }
    case "addTask": {
      const task = withId(payload) as ClientTask;
      data.clientTasks = [task, ...data.clientTasks];
      await writeCrmData(data);
      return NextResponse.json({ ok: true, data });
    }
    case "addCorrespondence": {
      const entry = withId(payload) as ClientCorrespondence;
      data.clientCorrespondence = [entry, ...data.clientCorrespondence];
      updateClientTimestamp(data, entry.clientId, entry.occurredAt);
      await writeCrmData(data);
      return NextResponse.json({ ok: true, data });
    }
    case "addClient": {
      const client = withId(payload) as Client;
      data.clients = [client, ...data.clients];
      await writeCrmData(data);
      return NextResponse.json({ ok: true, data });
    }
    case "addProject": {
      const project = withId(payload) as ClientProject;
      data.clientProjects = [project, ...data.clientProjects];
      await writeCrmData(data);
      return NextResponse.json({ ok: true, data });
    }
    case "updateSession": {
      const session = payload as ClientSession;
      const existingSession = data.clientSessions.find((s) => s.id === session.id);
      data.clientSessions = data.clientSessions.map((s) =>
        s.id === session.id ? session : s
      );
      // Recalculate project totals if project changed or duration changed
      if (existingSession) {
        if (existingSession.projectId !== session.projectId) {
          recalcProjectTotals(data, existingSession.projectId);
          recalcProjectTotals(data, session.projectId);
        } else {
          recalcProjectTotals(data, session.projectId);
        }
        recalcClientLastContact(data, session.clientId);
        if (existingSession.clientId !== session.clientId) {
          recalcClientLastContact(data, existingSession.clientId);
        }
      }
      await writeCrmData(data);
      return NextResponse.json({ ok: true, data });
    }
    case "updateTask": {
      const task = payload as ClientTask;
      data.clientTasks = data.clientTasks.map((t) =>
        t.id === task.id ? task : t
      );
      await writeCrmData(data);
      return NextResponse.json({ ok: true, data });
    }
    case "updateCorrespondence": {
      const entry = payload as ClientCorrespondence;
      const existingEntry = data.clientCorrespondence.find((c) => c.id === entry.id);
      data.clientCorrespondence = data.clientCorrespondence.map((c) =>
        c.id === entry.id ? entry : c
      );
      recalcClientLastContact(data, entry.clientId);
      if (existingEntry && existingEntry.clientId !== entry.clientId) {
        recalcClientLastContact(data, existingEntry.clientId);
      }
      await writeCrmData(data);
      return NextResponse.json({ ok: true, data });
    }
    case "updateClient": {
      const client = payload as Client;
      data.clients = data.clients.map((c) =>
        c.id === client.id ? client : c
      );
      await writeCrmData(data);
      return NextResponse.json({ ok: true, data });
    }
    case "updateProject": {
      const project = payload as ClientProject;
      data.clientProjects = data.clientProjects.map((p) =>
        p.id === project.id ? project : p
      );
      await writeCrmData(data);
      return NextResponse.json({ ok: true, data });
    }
    case "deleteSession": {
      const session = data.clientSessions.find((s) => s.id === payload.id);
      await deleteClientSessionById(payload.id);
      data.clientSessions = data.clientSessions.filter((s) => s.id !== payload.id);
      if (session) {
        recalcProjectTotals(data, session.projectId);
        recalcClientLastContact(data, session.clientId);
      }
      return NextResponse.json({ ok: true, data });
    }
    case "deleteTask": {
      await deleteClientTaskById(payload.id);
      data.clientTasks = data.clientTasks.filter((t) => t.id !== payload.id);
      return NextResponse.json({ ok: true, data });
    }
    case "deleteCorrespondence": {
      const entry = data.clientCorrespondence.find((c) => c.id === payload.id);
      await deleteClientCorrespondenceById(payload.id);
      data.clientCorrespondence = data.clientCorrespondence.filter(
        (c) => c.id !== payload.id
      );
      if (entry) {
        recalcClientLastContact(data, entry.clientId);
      }
      return NextResponse.json({ ok: true, data });
    }
    case "deleteClient": {
      await deleteClientById(payload.id);
      data.clients = data.clients.filter((c) => c.id !== payload.id);
      // Also remove related data
      data.clientProjects = data.clientProjects.filter((p) => p.clientId !== payload.id);
      data.clientSessions = data.clientSessions.filter((s) => s.clientId !== payload.id);
      data.clientTasks = data.clientTasks.filter((t) => t.clientId !== payload.id);
      data.clientCorrespondence = data.clientCorrespondence.filter(
        (c) => c.clientId !== payload.id
      );
      return NextResponse.json({ ok: true, data });
    }
    case "deleteProject": {
      await deleteClientProjectById(payload.id);
      data.clientProjects = data.clientProjects.filter((p) => p.id !== payload.id);
      // Clear projectId from sessions/tasks that reference this project
      data.clientSessions = data.clientSessions.map((s) =>
        s.projectId === payload.id ? { ...s, projectId: undefined } : s
      );
      data.clientTasks = data.clientTasks.map((t) =>
        t.projectId === payload.id ? { ...t, projectId: undefined } : t
      );
      return NextResponse.json({ ok: true, data });
    }
    default:
      return NextResponse.json(
        { ok: false, error: "Unknown action" },
        { status: 400 }
      );
  }
}
