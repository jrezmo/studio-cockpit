"use server";

import { NextResponse } from "next/server";
import { readCrmData, writeCrmData } from "@/lib/crm/storage";
import type {
  Client,
  ClientCorrespondence,
  ClientProject,
  ClientSession,
  ClientTask,
  CrmData,
} from "@/lib/crm/types";

type CrmAction =
  | { action: "addSession"; payload: Omit<ClientSession, "id"> }
  | { action: "addTask"; payload: Omit<ClientTask, "id"> }
  | { action: "addCorrespondence"; payload: Omit<ClientCorrespondence, "id"> }
  | { action: "addClient"; payload: Omit<Client, "id"> }
  | { action: "addProject"; payload: Omit<ClientProject, "id"> };

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

export async function POST(request: Request) {
  const body = (await request.json()) as CrmAction;
  const data = await readCrmData();

  if (!body || !("action" in body)) {
    return NextResponse.json(
      { ok: false, error: "Missing action" },
      { status: 400 }
    );
  }

  switch (body.action) {
    case "addSession": {
      const payload = body.payload;
      if (!payload.clientId || !payload.startTime || !payload.endTime) {
        return NextResponse.json(
          { ok: false, error: "Missing session fields" },
          { status: 400 }
        );
      }
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
      const payload = body.payload;
      if (!payload.clientId || !payload.title) {
        return NextResponse.json(
          { ok: false, error: "Missing task fields" },
          { status: 400 }
        );
      }
      const task = withId(payload) as ClientTask;
      data.clientTasks = [task, ...data.clientTasks];
      await writeCrmData(data);
      return NextResponse.json({ ok: true, data });
    }
    case "addCorrespondence": {
      const payload = body.payload;
      if (!payload.clientId || !payload.subject || !payload.occurredAt) {
        return NextResponse.json(
          { ok: false, error: "Missing correspondence fields" },
          { status: 400 }
        );
      }
      const entry = withId(payload) as ClientCorrespondence;
      data.clientCorrespondence = [entry, ...data.clientCorrespondence];
      updateClientTimestamp(data, entry.clientId, entry.occurredAt);
      await writeCrmData(data);
      return NextResponse.json({ ok: true, data });
    }
    case "addClient": {
      const payload = body.payload;
      if (!payload.name || !payload.primaryContact || !payload.email) {
        return NextResponse.json(
          { ok: false, error: "Missing client fields" },
          { status: 400 }
        );
      }
      const client = withId(payload) as Client;
      data.clients = [client, ...data.clients];
      await writeCrmData(data);
      return NextResponse.json({ ok: true, data });
    }
    case "addProject": {
      const payload = body.payload;
      if (!payload.clientId || !payload.name) {
        return NextResponse.json(
          { ok: false, error: "Missing project fields" },
          { status: 400 }
        );
      }
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
