import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { StudioState } from "./types";
import { createProjectSlice } from "./slices/projects";
import { createIngestSlice } from "./slices/ingest";
import { createSettingsSlice } from "./slices/settings";
import { createCrmSlice } from "./slices/crm";
import { createSessionStatsSlice } from "./slices/session-stats";
import { createWorkflowSlice } from "./slices/workflows";
import { createProToolsSlice } from "./slices/protools";
import { createUiSlice } from "./slices/ui";

export const useStudioStore = create<StudioState>()(
  persist(
    (set, get, api) => ({
      ...createProjectSlice(set, get, api),
      ...createIngestSlice(set, get, api),
      ...createSettingsSlice(set, get, api),
      ...createCrmSlice(set, get, api),
      ...createSessionStatsSlice(set, get, api),
      ...createWorkflowSlice(set, get, api),
      ...createProToolsSlice(set, get, api),
      ...createUiSlice(set, get, api),
    }),
    { name: "studio-cockpit-storage" }
  )
);
