import { NextResponse } from "next/server";
import { runMcpTool, getAllowWrites } from "@/server/protools/mcp";

export const runtime = "nodejs";

const ALLOWED_TOOLS = new Set([
  "get_session_info",
  "get_track_list",
  "get_markers",
  "create_marker",
]);

const WRITE_TOOLS = new Set(["create_marker"]);

export async function POST(request: Request) {
  let body: { tool?: string; args?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const tool = body.tool;
  const args = body.args ?? {};

  if (!tool || !ALLOWED_TOOLS.has(tool)) {
    return NextResponse.json(
      { ok: false, error: "Tool not allowed." },
      { status: 400 }
    );
  }

  const allowWrites = getAllowWrites();
  if (WRITE_TOOLS.has(tool) && !allowWrites) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Write operation blocked. Set PROTOOLS_ALLOW_WRITES=memory or PROTOOLS_ALLOW_WRITES=all.",
      },
      { status: 500 }
    );
  }

  const result = await runMcpTool(tool, args, allowWrites);
  const status = result.ok ? 200 : 500;

  return NextResponse.json(result, { status });
}
