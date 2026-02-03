import type { ProjectSlice } from "./slices/projects";
import type { IngestSlice } from "./slices/ingest";
import type { SettingsSlice } from "./slices/settings";
import type { CrmSlice } from "./slices/crm";
import type { SessionStatsSlice } from "./slices/session-stats";
import type { WorkflowSlice } from "./slices/workflows";
import type { ProToolsSlice } from "./slices/protools";
import type { UiSlice } from "./slices/ui";

export type StudioState = ProjectSlice &
  IngestSlice &
  SettingsSlice &
  CrmSlice &
  SessionStatsSlice &
  WorkflowSlice &
  ProToolsSlice &
  UiSlice;
