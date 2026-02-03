export type CodexPluginInstance = {
  pluginId?: string;
  name: string;
  vendor?: string;
  version?: string;
  format?: string;
  slot?: string;
  preset?: string;
  active?: boolean;
};

export type CodexTrack = {
  id: string;
  name: string;
  type?: string;
  format?: string;
  plugins?: CodexPluginInstance[];
  notes?: string;
};

export type CodexPluginUsage = {
  pluginId: string;
  name: string;
  vendor?: string;
  version?: string;
  format?: string;
  count: number;
  trackCount: number;
};

export type CodexSessionSource = {
  type: "protools" | "archive" | "manual" | "import";
  path?: string;
  ingestedAt?: string;
  extractor?: string;
};

export type CodexSession = {
  id: string;
  fingerprint: string;
  name: string;
  artist?: string;
  project?: string;
  path?: string;
  createdAt?: string;
  updatedAt?: string;
  sampleRate?: number;
  bitDepth?: number;
  bpm?: number;
  key?: string;
  durationSeconds?: number;
  notes?: string;
  tags?: string[];
  tracks: CodexTrack[];
  plugins: CodexPluginUsage[];
  sources?: CodexSessionSource[];
};

export type CodexData = {
  sessions: CodexSession[];
  lastIngestedAt?: string;
};

export type CodexIngestPayload = CodexSession | CodexSession[];
