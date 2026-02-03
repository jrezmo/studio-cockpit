import type { StateCreator } from "zustand";
import type { IngestRecord } from "@/shared/types/projects";
import type { StudioState } from "../types";
import { mockIngestHistory } from "../mock/ingest";

export type IngestSlice = {
  ingestHistory: IngestRecord[];
  ingestWatcherActive: boolean;
  setIngestWatcherActive: (active: boolean) => void;
  addIngestRecord: (record: IngestRecord) => void;
  setIngestHistory: (records: IngestRecord[]) => void;
};

export const createIngestSlice: StateCreator<StudioState, [], [], IngestSlice> = (set) => ({
  ingestHistory: mockIngestHistory,
  ingestWatcherActive: true,
  setIngestWatcherActive: (active) => set({ ingestWatcherActive: active }),
  addIngestRecord: (record) =>
    set((state) => ({
      ingestHistory: [record, ...state.ingestHistory].slice(0, 200),
    })),
  setIngestHistory: (records) => set({ ingestHistory: records }),
});
