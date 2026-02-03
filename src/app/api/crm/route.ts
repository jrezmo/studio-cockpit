import { NextResponse } from "next/server";
import { z } from "zod";
import { readCrmData, writeCrmData } from "@/lib/crm/storage";
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

const crmActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("addSession"), payload: sessionPayloadSchema }),
  z.object({ action: z.literal("addTask"), payload: taskPayloadSchema }),
  z.object({
    action: z.literal("addCorrespondence"),
    payload: correspondencePayloadSchema,
  }),
  z.object({ action: z.literal("addClient"), payload: clientPayloadSchema }),
  z.object({ action: z.literal("addProject"), payload: projectPayloadSchema }),
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
    default:
      return NextResponse.json(
        { ok: false, error: "Unknown action" },
        { status: 400 }
      );
  }
}
