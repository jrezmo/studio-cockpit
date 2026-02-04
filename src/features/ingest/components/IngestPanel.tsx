"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathDialog } from "@/shared/hooks/usePathDialog";
import { useStudioStore } from "@/state/store";
import { formatBytes } from "@/shared/format";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Badge } from "@/shared/ui/badge";
import { Checkbox } from "@/shared/ui/checkbox";
import { Separator } from "@/shared/ui/separator";
import { cn } from "@/shared/utils";
import { PathPickerField } from "@/shared/ui/path-picker";
import { WebFolderPicker } from "@/shared/ui/path-picker-web";
import {
  FolderOpen,
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
    addIngestRecord,
    setLastProToolsSessionCreated,
  } = useStudioStore(
    useShallow((s) => ({
      ingestHistory: s.ingestHistory,
      sessionPrepFolder: s.sessionPrepFolder,
      setSessionPrepFolder: s.setSessionPrepFolder,
      sessionStatsSessions: s.sessionStatsSessions,
      clients: s.clients,
      clientProjects: s.clientProjects,
      settings: s.settings,
      addIngestRecord: s.addIngestRecord,
      setLastProToolsSessionCreated: s.setLastProToolsSessionCreated,
    }))
  );

  const [prepMode, setPrepMode] = useState<"existing" | "new">("existing");
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [newSessionName, setNewSessionName] = useState("");
  const [webSelectedFiles, setWebSelectedFiles] = useState<File[]>([]);
  const [prepState, setPrepState] = useState<"idle" | "loading" | "error" | "ok">(
    "idle"
  );
  const [prepMessage, setPrepMessage] = useState("");
  const [prepDebug, setPrepDebug] = useState("");
  const [uploadState, setUploadState] = useState<"idle" | "uploading">("idle");
  const [uploadRoot, setUploadRoot] = useState("");
  const [createdSessionsRoot, setCreatedSessionsRoot] = useState("");
  const [forceCloseSession, setForceCloseSession] = useState(false);

  const { supportsDialog, pickPath } = usePathDialog();

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
    if (typeof window === "undefined") return;
    fetch("/api/session-prep/config")
      .then((res) => res.json())
      .then(
        (data: {
          ok: boolean;
          uploadRoot?: string;
          createdSessionsRoot?: string;
        }) => {
          if (data.ok && data.uploadRoot) {
            setUploadRoot(data.uploadRoot);
          }
          if (data.ok && data.createdSessionsRoot) {
            setCreatedSessionsRoot(data.createdSessionsRoot);
          }
        }
      )
      .catch(() => {
        // ignore config fetch errors
      });
  }, []);

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
    (sessionPrepFolder || webSelectedFiles.length > 0) &&
      (prepMode === "existing"
        ? selectedSessionId
        : newSessionName.trim().length > 0)
  );

  const webFolderLabel = useMemo(() => {
    if (!webSelectedFiles.length) return "";
    const first = webSelectedFiles[0];
    if (!first?.webkitRelativePath) return "Selected Folder";
    const [top] = first.webkitRelativePath.split("/");
    return top || "Selected Folder";
  }, [webSelectedFiles]);

  const sourceFolder =
    sessionPrepFolder || (webFolderLabel ? `${webFolderLabel} (browser)` : "") || settings.downloadsPath;

  function getFolderLabel(path: string) {
    const cleaned = path.trim().replace(/\/+$/, "");
    const parts = cleaned.split(/[\\/]/).filter(Boolean);
    return parts[parts.length - 1] || cleaned || "Session Files";
  }

  function buildSessionLocation() {
    if (prepMode === "existing" && activeSession?.path) {
      return activeSession.path;
    }
    return (
      createdSessionsRoot ||
      "/Users/rezmo/dev/cockpitfiles/createdsessions"
    );
  }

  function addPrepRecord(
    targetPath: string,
    status: "success" | "error",
    message?: string
  ) {
    const fileLabel = getFolderLabel(sourceFolder);
    const fileCount = webSelectedFiles.length;
    const fileCountLabel =
      !sessionPrepFolder && fileCount > 0 ? ` (${fileCount} files)` : "";
    addIngestRecord({
      id: crypto.randomUUID(),
      fileName: `Session Prep — ${fileLabel}${fileCountLabel}`,
      sourcePath: sourceFolder,
      destPath: targetPath,
      fileType: "ptx",
      status,
      sizeBytes: 0,
      ingestedAt: new Date().toISOString(),
    });
    if (message && status === "error") {
      console.warn("Session prep error:", message);
    }
  }

  async function handlePrep() {
    if (!sessionPrepFolder && !webFolderLabel) {
      setPrepState("error");
      setPrepMessage("Select a source folder to continue.");
      return;
    }

    setPrepState("loading");
    setPrepMessage("");
    setPrepDebug("");

    let uploadedFiles: Array<{ name: string; path: string }> = [];
    if (webSelectedFiles.length > 0) {
      setUploadState("uploading");
      try {
        const formData = new FormData();
        webSelectedFiles.forEach((file) => {
          formData.append("files", file, file.name);
        });
        const uploadResponse = await fetch("/api/session-prep/upload", {
          method: "POST",
          body: formData,
        });
        const uploadResult = (await uploadResponse.json()) as {
          ok: boolean;
          files?: Array<{ name: string; path: string }>;
          error?: string;
        };
        if (!uploadResult.ok || !uploadResult.files) {
          throw new Error(uploadResult.error || "Upload failed.");
        }
        uploadedFiles = uploadResult.files;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Upload failed.";
        setPrepState("error");
        setPrepMessage(message);
        setUploadState("idle");
        return;
      }
      setUploadState("idle");
    }

    if (prepMode === "existing") {
      if (!selectedSessionId) {
        setPrepState("error");
        setPrepMessage("Select an existing session to continue.");
        return;
      }
      if (uploadedFiles.length > 0) {
        const sessionPath = activeSession?.path;
        if (!sessionPath) {
          setPrepState("error");
          setPrepMessage("Selected session has no path on record.");
          return;
        }
        try {
          const attachResponse = await fetch("/api/session-prep/attach", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionPath,
              files: uploadedFiles,
            }),
          });
          const attachResult = (await attachResponse.json()) as {
            ok: boolean;
            error?: string;
          };
          if (!attachResult.ok) {
            throw new Error(attachResult.error || "Attach failed.");
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Attach failed.";
          setPrepState("error");
          setPrepMessage(message);
          addPrepRecord(sessionPath ?? buildSessionLocation(), "error", message);
          return;
        }
      }
      const targetPath = buildSessionLocation();
      addPrepRecord(targetPath, "success");
      setPrepState("ok");
      setPrepMessage(
        uploadedFiles.length > 0
          ? `Files uploaded to Audio Files (${uploadedFiles.length}).`
          : "Prep queued for the selected session."
      );
      return;
    }

    if (!newSessionName.trim()) {
      setPrepState("error");
      setPrepMessage("Enter a new session name to continue.");
      return;
    }

    const targetLocation = buildSessionLocation();
    try {
      const response = await fetch("/api/protools/project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session: {
            name: newSessionName.trim(),
            location: targetLocation,
            fileType: "FType_WAVE",
            sampleRate: "SRate_48000",
            bitDepth: "BDepth_24",
            ioSettings: "IOSettings_Last",
            interleaved: true,
          },
          forceCloseSession,
          tracks: {
            names: [],
            type: "TType_Audio",
            format: "TFormat_Stereo",
            timebase: "TTimebase_Samples",
          },
          audioFiles: uploadedFiles,
        }),
      });
      const result = (await response.json()) as {
        ok: boolean;
        error?: string;
        debug?: unknown;
        result?: {
          sessionNameUsed?: string;
          sessionRenamed?: boolean;
        };
      };
      if (!result.ok) {
        if (result.debug) {
          setPrepDebug(JSON.stringify(result.debug, null, 2));
        }
        throw new Error(result.error || "Failed to create session.");
      }
      const sessionNameUsed =
        result.result?.sessionNameUsed?.trim() || newSessionName.trim();
      setLastProToolsSessionCreated({
        name: sessionNameUsed,
        location: targetLocation,
        createdAt: new Date().toISOString(),
      });
      addPrepRecord(targetLocation, "success");
      setPrepState("ok");
      setPrepMessage(
        webSelectedFiles.length
          ? `Session created${
              result.result?.sessionRenamed ? ` as ${sessionNameUsed}` : ""
            } and files imported (${webSelectedFiles.length}).`
          : `Session created${result.result?.sessionRenamed ? ` as ${sessionNameUsed}` : ""}.`
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create session.";
      setPrepState("error");
      setPrepMessage(message);
      addPrepRecord(targetLocation, "error", message);
    }
  }

  async function handleBrowse() {
    const selection = await pickPath({ selectType: "directory" });
    if (selection) {
      setSessionPrepFolder(selection);
    }
  }

  function handleWebFolderChange(files: File[]) {
    setWebSelectedFiles(files);
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

        {supportsDialog ? (
          <PathPickerField
            id="session-prep-folder"
            label="Source Folder"
            value={sessionPrepFolder}
            placeholder={settings.downloadsPath}
            description="Select the folder containing the files you want to prep."
            selectType="directory"
            onChange={setSessionPrepFolder}
          />
        ) : (
          <WebFolderPicker
            id="session-prep-folder-web"
            label="Source Folder (Browser)"
            description={
              webSelectedFiles.length
                ? `Selected ${webSelectedFiles.length} file(s) from ${webFolderLabel}.`
                : "Select a local folder to attach its files."
            }
            onFilesChange={handleWebFolderChange}
            showFilePreview
          />
        )}
        {uploadRoot ? (
          <p className="text-[10px] text-muted-foreground font-mono">
            Uploads to: {uploadRoot}
          </p>
        ) : null}
        {createdSessionsRoot ? (
          <p className="text-[10px] text-muted-foreground font-mono">
            Sessions in: {createdSessionsRoot}
          </p>
        ) : null}
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
            <div className="space-y-2 sm:col-span-2">
              <label className="flex items-start gap-2 text-xs text-muted-foreground">
                <Checkbox
                  checked={forceCloseSession}
                  onCheckedChange={(value) => setForceCloseSession(Boolean(value))}
                />
                <span>
                  Close current session without saving before creating a new one.
                </span>
              </label>
              <p className="text-[10px] text-muted-foreground">
                Use this to bypass Pro Tools save prompts. Unsaved changes will be lost.
              </p>
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
          <Button
            size="sm"
            disabled={!canPrep || prepState === "loading" || uploadState === "uploading"}
            onClick={handlePrep}
          >
            {prepMode === "existing" ? "Prep Files" : "Create & Prep"}
          </Button>
        </div>
        {uploadState === "uploading" ? (
          <p className="rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
            Uploading files…
          </p>
        ) : null}
        {prepMessage ? (
          <p
            className={cn(
              "rounded-md border px-3 py-2 text-xs",
              prepState === "error"
                ? "border-destructive/40 bg-destructive/10 text-destructive"
                : "border-border bg-secondary/40 text-muted-foreground"
            )}
          >
            {prepMessage}
          </p>
        ) : null}
        {prepDebug ? (
          <div className="rounded-md border border-border bg-secondary/40 px-3 py-2 text-[10px] text-muted-foreground">
            <p className="mb-2 text-[10px] uppercase tracking-wide">
              Import Debug
            </p>
            <pre className="whitespace-pre-wrap break-words font-mono">
              {prepDebug}
            </pre>
          </div>
        ) : null}
        <div className="grid gap-3 text-xs text-muted-foreground sm:grid-cols-3">
          <div className="rounded-md border border-border bg-secondary/40 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide">Source Folder</p>
            <p className="text-sm font-semibold text-foreground truncate">
              {sourceFolder}
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
