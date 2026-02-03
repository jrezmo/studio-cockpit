import { create } from "zustand";
import { persist } from "zustand/middleware";
import { seedCrmData } from "@/lib/crm/seed";
import { seedCodexData } from "@/lib/codex/seed";
import type {
  Client,
  ClientCorrespondence,
  ClientProject,
  ClientSession,
  ClientTask,
  CrmData,
} from "@/lib/crm/types";
import type { CodexData, CodexSession } from "@/lib/codex/types";

export type ProjectStatus = "active" | "mixing" | "review" | "delivered";
export type IngestStatus = "success" | "pending" | "error";
export type Panel =
  | "dashboard"
  | "clients"
  | "ingest"
  | "stems"
  | "settings"
  | "protools"
  | "codex";
export type ClientsView = "logbook" | "board" | "console";

export interface Project {
  id: string;
  artistName: string;
  projectName: string;
  folderPath: string;
  sampleRate: number;
  bpm: number;
  songCount: number;
  sizeBytes: number;
  status: ProjectStatus;
  updatedAt: string;
}

export interface IngestRecord {
  id: string;
  fileName: string;
  sourcePath: string;
  destPath: string;
  fileType: string;
  status: IngestStatus;
  sizeBytes: number;
  ingestedAt: string;
}

export interface Settings {
  downloadsPath: string;
  artistFoldersPath: string;
  templatesPath: string;
  stemsOutputPath: string;
}

interface StudioState {
  // Projects
  projects: Project[];

  // Ingest
  ingestHistory: IngestRecord[];
  ingestWatcherActive: boolean;
  setIngestWatcherActive: (active: boolean) => void;

  // Settings
  settings: Settings;
  updateSettings: (settings: Partial<Settings>) => void;

  // Clients / CRM
  clients: Client[];
  clientProjects: ClientProject[];
  clientSessions: ClientSession[];
  clientTasks: ClientTask[];
  clientCorrespondence: ClientCorrespondence[];
  activeClientId: string;
  setActiveClientId: (clientId: string) => void;
  setCrmData: (data: CrmData) => void;
  clientsView: ClientsView;
  setClientsView: (view: ClientsView) => void;

  // Codex
  codexSessions: CodexSession[];
  codexLastIngestedAt: string | null;
  setCodexData: (data: CodexData) => void;

  // UI
  activePanel: Panel;
  setActivePanel: (panel: Panel) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

const mockProjects: Project[] = [
  {
    id: "proj-1",
    artistName: "Ava Monroe",
    projectName: "Midnight Electric",
    folderPath: "/Volumes/Studio/Artists/Ava Monroe/Midnight Electric",
    sampleRate: 48000,
    bpm: 124,
    songCount: 12,
    sizeBytes: 87_400_000_000,
    status: "mixing",
    updatedAt: "2026-01-28T14:30:00Z",
  },
  {
    id: "proj-2",
    artistName: "The Velvet Horns",
    projectName: "Brass & Bones",
    folderPath: "/Volumes/Studio/Artists/The Velvet Horns/Brass & Bones",
    sampleRate: 96000,
    bpm: 98,
    songCount: 9,
    sizeBytes: 142_000_000_000,
    status: "active",
    updatedAt: "2026-01-31T09:15:00Z",
  },
  {
    id: "proj-3",
    artistName: "DJ Kael",
    projectName: "Low Frequency",
    folderPath: "/Volumes/Studio/Artists/DJ Kael/Low Frequency",
    sampleRate: 44100,
    bpm: 140,
    songCount: 8,
    sizeBytes: 34_200_000_000,
    status: "review",
    updatedAt: "2026-01-25T16:45:00Z",
  },
  {
    id: "proj-4",
    artistName: "Sierra Wells",
    projectName: "Quiet Thunder",
    folderPath: "/Volumes/Studio/Artists/Sierra Wells/Quiet Thunder",
    sampleRate: 48000,
    bpm: 72,
    songCount: 10,
    sizeBytes: 68_900_000_000,
    status: "delivered",
    updatedAt: "2026-01-20T11:00:00Z",
  },
];

const mockIngestHistory: IngestRecord[] = [
  {
    id: "ing-1",
    fileName: "AvaMonroe_Vocal_Take3.wav",
    sourcePath: "~/Downloads/AvaMonroe_Vocal_Take3.wav",
    destPath: "/Volumes/Studio/Artists/Ava Monroe/Midnight Electric/Audio Files/AvaMonroe_Vocal_Take3.wav",
    fileType: "wav",
    status: "success",
    sizeBytes: 245_000_000,
    ingestedAt: "2026-01-31T10:22:00Z",
  },
  {
    id: "ing-2",
    fileName: "BrassSection_Stems.zip",
    sourcePath: "~/Downloads/BrassSection_Stems.zip",
    destPath: "/Volumes/Studio/Artists/The Velvet Horns/Brass & Bones/Imports/BrassSection_Stems.zip",
    fileType: "zip",
    status: "success",
    sizeBytes: 1_800_000_000,
    ingestedAt: "2026-01-31T09:15:00Z",
  },
  {
    id: "ing-3",
    fileName: "Kael_Master_Rev2.wav",
    sourcePath: "~/Downloads/Kael_Master_Rev2.wav",
    destPath: "/Volumes/Studio/Artists/DJ Kael/Low Frequency/Bounces/Kael_Master_Rev2.wav",
    fileType: "wav",
    status: "success",
    sizeBytes: 52_000_000,
    ingestedAt: "2026-01-30T15:40:00Z",
  },
  {
    id: "ing-4",
    fileName: "unknown_session.ptx",
    sourcePath: "~/Downloads/unknown_session.ptx",
    destPath: "",
    fileType: "ptx",
    status: "error",
    sizeBytes: 3_200_000,
    ingestedAt: "2026-01-30T14:10:00Z",
  },
  {
    id: "ing-5",
    fileName: "SierraWells_Piano_Final.wav",
    sourcePath: "~/Downloads/SierraWells_Piano_Final.wav",
    destPath: "/Volumes/Studio/Artists/Sierra Wells/Quiet Thunder/Audio Files/SierraWells_Piano_Final.wav",
    fileType: "wav",
    status: "success",
    sizeBytes: 189_000_000,
    ingestedAt: "2026-01-29T11:30:00Z",
  },
];


export const useStudioStore = create<StudioState>()(
  persist(
    (set) => ({
      projects: mockProjects,
      ingestHistory: mockIngestHistory,
      ingestWatcherActive: true,
      setIngestWatcherActive: (active) => set({ ingestWatcherActive: active }),
      settings: {
        downloadsPath: "~/Downloads",
        artistFoldersPath: "/Volumes/Studio/Artists",
        templatesPath: "/Volumes/Studio/Templates",
        stemsOutputPath: "/Volumes/Studio/Stems",
      },
      updateSettings: (partial) =>
        set((state) => ({ settings: { ...state.settings, ...partial } })),
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
      clientsView: "logbook",
      setClientsView: (view) => set({ clientsView: view }),
      codexSessions: seedCodexData.sessions,
      codexLastIngestedAt: seedCodexData.lastIngestedAt ?? null,
      setCodexData: (data) =>
        set({
          codexSessions: data.sessions,
          codexLastIngestedAt: data.lastIngestedAt ?? null,
        }),
      activePanel: "dashboard",
      setActivePanel: (panel) => set({ activePanel: panel }),
      sidebarCollapsed: false,
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
    }),
    { name: "studio-cockpit-storage" }
  )
);
