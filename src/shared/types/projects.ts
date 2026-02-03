export type ProjectStatus = "active" | "mixing" | "review" | "delivered";
export type IngestStatus = "success" | "pending" | "error";
export type WorkflowStepStatus = "todo" | "inProgress" | "done";
export type Panel =
  | "clients"
  | "ingest"
  | "stems"
  | "settings"
  | "protools"
  | "sessionStats"
  | "mixingWorkflow";

export interface Project {
  id: string;
  artistName: string;
  projectName: string;
  folderPath: string;
  sampleRate: number;
  bpm: number;
  songCount: number;
  sizeBytes: number;
  status: ProjectStatus;
  updatedAt: string;
}

export interface IngestRecord {
  id: string;
  fileName: string;
  sourcePath: string;
  destPath: string;
  fileType: string;
  status: IngestStatus;
  sizeBytes: number;
  ingestedAt: string;
}

export interface Settings {
  downloadsPath: string;
  artistFoldersPath: string;
  templatesPath: string;
  stemsOutputPath: string;
}

export interface WorkflowStep {
  id: string;
  title: string;
  detail: string;
  status: WorkflowStepStatus;
  updatedAt?: string;
  completedAt?: string;
  notes?: string;
}

export interface ProToolsSessionEvent {
  name: string;
  location: string;
  sampleRate?: string;
  bitDepth?: string;
  fileType?: string;
  ioSettings?: string;
  interleaved?: boolean;
  createdAt: string;
}
