import type { StateCreator } from "zustand";
import type { Settings } from "@/shared/types/projects";
import type { StudioState } from "../types";

export type SettingsSlice = {
  settings: Settings;
  updateSettings: (settings: Partial<Settings>) => void;
};

export const createSettingsSlice: StateCreator<StudioState, [], [], SettingsSlice> = (set) => ({
  settings: {
    downloadsPath: "~/Downloads",
    artistFoldersPath: "/Volumes/Studio/Artists",
    templatesPath: "/Volumes/Studio/Templates",
    stemsOutputPath: "/Volumes/Studio/Stems",
  },
  updateSettings: (partial) =>
    set((state) => ({ settings: { ...state.settings, ...partial } })),
});
