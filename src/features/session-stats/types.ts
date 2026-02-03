export type SessionStatsPluginInstance = {
  pluginId?: string;
  name: string;
  vendor?: string;
  version?: string;
  format?: string;
  slot?: string;
  preset?: string;
  active?: boolean;
};

export type SessionStatsTrack = {
  id: string;
  name: string;
  type?: string;
  format?: string;
  plugins?: SessionStatsPluginInstance[];
  notes?: string;
};

export type SessionStatsPluginUsage = {
  pluginId: string;
  name: string;
  vendor?: string;
  version?: string;
  format?: string;
  count: number;
  trackCount: number;
};

export type SessionStatsSessionSource = {
  type: "protools" | "archive" | "manual" | "import";
  path?: string;
  ingestedAt?: string;
  extractor?: string;
};

export type SessionStatsSession = {
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
  tracks: SessionStatsTrack[];
  plugins: SessionStatsPluginUsage[];
  sources?: SessionStatsSessionSource[];
};

export type SessionStatsData = {
  sessions: SessionStatsSession[];
  lastIngestedAt?: string;
};

export type SessionStatsIngestPayload =
  | SessionStatsSession
  | SessionStatsSession[];
