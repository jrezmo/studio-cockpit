"use client";

import { useStudioStore } from "@/state/store";
import { formatBytes } from "@/shared/format";
import { StatusWidget } from "./StatusWidget";
import { ProjectCard } from "./ProjectCard";
import { Button } from "@/shared/ui/button";
import { FolderInput, PlugZap, AudioLines, RefreshCw } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

export function DashboardPanel() {
  const { projects, ingestHistory, sessionPrepFolder, settings, setActivePanel } =
    useStudioStore(
      useShallow((s) => ({
        projects: s.projects,
        ingestHistory: s.ingestHistory,
        sessionPrepFolder: s.sessionPrepFolder,
        settings: s.settings,
        setActivePanel: s.setActivePanel,
      }))
    );

  const totalSize = projects.reduce((sum, p) => sum + p.sizeBytes, 0);
  const activeProjects = projects.filter(
    (p) => p.status === "active" || p.status === "mixing"
  ).length;
  const recentErrors = ingestHistory.filter((r) => r.status === "error").length;
  const prepFolder = sessionPrepFolder || settings.downloadsPath;
  const prepStatus = sessionPrepFolder ? "Ready" : "Select Folder";

  return (
    <div className="space-y-6">
      {/* Status row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatusWidget
          label="Session File Prep"
          value={prepStatus}
          status={sessionPrepFolder ? "green" : "yellow"}
          detail={prepFolder}
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
          label="Prep Errors"
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
          Session File Prep
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setActivePanel("protools")}
        >
          <PlugZap className="mr-2 h-3.5 w-3.5" />
          Pro Tools
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
