import type { StateCreator } from "zustand";
import type { ProToolsSessionEvent } from "@/shared/types/projects";
import type { StudioState } from "../types";

export type ProToolsSlice = {
  lastProToolsSessionCreated: ProToolsSessionEvent | null;
  setLastProToolsSessionCreated: (event: ProToolsSessionEvent) => void;
};

export const createProToolsSlice: StateCreator<StudioState, [], [], ProToolsSlice> = (set) => ({
  lastProToolsSessionCreated: null,
  setLastProToolsSessionCreated: (event) =>
    set({ lastProToolsSessionCreated: event }),
});
