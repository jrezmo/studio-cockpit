import { NextResponse } from "next/server";
import { mkdir } from "fs/promises";
import path from "path";
import {
  getAllowWrites,
  hasWritePermissions,
  runMcpTool,
} from "@/server/protools/mcp";
import { importAudioToClipList, spotClipsById } from "@/server/protools/import";

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
  tracks: {
    names: string[];
    type: string;
    format: string;
    timebase: string;
  };
  audioFiles?: Array<{ name: string; path: string }>;
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

  const allowWrites = getAllowWrites();
  const needsTracks = body.tracks?.names?.length > 0;
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

  const sessionResult = await runMcpTool("ptsl_command", {
    command: "CreateSession",
    params: {
      session_name: body.session.name,
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
    for (const name of body.tracks.names) {
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

  let importedClipsCount = 0;
  if (audioFiles.length > 0) {
    const sessionDir = path.resolve(body.session.location);
    const audioDir = path.join(sessionDir, "Audio Files");
    const importResult = await importAudioToClipList(
      audioFiles.map((file) => file.path),
      audioDir,
      "AOperations_CopyAudio"
    );

    if (!importResult.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: importResult.error || "Unable to import audio files.",
          result: {
            session: sessionResult.result,
            tracks: createdTracks,
          },
        },
        { status: 500 }
      );
    }

    importedClipsCount = importResult.clips.reduce(
      (total, clip) => total + clip.clipIds.length,
      0
    );

    const trackIdByName = new Map<string, string>();
    createdTracks.forEach((track) => {
      if (track.trackIds[0]) {
        trackIdByName.set(track.name, track.trackIds[0]);
      }
    });

    for (const clip of importResult.clips) {
      const fileName = clip.originalPath.split(/[\\/]/).pop() ?? clip.originalPath;
      const trackName = fileName.replace(/\.[^/.]+$/, "");
      const trackId = trackIdByName.get(trackName);
      if (!trackId || clip.clipIds.length === 0) continue;

      const spotResult = await spotClipsById(clip.clipIds, {
        trackId,
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
  }

  return NextResponse.json(
    {
      ok: true,
      result: {
        session: sessionResult.result,
        tracks: createdTracks,
        audioFilesImported: importedClipsCount,
      },
    },
    { status: 200 }
  );
}
