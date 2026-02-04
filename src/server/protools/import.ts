import { getAllowWrites, runMcpTool } from "@/server/protools/mcp";

export type ImportedClip = {
  originalPath: string;
  destinationPath?: string;
  clipIds: string[];
};

export async function importAudioToClipList(
  fileList: string[],
  destinationPath?: string,
  audioOperations: "AOperations_CopyAudio" | "AOperations_AddAudio" | "AOperations_ConvertAudio" =
    "AOperations_CopyAudio"
) {
  const allowWrites = getAllowWrites();
  const result = await runMcpTool(
    "import_audio_to_clip_list",
    {
      file_list: fileList,
      destination_path: destinationPath ?? "",
      audio_operations: audioOperations,
    },
    allowWrites
  );

  if (!result.ok) {
    return { ok: false, error: result.error || "Import failed.", clips: [] as ImportedClip[] };
  }

  const responseBody =
    (result.result as { response?: { response_body?: any } })?.response
      ?.response_body ??
    (result.result as { response_body?: any })?.response_body;

  const imported: ImportedClip[] = Array.isArray(responseBody?.file_list)
    ? responseBody.file_list.map((entry: any) => {
        const destination = entry.destination_file_list?.[0];
        return {
          originalPath: entry.original_input_path ?? "",
          destinationPath: destination?.file_path,
          clipIds: destination?.clip_id_list ?? [],
        };
      })
    : [];

  const failureList = Array.isArray(responseBody?.failure_list)
    ? responseBody.failure_list
    : [];

  if (failureList.length > 0 || imported.length === 0) {
    return {
      ok: false,
      error: "No audio files were imported.",
      clips: imported,
      failureList,
      raw: result.result,
    };
  }

  return { ok: true, clips: imported, raw: result.result };
}

export async function spotClipsByName(
  clipIds: string[],
  trackName: string,
  options?: {
    location?: string;
    timeType?: "TLType_Samples" | "TLType_BarsBeats" | "TLType_TimeCode";
    locationType?: "SLType_Start" | "SLType_SyncPoint" | "SLType_End";
  }
) {
  const allowWrites = getAllowWrites();
  return await runMcpTool(
    "spot_clips_by_id",
    {
      src_clips: clipIds,
      dst_track_name: trackName,
      location: options?.location ?? "0",
      time_type: options?.timeType ?? "TLType_Samples",
      location_type: options?.locationType ?? "SLType_Start",
    },
    allowWrites
  );
}
