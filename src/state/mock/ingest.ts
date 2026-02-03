import type { IngestRecord } from "@/shared/types/projects";

export const mockIngestHistory: IngestRecord[] = [
  {
    id: "ing-1",
    fileName: "AvaMonroe_Vocal_Take3.wav",
    sourcePath: "~/Downloads/AvaMonroe_Vocal_Take3.wav",
    destPath:
      "/Volumes/Studio/Artists/Ava Monroe/Midnight Electric/Audio Files/AvaMonroe_Vocal_Take3.wav",
    fileType: "wav",
    status: "success",
    sizeBytes: 245_000_000,
    ingestedAt: "2026-01-31T10:22:00Z",
  },
  {
    id: "ing-2",
    fileName: "BrassSection_Stems.zip",
    sourcePath: "~/Downloads/BrassSection_Stems.zip",
    destPath:
      "/Volumes/Studio/Artists/The Velvet Horns/Brass & Bones/Imports/BrassSection_Stems.zip",
    fileType: "zip",
    status: "success",
    sizeBytes: 1_800_000_000,
    ingestedAt: "2026-01-31T09:15:00Z",
  },
  {
    id: "ing-3",
    fileName: "Kael_Master_Rev2.wav",
    sourcePath: "~/Downloads/Kael_Master_Rev2.wav",
    destPath: "/Volumes/Studio/Artists/DJ Kael/Low Frequency/Bounces/Kael_Master_Rev2.wav",
    fileType: "wav",
    status: "success",
    sizeBytes: 52_000_000,
    ingestedAt: "2026-01-30T15:40:00Z",
  },
  {
    id: "ing-4",
    fileName: "unknown_session.ptx",
    sourcePath: "~/Downloads/unknown_session.ptx",
    destPath: "",
    fileType: "ptx",
    status: "error",
    sizeBytes: 3_200_000,
    ingestedAt: "2026-01-30T14:10:00Z",
  },
  {
    id: "ing-5",
    fileName: "SierraWells_Piano_Final.wav",
    sourcePath: "~/Downloads/SierraWells_Piano_Final.wav",
    destPath:
      "/Volumes/Studio/Artists/Sierra Wells/Quiet Thunder/Audio Files/SierraWells_Piano_Final.wav",
    fileType: "wav",
    status: "success",
    sizeBytes: 189_000_000,
    ingestedAt: "2026-01-29T11:30:00Z",
  },
];
