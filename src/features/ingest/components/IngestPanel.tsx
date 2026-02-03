"use client";

import { useEffect, useMemo, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { isTauri } from "@tauri-apps/api/core";
import { useStudioStore } from "@/state/store";
import { formatBytes } from "@/shared/format";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Badge } from "@/shared/ui/badge";
import { Separator } from "@/shared/ui/separator";
import { cn } from "@/shared/utils";
import {
  FolderOpen,
  FolderInput,
  Link2,
  Sparkles,
  FileAudio,
  FileArchive,
  File,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { useShallow } from "zustand/react/shallow";

const fileIcons: Record<string, React.ElementType> = {
  wav: FileAudio,
  aif: FileAudio,
  ptx: File,
  zip: FileArchive,
};

function getSessionTime(updatedAt?: string, createdAt?: string) {
  return updatedAt ?? createdAt ?? "";
}

export function IngestPanel() {
  const {
    ingestHistory,
    sessionPrepFolder,
    setSessionPrepFolder,
    sessionStatsSessions,
    clients,
    clientProjects,
    settings,
  } = useStudioStore(
    useShallow((s) => ({
      ingestHistory: s.ingestHistory,
      sessionPrepFolder: s.sessionPrepFolder,
      setSessionPrepFolder: s.setSessionPrepFolder,
      sessionStatsSessions: s.sessionStatsSessions,
      clients: s.clients,
      clientProjects: s.clientProjects,
      settings: s.settings,
    }))
  );

  const [prepMode, setPrepMode] = useState<"existing" | "new">("existing");
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [newSessionName, setNewSessionName] = useState("");

  const supportsDialog = typeof window !== "undefined" && isTauri();

  const sortedSessions = useMemo(() => {
    return [...sessionStatsSessions].sort((a, b) => {
      const timeA = new Date(getSessionTime(a.updatedAt, a.createdAt)).getTime();
      const timeB = new Date(getSessionTime(b.updatedAt, b.createdAt)).getTime();
      return (Number.isNaN(timeB) ? 0 : timeB) - (Number.isNaN(timeA) ? 0 : timeA);
    });
  }, [sessionStatsSessions]);

  const sortedClients = useMemo(() => {
    return [...clients].sort((a, b) => a.name.localeCompare(b.name));
  }, [clients]);

  const projectsForClient = useMemo(() => {
    if (!selectedClientId) return [];
    return clientProjects
      .filter((project) => project.clientId === selectedClientId)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [clientProjects, selectedClientId]);

  const activeSession = useMemo(
    () => sortedSessions.find((session) => session.id === selectedSessionId) ?? null,
    [sortedSessions, selectedSessionId]
  );

  const activeClient = useMemo(
    () => sortedClients.find((client) => client.id === selectedClientId) ?? null,
    [sortedClients, selectedClientId]
  );

  const activeProject = useMemo(
    () => projectsForClient.find((project) => project.id === selectedProjectId) ?? null,
    [projectsForClient, selectedProjectId]
  );

  useEffect(() => {
    if (!selectedSessionId && sortedSessions.length) {
      setSelectedSessionId(sortedSessions[0]?.id ?? "");
    }
  }, [selectedSessionId, sortedSessions]);

  useEffect(() => {
    if (!selectedClientId) {
      if (selectedProjectId) {
        setSelectedProjectId("");
      }
      return;
    }
    const hasProject = projectsForClient.some((project) => project.id === selectedProjectId);
    if (!hasProject && selectedProjectId) {
      setSelectedProjectId("");
    }
  }, [projectsForClient, selectedClientId, selectedProjectId]);

  const canPrep = Boolean(
    sessionPrepFolder &&
      (prepMode === "existing"
        ? selectedSessionId
        : newSessionName.trim().length > 0)
  );

  async function handleBrowse() {
    if (!supportsDialog) return;
    const selection = await open({ directory: true, multiple: false });
    if (typeof selection === "string") {
      setSessionPrepFolder(selection);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FolderOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Session File Prep</h2>
              <p className="text-xs text-muted-foreground">
                Point to a folder and attach files to a session or create one.
              </p>
            </div>
          </div>
          <Badge
            variant={sessionPrepFolder ? "secondary" : "outline"}
            className={cn("text-[10px]", sessionPrepFolder && "bg-green-500/15 text-green-500")}
          >
            {sessionPrepFolder ? "Folder Selected" : "No Folder"}
          </Badge>
        </div>

        <Separator />

        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
          <div className="space-y-2">
            <Label htmlFor="session-prep-folder" className="text-xs">
              Source Folder
            </Label>
            <Input
              id="session-prep-folder"
              value={sessionPrepFolder}
              onChange={(event) => setSessionPrepFolder(event.target.value)}
              placeholder={settings.downloadsPath}
              className="font-mono text-sm"
            />
            <p className="text-[10px] text-muted-foreground">
              {supportsDialog
                ? "Select the folder containing the files you want to prep."
                : "Manual entry required in web preview mode."}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="w-full md:w-auto"
            onClick={handleBrowse}
            disabled={!supportsDialog}
          >
            <FolderInput className="mr-2 h-4 w-4" />
            Browse
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold">Session Target</h3>
            <p className="text-xs text-muted-foreground">
              Decide whether to attach to an existing session or create a new one.
            </p>
          </div>
          <Badge variant="outline" className="text-[10px]">
            {prepMode === "existing" ? "Existing Session" : "New Session"}
          </Badge>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4 transition",
              prepMode === "existing" && "border-primary bg-primary/5"
            )}
          >
            <input
              type="radio"
              name="prep-mode"
              value="existing"
              checked={prepMode === "existing"}
              onChange={() => setPrepMode("existing")}
              className="mt-1"
            />
            <div className="space-y-1">
              <p className="text-sm font-semibold flex items-center gap-2">
                <Link2 className="h-4 w-4 text-muted-foreground" />
                Link to Existing Session
              </p>
              <p className="text-xs text-muted-foreground">
                Choose a Pro Tools session the app already knows about.
              </p>
            </div>
          </label>
          <label
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4 transition",
              prepMode === "new" && "border-primary bg-primary/5"
            )}
          >
            <input
              type="radio"
              name="prep-mode"
              value="new"
              checked={prepMode === "new"}
              onChange={() => setPrepMode("new")}
              className="mt-1"
            />
            <div className="space-y-1">
              <p className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
                Create New Session
              </p>
              <p className="text-xs text-muted-foreground">
                Link files to a client/project and spin up a fresh session.
              </p>
            </div>
          </label>
        </div>

        {prepMode === "existing" ? (
          <div className="space-y-2">
            <Label htmlFor="existing-session" className="text-xs">
              Existing Session
            </Label>
            <select
              id="existing-session"
              value={selectedSessionId}
              onChange={(event) => setSelectedSessionId(event.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary"
              disabled={!sortedSessions.length}
            >
              {!sortedSessions.length ? (
                <option value="">No sessions available</option>
              ) : null}
              {sortedSessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.name}
                  {session.artist ? ` — ${session.artist}` : ""}
                  {session.project ? ` (${session.project})` : ""}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-muted-foreground">
              {sortedSessions.length
                ? activeSession?.path
                  ? `Path: ${activeSession.path}`
                  : "No path on record for this session."
                : "Load sessions in Session Stats to enable linking."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="new-session-name" className="text-xs">
                New Session Name
              </Label>
              <Input
                id="new-session-name"
                value={newSessionName}
                onChange={(event) => setNewSessionName(event.target.value)}
                placeholder="Enter a session name"
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-link" className="text-xs">
                Link to Client (Optional)
              </Label>
              <select
                id="client-link"
                value={selectedClientId}
                onChange={(event) => setSelectedClientId(event.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary"
              >
                <option value="">No client selected</option>
                {sortedClients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-muted-foreground">
                Client link is optional, but projects require a client.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-link" className="text-xs">
                Link to Project (Optional)
              </Label>
              <select
                id="project-link"
                value={selectedProjectId}
                onChange={(event) => setSelectedProjectId(event.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary"
                disabled={!selectedClientId}
              >
                <option value="">No project selected</option>
                {projectsForClient.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-muted-foreground">
                {selectedClientId
                  ? `${projectsForClient.length} project(s) available.`
                  : "Select a client to choose a project."}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">Prep Summary</h3>
            <p className="text-xs text-muted-foreground">
              Review the source folder and target before running the prep.
            </p>
          </div>
          <Button size="sm" disabled={!canPrep}>
            {prepMode === "existing" ? "Prep Files" : "Create & Prep"}
          </Button>
        </div>
        <div className="grid gap-3 text-xs text-muted-foreground sm:grid-cols-3">
          <div className="rounded-md border border-border bg-secondary/40 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide">Source Folder</p>
            <p className="text-sm font-semibold text-foreground truncate">
              {sessionPrepFolder || settings.downloadsPath}
            </p>
          </div>
          <div className="rounded-md border border-border bg-secondary/40 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide">Target</p>
            <p className="text-sm font-semibold text-foreground truncate">
              {prepMode === "existing"
                ? activeSession?.name ?? "No session selected"
                : newSessionName || "New session name needed"}
            </p>
          </div>
          <div className="rounded-md border border-border bg-secondary/40 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide">Client/Project</p>
            <p className="text-sm font-semibold text-foreground truncate">
              {activeClient?.name ?? "No client"}
              {activeProject ? ` — ${activeProject.name}` : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold">Recent Prep Activity</h2>
        <div className="space-y-2">
          {ingestHistory.map((record) => {
            const Icon = fileIcons[record.fileType] || File;
            return (
              <div
                key={record.id}
                className="flex items-center gap-3 rounded-md bg-secondary/30 px-3 py-2.5"
              >
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{record.fileName}</p>
                  <p className="text-[10px] text-muted-foreground font-mono truncate">
                    {record.destPath || "No destination — prep pending"}
                  </p>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                  {formatBytes(record.sizeBytes)}
                </span>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {formatDistanceToNow(new Date(record.ingestedAt), { addSuffix: true })}
                </span>
                {record.status === "success" ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500" />
                ) : record.status === "error" ? (
                  <XCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
                ) : (
                  <Clock className="h-3.5 w-3.5 shrink-0 text-yellow-500" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
