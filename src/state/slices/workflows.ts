import type { StateCreator } from "zustand";
import type { WorkflowStep, WorkflowStepStatus } from "@/shared/types/projects";
import type { StudioState } from "../types";
import { mockProjects } from "../mock/projects";
import {
  createMixingWorkflowSteps,
  createMixingWorkflowsByProject,
} from "../mock/workflows";

export type WorkflowSlice = {
  mixingWorkflowByProject: Record<string, WorkflowStep[]>;
  activeMixingWorkflowProjectId: string;
  setActiveMixingWorkflowProjectId: (projectId: string) => void;
  setMixingWorkflowStepStatus: (
    projectId: string,
    stepId: string,
    status: WorkflowStepStatus
  ) => void;
  setMixingWorkflowStepNotes: (
    projectId: string,
    stepId: string,
    notes: string
  ) => void;
  resetMixingWorkflow: (projectId: string) => void;
};

export const createWorkflowSlice: StateCreator<StudioState, [], [], WorkflowSlice> = (set) => ({
  mixingWorkflowByProject: createMixingWorkflowsByProject(mockProjects),
  activeMixingWorkflowProjectId: mockProjects[0]?.id ?? "",
  setActiveMixingWorkflowProjectId: (projectId) =>
    set({ activeMixingWorkflowProjectId: projectId }),
  setMixingWorkflowStepStatus: (projectId, stepId, status) =>
    set((state) => {
      const steps =
        state.mixingWorkflowByProject[projectId] ?? createMixingWorkflowSteps();
      let didChange = false;
      const nextSteps = steps.map((step) => {
        if (step.id !== stepId || step.status === status) {
          return step;
        }
        didChange = true;
        const now = new Date().toISOString();
        return {
          ...step,
          status,
          updatedAt: now,
          completedAt: status === "done" ? now : undefined,
        };
      });
      if (!didChange) {
        return state;
      }
      return {
        mixingWorkflowByProject: {
          ...state.mixingWorkflowByProject,
          [projectId]: nextSteps,
        },
      };
    }),
  setMixingWorkflowStepNotes: (projectId, stepId, notes) =>
    set((state) => {
      const steps =
        state.mixingWorkflowByProject[projectId] ?? createMixingWorkflowSteps();
      return {
        mixingWorkflowByProject: {
          ...state.mixingWorkflowByProject,
          [projectId]: steps.map((step) =>
            step.id === stepId ? { ...step, notes } : step
          ),
        },
      };
    }),
  resetMixingWorkflow: (projectId) =>
    set((state) => ({
      mixingWorkflowByProject: {
        ...state.mixingWorkflowByProject,
        [projectId]: createMixingWorkflowSteps(),
      },
    })),
});
