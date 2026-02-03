import { NextResponse } from "next/server";
import { z } from "zod";
import {
  readSessionStatsData,
  writeSessionStatsData,
  upsertSessionStatsSessions,
} from "@/server/session-stats/storage";
import { normalizeSession } from "@/features/session-stats/utils";
import type { SessionStatsSession, SessionStatsData } from "@/features/session-stats/types";
import { sessionStatsActionSchema } from "@/features/session-stats/validation/sessionStatsSchema";

export const runtime = "nodejs";

export async function GET() {
  const data = await readSessionStatsData();
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

  const parsed = sessionStatsActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: formatZodError(parsed.error) },
      { status: 400 }
    );
  }

  const { action, payload } = parsed.data;

  switch (action) {
    case "ingestSessions": {
      let sessions: SessionStatsSession[] = [];
      if (Array.isArray(payload)) {
        sessions = payload;
      } else if (payload && "sessions" in payload) {
        sessions = payload.sessions;
      } else if (payload) {
        sessions = [payload as SessionStatsSession];
      }
      if (!sessions.length) {
        return NextResponse.json(
          { ok: false, error: "No sessions provided" },
          { status: 400 }
        );
      }
      const data = await upsertSessionStatsSessions(sessions);
      return NextResponse.json({ ok: true, data });
    }
    case "replaceSessions": {
      const sessions = payload ?? [];
      const data: SessionStatsData = {
        sessions: sessions.map((session) => normalizeSession(session)),
        lastIngestedAt: new Date().toISOString(),
      };
      await writeSessionStatsData(data);
      return NextResponse.json({ ok: true, data });
    }
    default:
      return NextResponse.json(
        { ok: false, error: "Unknown action" },
        { status: 400 }
      );
  }
}
