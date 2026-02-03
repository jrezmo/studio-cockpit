import type { StateCreator } from "zustand";
import { seedCrmData } from "@/features/clients/seed";
import type {
  Client,
  ClientCorrespondence,
  ClientProject,
  ClientSession,
  ClientTask,
  CrmData,
} from "@/features/clients/types";
import type { StudioState } from "../types";

export type CrmSlice = {
  clients: Client[];
  clientProjects: ClientProject[];
  clientSessions: ClientSession[];
  clientTasks: ClientTask[];
  clientCorrespondence: ClientCorrespondence[];
  activeClientId: string;
  setActiveClientId: (clientId: string) => void;
  setCrmData: (data: CrmData) => void;
};

export const createCrmSlice: StateCreator<StudioState, [], [], CrmSlice> = (set) => ({
  clients: seedCrmData.clients,
  clientProjects: seedCrmData.clientProjects,
  clientSessions: seedCrmData.clientSessions,
  clientTasks: seedCrmData.clientTasks,
  clientCorrespondence: seedCrmData.clientCorrespondence,
  activeClientId: seedCrmData.clients[0]?.id ?? "",
  setActiveClientId: (clientId) => set({ activeClientId: clientId }),
  setCrmData: (data) =>
    set((state) => ({
      clients: data.clients,
      clientProjects: data.clientProjects,
      clientSessions: data.clientSessions,
      clientTasks: data.clientTasks,
      clientCorrespondence: data.clientCorrespondence,
      activeClientId: data.clients.some((client) => client.id === state.activeClientId)
        ? state.activeClientId
        : data.clients[0]?.id ?? "",
    })),
});
