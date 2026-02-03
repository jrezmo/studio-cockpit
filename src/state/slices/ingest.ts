import type { StateCreator } from "zustand";
import type { IngestRecord } from "@/shared/types/projects";
import type { StudioState } from "../types";
import { mockIngestHistory } from "../mock/ingest";

export type IngestSlice = {
  ingestHistory: IngestRecord[];
  sessionPrepFolder: string;
  setSessionPrepFolder: (path: string) => void;
  addIngestRecord: (record: IngestRecord) => void;
  setIngestHistory: (records: IngestRecord[]) => void;
};

export const createIngestSlice: StateCreator<StudioState, [], [], IngestSlice> = (set) => ({
  ingestHistory: mockIngestHistory,
  sessionPrepFolder: "",
  setSessionPrepFolder: (path) => set({ sessionPrepFolder: path }),
  addIngestRecord: (record) =>
    set((state) => ({
      ingestHistory: [record, ...state.ingestHistory].slice(0, 200),
    })),
  setIngestHistory: (records) => set({ ingestHistory: records }),
});
