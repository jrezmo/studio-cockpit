"use server";

import { NextResponse } from "next/server";
import {
  readSessionStatsData,
  writeSessionStatsData,
  upsertSessionStatsSessions,
} from "@/lib/session-stats/storage";
import { normalizeSession } from "@/lib/session-stats/utils";
import type {
  SessionStatsIngestPayload,
  SessionStatsSession,
  SessionStatsData,
} from "@/lib/session-stats/types";

export const runtime = "nodejs";

type SessionStatsAction =
  | {
      action: "ingestSessions";
      payload: SessionStatsIngestPayload | { sessions: SessionStatsSession[] };
    }
  | { action: "replaceSessions"; payload: SessionStatsSession[] };

export async function GET() {
  const data = await readSessionStatsData();
  return NextResponse.json({ ok: true, data });
}

export async function POST(request: Request) {
  const body = (await request.json()) as SessionStatsAction;

  if (!body || !("action" in body)) {
    return NextResponse.json(
      { ok: false, error: "Missing action" },
      { status: 400 }
    );
  }

  switch (body.action) {
    case "ingestSessions": {
      const payload = body.payload;
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
      const sessions = body.payload ?? [];
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
