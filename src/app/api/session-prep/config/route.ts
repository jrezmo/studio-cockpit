import { NextResponse } from "next/server";
import { getCreatedSessionsRoot, getUploadRoot } from "@/server/session-prep/config";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      uploadRoot: getUploadRoot(),
      createdSessionsRoot: getCreatedSessionsRoot(),
    },
    { status: 200 }
  );
}
