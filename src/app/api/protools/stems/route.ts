import { NextResponse } from "next/server";
import {
  getAllowWrites,
  hasWritePermissions,
  runMcpTool,
} from "@/server/protools/mcp";

export const runtime = "nodejs";

type StemOpenRequest = {
  action: "open";
  sessionPath: string;
};

type StemPrintRequest = {
  action: "print";
  sessionPath?: string;
  openSession?: boolean;
  outputDirectory: string;
  mixSource: {
    type: string;
    name: string;
  };
  audio: {
    fileType: string;
    sampleRate: string;
    bitDepth: string;
    exportFormat: string;
    deliveryFormat: string;
    offlineBounce?: boolean;
  };
  parts: Array<{
    label: string;
    fileName: string;
    sourceName?: string;
  }>;
};

type StemRequest = StemOpenRequest | StemPrintRequest;

async function openSession(sessionPath: string, allowWrites: string) {
  return runMcpTool(
    "ptsl_command",
    {
      command: "OpenSession",
      params: {
        session_path: sessionPath,
        behavior_options: {},
      },
    },
    allowWrites
  );
}

export async function POST(request: Request) {
  let body: StemRequest;
  try {
    body = (await request.json()) as StemRequest;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  if (!body?.action) {
    return NextResponse.json(
      { ok: false, error: "Missing action." },
      { status: 400 }
    );
  }

  const allowWrites = getAllowWrites();
  const requiredGroups = new Set<string>();

  if (body.action === "open") {
    requiredGroups.add("session");
  }

  if (body.action === "print") {
    requiredGroups.add("export");
    if (body.openSession) {
      requiredGroups.add("session");
    }
  }

  if (!hasWritePermissions(allowWrites, [...requiredGroups])) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Write operation blocked. Set PROTOOLS_ALLOW_WRITES to include session and export (or use all).",
      },
      { status: 500 }
    );
  }

  if (body.action === "open") {
    if (!body.sessionPath) {
      return NextResponse.json(
        { ok: false, error: "Session path is required." },
        { status: 400 }
      );
    }

    const result = await openSession(body.sessionPath, allowWrites);
    return NextResponse.json(result, { status: result.ok ? 200 : 500 });
  }

  if (!body.outputDirectory || !body.parts?.length) {
    return NextResponse.json(
      { ok: false, error: "Output directory and parts are required." },
      { status: 400 }
    );
  }

  if (!body.mixSource?.name || !body.mixSource?.type) {
    return NextResponse.json(
      { ok: false, error: "Mix source name and type are required." },
      { status: 400 }
    );
  }

  if (body.openSession && body.sessionPath) {
    const openResult = await openSession(body.sessionPath, allowWrites);
    if (!openResult.ok) {
      return NextResponse.json(openResult, { status: 500 });
    }
  }

  const results: Array<{ label: string; ok: boolean; error?: string }> = [];

  for (const part of body.parts) {
    if (!part?.fileName) continue;
    const sourceName = part.sourceName?.trim() || body.mixSource.name;
    if (!sourceName) {
      results.push({
        label: part.label,
        ok: false,
        error: "Missing mix source name.",
      });
      continue;
    }

    const exportResult = await runMcpTool(
      "ptsl_command",
      {
        command: "ExportMix",
        params: {
          file_name: part.fileName,
          file_type: body.audio.fileType,
          audio_info: {
            compression_type: "CType_PCM",
            export_format: body.audio.exportFormat,
            bit_depth: body.audio.bitDepth,
            sample_rate: body.audio.sampleRate,
            pad_to_frame_boundary: "TBool_False",
            delivery_format: body.audio.deliveryFormat,
          },
          location_info: {
            import_after_bounce: "TBool_False",
            file_destination: "EMFDestination_Directory",
            directory: body.outputDirectory,
          },
          offline_bounce: body.audio.offlineBounce ? "TBool_True" : "TBool_False",
          mix_source_list: [
            {
              source_type: body.mixSource.type,
              name: sourceName,
            },
          ],
        },
      },
      allowWrites
    );

    results.push({
      label: part.label,
      ok: exportResult.ok,
      error: exportResult.ok ? undefined : exportResult.error,
    });

    if (!exportResult.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: exportResult.error ?? "Export mix failed.",
          result: { results },
        },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ ok: true, result: { results } }, { status: 200 });
}
