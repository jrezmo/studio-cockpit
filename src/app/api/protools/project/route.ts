import { NextResponse } from "next/server";
import { access, mkdir, readdir } from "fs/promises";
import path from "path";
import {
  getAllowWrites,
  hasWritePermissions,
  runMcpTool,
} from "@/server/protools/mcp";
import { importAudioToClipList, spotClipsByName } from "@/server/protools/import";

export const runtime = "nodejs";

type ProjectRequest = {
  session: {
    name: string;
    location: string;
    fileType: string;
    sampleRate: string;
    bitDepth: string;
    ioSettings: string;
    interleaved: boolean;
  };
  forceCloseSession?: boolean;
  tracks: {
    names: string[];
    type: string;
    format: string;
    timebase: string;
  };
  audioFiles?: Array<{ name: string; originalName?: string; path: string }>;
};

export async function POST(request: Request) {
  let body: ProjectRequest;
  try {
    body = (await request.json()) as ProjectRequest;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  if (!body?.session?.name || !body.session.location) {
    return NextResponse.json(
      { ok: false, error: "Session name and location are required." },
      { status: 400 }
    );
  }

  async function resolveSessionName(location: string, name: string) {
    const normalizedName = name.trim();
    if (!normalizedName) return name;
    const baseName = normalizedName.replace(/\.ptx$/i, "");
    const sessionFile = `${baseName}.ptx`;
    const sessionPath = path.join(location, sessionFile);

    try {
      await access(sessionPath);
      // File exists, fall through to auto-unique below.
    } catch {
      return baseName;
    }

    let existingNames: Set<string> = new Set();
    try {
      const entries = await readdir(location);
      existingNames = new Set(
        entries
          .filter((entry) => entry.toLowerCase().endsWith(".ptx"))
          .map((entry) => entry.replace(/\.ptx$/i, "").toLowerCase())
      );
    } catch {
      existingNames = new Set([baseName.toLowerCase()]);
    }

    if (!existingNames.has(baseName.toLowerCase())) {
      return baseName;
    }

    for (let i = 2; i < 100; i += 1) {
      const candidate = `${baseName}-${i}`;
      if (!existingNames.has(candidate.toLowerCase())) {
        return candidate;
      }
    }

    return `${baseName}-${Date.now()}`;
  }

  try {
    const normalizedLocation = path.resolve(body.session.location);
    await mkdir(normalizedLocation, { recursive: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? `Unable to create session folder: ${error.message}`
            : "Unable to create session folder.",
      },
      { status: 500 }
    );
  }

  const audioFiles = body.audioFiles ?? [];

  const resolvedSessionName = await resolveSessionName(
    path.resolve(body.session.location),
    body.session.name
  );
  const renamedSession = resolvedSessionName !== body.session.name;

  const allowWrites = getAllowWrites();
  const derivedTrackNames = audioFiles.map((file) => {
    const source = file.originalName || file.name;
    return source.replace(/\.[^/.]+$/, "").trim();
  });
  const trackNameCounts = new Map<string, number>();
  const uniqueTrackNames = derivedTrackNames.map((name) => {
    const base = name || "Audio";
    const count = (trackNameCounts.get(base) ?? 0) + 1;
    trackNameCounts.set(base, count);
    return count > 1 ? `${base}-${count}` : base;
  });

  const trackNames = body.tracks?.names?.length
    ? body.tracks.names
    : uniqueTrackNames;

  const needsTracks = trackNames.length > 0;
  const requiredGroups = needsTracks ? ["session", "track_structure"] : ["session"];

  if (!hasWritePermissions(allowWrites, requiredGroups)) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Write operation blocked. Set PROTOOLS_ALLOW_WRITES to include session and track_structure (or use all).",
      },
      { status: 500 }
    );
  }

  if (body.forceCloseSession) {
    const closeResult = await runMcpTool(
      "ptsl_command",
      {
        command: "CloseSession",
        params: { save_on_close: false },
      },
      allowWrites
    );
    if (!closeResult.ok) {
      return NextResponse.json(
        { ok: false, error: closeResult.error || "Unable to close session." },
        { status: 500 }
      );
    }
  }

  const sessionResult = await runMcpTool("ptsl_command", {
    command: "CreateSession",
    params: {
      session_name: resolvedSessionName,
      create_from_template: false,
      create_from_aaf: false,
      path_to_aaf: "",
      file_type: body.session.fileType,
      sample_rate: body.session.sampleRate,
      input_output_settings: body.session.ioSettings,
      is_interleaved: body.session.interleaved,
      session_location: body.session.location,
      is_cloud_project: false,
      bit_depth: body.session.bitDepth,
    },
  }, allowWrites);

  if (!sessionResult.ok) {
    return NextResponse.json(sessionResult, { status: 500 });
  }

  const createdTracks: Array<{ name: string; result: unknown; trackIds: string[] }> = [];
  if (needsTracks) {
    for (const name of trackNames) {
      if (!name) continue;
      const trackResult = await runMcpTool(
        "ptsl_command",
        {
          command: "CreateNewTracks",
          params: {
            number_of_tracks: 1,
            track_name: name,
            track_format: body.tracks.format,
            track_type: body.tracks.type,
            track_timebase: body.tracks.timebase,
          },
        },
        allowWrites
      );

      if (!trackResult.ok) {
        return NextResponse.json(
          {
            ok: false,
            error: `Failed to create track "${name}": ${trackResult.error}`,
            result: {
              session: sessionResult.result,
              tracks: createdTracks,
            },
          },
          { status: 500 }
        );
      }

      const responseBody =
        (trackResult.result as { response?: { response_body?: any } })?.response
          ?.response_body ?? (trackResult.result as { response_body?: any })?.response_body;
      const trackIds = Array.isArray(responseBody?.created_track_ids)
        ? responseBody.created_track_ids
        : [];
      createdTracks.push({ name, result: trackResult.result, trackIds });
    }
  }

  const saveResult = await runMcpTool("save_session", {}, allowWrites);
  if (!saveResult.ok) {
    return NextResponse.json(
      { ok: false, error: saveResult.error || "Unable to save session." },
      { status: 500 }
    );
  }

  let importedFilesCount = 0;
  if (audioFiles.length > 0) {
    const sessionDir = path.resolve(body.session.location);
    const audioDir = path.join(sessionDir, resolvedSessionName, "Audio Files");
    await mkdir(audioDir, { recursive: true });
    const sourcePaths = audioFiles.map((file) => file.path);
    const importResult = await importAudioToClipList(
      sourcePaths,
      audioDir,
      "AOperations_CopyAudio"
    );
    if (!importResult.ok) {
      const failureList = (importResult as { failureList?: string[] }).failureList;
      const rawImport = (importResult as { raw?: unknown }).raw;
      const missingRawNote =
        rawImport == null
          ? " PTSL returned no response body — rebuild MCP server."
          : "";
      const debug = {
        sourcePaths,
        destinationPath: audioDir,
        failureList: failureList ?? [],
        raw: rawImport ?? null,
      };
      return NextResponse.json(
        {
          ok: false,
          error: `${importResult.error || "Unable to import audio files."}${missingRawNote}`,
          debug,
          result: {
            session: sessionResult.result,
            tracks: createdTracks,
          },
        },
        { status: 500 }
      );
    }

    const nameMap = new Map<string, string>();
    sourcePaths.forEach((filePath, index) => {
      const base = derivedTrackNames[index] || "Audio";
      nameMap.set(filePath, trackNames[index] || base);
    });

    for (const clip of importResult.clips) {
      const trackName = nameMap.get(clip.originalPath);
      if (!trackName || clip.clipIds.length === 0) continue;
      const spotResult = await spotClipsByName(clip.clipIds, trackName, {
        location: "0",
        timeType: "TLType_Samples",
        locationType: "SLType_Start",
      });
      if (!spotResult.ok) {
        return NextResponse.json(
          {
            ok: false,
            error: spotResult.error || "Unable to spot clips onto tracks.",
            result: {
              session: sessionResult.result,
              tracks: createdTracks,
            },
          },
          { status: 500 }
        );
      }
    }
    importedFilesCount = importResult.clips.length;
  }

  return NextResponse.json(
    {
      ok: true,
      result: {
        session: sessionResult.result,
        sessionNameUsed: resolvedSessionName,
        sessionRenamed: renamedSession,
        tracks: createdTracks,
        audioFilesImported: importedFilesCount,
      },
    },
    { status: 200 }
  );
}
