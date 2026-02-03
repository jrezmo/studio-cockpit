"use client";

import { useStudioStore } from "@/lib/store";
import { formatBytes } from "@/lib/format";
import { StatusWidget } from "./StatusWidget";
import { ProjectCard } from "./ProjectCard";
import { Button } from "@/components/ui/button";
import { FolderInput, Play, AudioLines, RefreshCw } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

export function DashboardPanel() {
  const { projects, ingestHistory, ingestWatcherActive, setActivePanel } =
    useStudioStore(
      useShallow((s) => ({
        projects: s.projects,
        ingestHistory: s.ingestHistory,
        ingestWatcherActive: s.ingestWatcherActive,
        setActivePanel: s.setActivePanel,
      }))
    );

  const totalSize = projects.reduce((sum, p) => sum + p.sizeBytes, 0);
  const activeProjects = projects.filter(
    (p) => p.status === "active" || p.status === "mixing"
  ).length;
  const recentErrors = ingestHistory.filter((r) => r.status === "error").length;

  return (
    <div className="space-y-6">
      {/* Status row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatusWidget
          label="Ingest Agent"
          value={ingestWatcherActive ? "Watching" : "Paused"}
          status={ingestWatcherActive ? "green" : "yellow"}
          detail="~/Downloads"
        />
        <StatusWidget
          label="Pro Tools"
          value="Connected"
          status="green"
          detail="v2024.6 — idle"
        />
        <StatusWidget
          label="Active Projects"
          value={`${activeProjects}`}
          status={activeProjects > 0 ? "green" : "yellow"}
          detail={`${formatBytes(totalSize)} total`}
        />
        <StatusWidget
          label="Ingest Errors"
          value={`${recentErrors}`}
          status={recentErrors > 0 ? "red" : "green"}
          detail={`${ingestHistory.length} files processed`}
        />
      </div>

      {/* Quick actions */}
      <div className="flex items-center gap-3">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setActivePanel("ingest")}
        >
          <FolderInput className="mr-2 h-3.5 w-3.5" />
          Ingest Files
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setActivePanel("sessions")}
        >
          <Play className="mr-2 h-3.5 w-3.5" />
          Launch Session
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setActivePanel("stems")}
        >
          <AudioLines className="mr-2 h-3.5 w-3.5" />
          Print Stems
        </Button>
        <Button size="sm" variant="outline" className="ml-auto">
          <RefreshCw className="mr-2 h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {/* Project grid */}
      <div>
        <h2 className="mb-3 text-sm font-semibold tracking-tight">Projects</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </div>
    </div>
  );
}
