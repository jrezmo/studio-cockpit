import { create } from "zustand";
import { persist } from "zustand/middleware";
import { seedCrmData } from "@/lib/crm/seed";
import { seedSessionStatsData } from "@/lib/session-stats/seed";
import type {
  Client,
  ClientCorrespondence,
  ClientProject,
  ClientSession,
  ClientTask,
  CrmData,
} from "@/lib/crm/types";
import type {
  SessionStatsData,
  SessionStatsSession,
} from "@/lib/session-stats/types";

export type ProjectStatus = "active" | "mixing" | "review" | "delivered";
export type IngestStatus = "success" | "pending" | "error";
export type WorkflowStepStatus = "todo" | "inProgress" | "done";
export type Panel =
  | "dashboard"
  | "clients"
  | "ingest"
  | "stems"
  | "settings"
  | "protools"
  | "sessionStats"
  | "mixingWorkflow";
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

export interface WorkflowStep {
  id: string;
  title: string;
  detail: string;
  status: WorkflowStepStatus;
  updatedAt?: string;
  completedAt?: string;
  notes?: string;
}

export interface ProToolsSessionEvent {
  name: string;
  location: string;
  sampleRate?: string;
  bitDepth?: string;
  fileType?: string;
  ioSettings?: string;
  interleaved?: boolean;
  createdAt: string;
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

  // Session Stats
  sessionStatsSessions: SessionStatsSession[];
  sessionStatsLastIngestedAt: string | null;
  setSessionStatsData: (data: SessionStatsData) => void;

  // Mixing Workflow
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

  // Pro Tools Events
  lastProToolsSessionCreated: ProToolsSessionEvent | null;
  setLastProToolsSessionCreated: (event: ProToolsSessionEvent) => void;

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

const createMixingWorkflowSteps = (): WorkflowStep[] => [
  {
    id: "mix-step-1",
    title: "Collect source files",
    detail:
      "Download audio files and the Pro Tools session from the transfer service.",
    status: "todo",
  },
  {
    id: "mix-step-2",
    title: "Place files in artist folder",
    detail:
      "Unzip and move to the artist folder on the session drive (waves go in Uploaded Tracks).",
    status: "todo",
  },
  {
    id: "mix-step-3",
    title: "Clear downloads",
    detail:
      "Delete the original download so Pro Tools won’t reference the wrong location.",
    status: "todo",
  },
  {
    id: "mix-step-4",
    title: "Create new session",
    detail:
      "Start a new Pro Tools session with the correct sample rate and mix template I/O.",
    status: "todo",
  },
  {
    id: "mix-step-5",
    title: "Import audio",
    detail: "Import WAVs into the new session.",
    status: "todo",
  },
  {
    id: "mix-step-6",
    title: "Import template routing",
    detail:
      "Import session data from the mix template (routing, I/O, and recurring settings).",
    status: "todo",
  },
  {
    id: "mix-step-7",
    title: "Organize multitracks",
    detail:
      "Route and move tracks into their folders (kick in/out, drums, etc.) before mixing.",
    status: "todo",
  },
];

const createMixingWorkflowsByProject = (projects: Project[]) =>
  Object.fromEntries(projects.map((project) => [project.id, createMixingWorkflowSteps()]));

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
      sessionStatsSessions: seedSessionStatsData.sessions,
      sessionStatsLastIngestedAt: seedSessionStatsData.lastIngestedAt ?? null,
      setSessionStatsData: (data) =>
        set({
          sessionStatsSessions: data.sessions,
          sessionStatsLastIngestedAt: data.lastIngestedAt ?? null,
        }),
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
      lastProToolsSessionCreated: null,
      setLastProToolsSessionCreated: (event) =>
        set({ lastProToolsSessionCreated: event }),
      activePanel: "dashboard",
      setActivePanel: (panel) => set({ activePanel: panel }),
      sidebarCollapsed: false,
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
    }),
    { name: "studio-cockpit-storage" }
  )
);
