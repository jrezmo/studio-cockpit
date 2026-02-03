import type { StateCreator } from "zustand";
import type { Panel } from "@/shared/types/projects";
import type { StudioState } from "../types";

export type UiSlice = {
  activePanel: Panel;
  setActivePanel: (panel: Panel) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
};

export const createUiSlice: StateCreator<StudioState, [], [], UiSlice> = (set) => ({
  activePanel: "clients",
  setActivePanel: (panel) => set({ activePanel: panel }),
  sidebarCollapsed: false,
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
});
