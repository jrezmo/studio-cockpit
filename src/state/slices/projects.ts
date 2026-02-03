import type { StateCreator } from "zustand";
import type { Project } from "@/shared/types/projects";
import type { StudioState } from "../types";
import { mockProjects } from "../mock/projects";

export type ProjectSlice = {
  projects: Project[];
};

export const createProjectSlice: StateCreator<StudioState, [], [], ProjectSlice> = () => ({
  projects: mockProjects,
});
