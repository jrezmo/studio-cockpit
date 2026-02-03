"use server";

import { NextResponse } from "next/server";
import { readCodexData, writeCodexData, upsertCodexSessions } from "@/lib/codex/storage";
import { normalizeSession } from "@/lib/codex/utils";
import type { CodexIngestPayload, CodexSession, CodexData } from "@/lib/codex/types";

export const runtime = "nodejs";

type CodexAction =
  | { action: "ingestSessions"; payload: CodexIngestPayload | { sessions: CodexSession[] } }
  | { action: "replaceSessions"; payload: CodexSession[] };

export async function GET() {
  const data = await readCodexData();
  return NextResponse.json({ ok: true, data });
}

export async function POST(request: Request) {
  const body = (await request.json()) as CodexAction;

  if (!body || !("action" in body)) {
    return NextResponse.json(
      { ok: false, error: "Missing action" },
      { status: 400 }
    );
  }

  switch (body.action) {
    case "ingestSessions": {
      const payload = body.payload;
      let sessions: CodexSession[] = [];
      if (Array.isArray(payload)) {
        sessions = payload;
      } else if (payload && "sessions" in payload) {
        sessions = payload.sessions;
      } else if (payload) {
        sessions = [payload as CodexSession];
      }
      if (!sessions.length) {
        return NextResponse.json(
          { ok: false, error: "No sessions provided" },
          { status: 400 }
        );
      }
      const data = await upsertCodexSessions(sessions);
      return NextResponse.json({ ok: true, data });
    }
    case "replaceSessions": {
      const sessions = body.payload ?? [];
      const data: CodexData = {
        sessions: sessions.map((session) => normalizeSession(session)),
        lastIngestedAt: new Date().toISOString(),
      };
      await writeCodexData(data);
      return NextResponse.json({ ok: true, data });
    }
    default:
      return NextResponse.json(
        { ok: false, error: "Unknown action" },
        { status: 400 }
      );
  }
}
