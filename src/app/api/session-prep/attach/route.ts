import { NextResponse } from "next/server";
import { mkdir, copyFile } from "fs/promises";
import path from "path";

export const runtime = "nodejs";

type AttachRequest = {
  sessionPath: string;
  files: Array<{ name: string; path: string }>;
};

function resolveSessionDir(sessionPath: string) {
  const normalized = path.resolve(sessionPath);
  if (normalized.toLowerCase().endsWith(".ptx")) {
    return path.dirname(normalized);
  }
  return normalized;
}

export async function POST(request: Request) {
  let body: AttachRequest;
  try {
    body = (await request.json()) as AttachRequest;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body?.sessionPath || !body?.files?.length) {
    return NextResponse.json(
      { ok: false, error: "Session path and files are required." },
      { status: 400 }
    );
  }

  const sessionDir = resolveSessionDir(body.sessionPath);
  const audioDir = path.join(sessionDir, "Audio Files");

  try {
    await mkdir(audioDir, { recursive: true });
    for (const file of body.files) {
      const targetPath = path.join(audioDir, file.name);
      await copyFile(file.path, targetPath);
    }
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? `Unable to attach files: ${error.message}`
            : "Unable to attach files.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
