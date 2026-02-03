import { useEffect, useMemo } from "react";
import { isTauri, invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useShallow } from "zustand/react/shallow";
import { useStudioStore } from "@/lib/store";
import type { IngestRecord, Project, Settings } from "@/lib/types/projects";

type IngestProjectConfig = {
  id: string;
  artistName: string;
  projectName: string;
  folderPath: string;
  updatedAt: string;
};

type IngestConfig = {
  downloadsPath: string;
  artistFoldersPath: string;
  activeProjectId?: string;
  projects: IngestProjectConfig[];
};

type IngestEventPayload = {
  fileName: string;
  sourcePath: string;
  destPath: string;
  fileType: string;
  status: "success" | "pending" | "error";
  sizeBytes: number;
  message?: string;
};

const buildConfig = (
  settings: Settings,
  projects: Project[],
  activeProjectId: string
): IngestConfig => ({
  downloadsPath: settings.downloadsPath,
  artistFoldersPath: settings.artistFoldersPath,
  activeProjectId,
  projects: [...projects]
    .sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
    .map((project) => ({
      id: project.id,
      artistName: project.artistName,
      projectName: project.projectName,
      folderPath: project.folderPath,
      updatedAt: project.updatedAt,
    })),
});

export function useIngestWatcher() {
  const {
    ingestWatcherActive,
    setIngestWatcherActive,
    addIngestRecord,
    settings,
    projects,
    activeProjectId,
  } = useStudioStore(
    useShallow((state) => ({
      ingestWatcherActive: state.ingestWatcherActive,
      setIngestWatcherActive: state.setIngestWatcherActive,
      addIngestRecord: state.addIngestRecord,
      settings: state.settings,
      projects: state.projects,
      activeProjectId: state.activeMixingWorkflowProjectId,
    }))
  );

  const config = useMemo(
    () => buildConfig(settings, projects, activeProjectId),
    [settings, projects, activeProjectId]
  );

  useEffect(() => {
    if (!isTauri()) return;
    const unlisten = listen<IngestEventPayload>("ingest:event", (event) => {
      const payload = event.payload;
      const record: IngestRecord = {
        id: crypto.randomUUID(),
        fileName: payload.fileName,
        sourcePath: payload.sourcePath,
        destPath: payload.destPath || "",
        fileType: payload.fileType,
        status: payload.status,
        sizeBytes: payload.sizeBytes,
        ingestedAt: new Date().toISOString(),
      };
      addIngestRecord(record);
      if (payload.status === "error" && payload.message) {
        console.warn("Ingest error:", payload.message);
      }
    });

    return () => {
      void unlisten.then((fn) => fn());
    };
  }, [addIngestRecord]);

  useEffect(() => {
    if (!isTauri()) return;

    if (!ingestWatcherActive) {
      invoke("stop_ingest_watcher").catch((error) => {
        console.warn("Failed to stop ingest watcher.", error);
      });
      return;
    }

    invoke("start_ingest_watcher", { config }).catch((error) => {
      console.error("Failed to start ingest watcher.", error);
      setIngestWatcherActive(false);
    });
  }, [config, ingestWatcherActive, setIngestWatcherActive]);
}
