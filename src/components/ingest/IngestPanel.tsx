"use client";

import { useStudioStore } from "@/lib/store";
import { formatBytes } from "@/lib/format";
import { formatDistanceToNow } from "date-fns";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  FolderInput,
  FileAudio,
  FileArchive,
  File,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
} from "lucide-react";
import { useShallow } from "zustand/react/shallow";

const fileIcons: Record<string, React.ElementType> = {
  wav: FileAudio,
  aif: FileAudio,
  ptx: File,
  zip: FileArchive,
};

const detectionRules = [
  { pattern: "*.wav, *.aif, *.aiff", action: "Route to artist Audio Files folder" },
  { pattern: "*.ptx, *.ptf", action: "Route to artist Sessions folder" },
  { pattern: "*.zip", action: "Extract and route by content type" },
  { pattern: "*.mp3, *.m4a", action: "Route to References folder" },
];

export function IngestPanel() {
  const { ingestHistory, ingestWatcherActive, setIngestWatcherActive, settings } =
    useStudioStore(
      useShallow((s) => ({
        ingestHistory: s.ingestHistory,
        ingestWatcherActive: s.ingestWatcherActive,
        setIngestWatcherActive: s.setIngestWatcherActive,
        settings: s.settings,
      }))
    );

  return (
    <div className="space-y-6">
      {/* Watcher control */}
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg",
                ingestWatcherActive ? "bg-green-500/10" : "bg-muted"
              )}
            >
              <Eye
                className={cn(
                  "h-5 w-5",
                  ingestWatcherActive ? "text-green-500" : "text-muted-foreground"
                )}
              />
            </div>
            <div>
              <h2 className="text-sm font-semibold">File Watcher</h2>
              <p className="text-xs text-muted-foreground font-mono">
                {settings.downloadsPath}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="watcher-toggle" className="text-xs text-muted-foreground">
              {ingestWatcherActive ? "Active" : "Paused"}
            </Label>
            <Switch
              id="watcher-toggle"
              checked={ingestWatcherActive}
              onCheckedChange={setIngestWatcherActive}
            />
          </div>
        </div>
      </div>

      {/* Detection rules */}
      <div className="rounded-lg border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold">Detection Rules</h2>
        <div className="space-y-2">
          {detectionRules.map((rule, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-md bg-secondary/50 px-3 py-2"
            >
              <code className="text-xs font-mono text-primary">{rule.pattern}</code>
              <span className="text-xs text-muted-foreground">{rule.action}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent history */}
      <div className="rounded-lg border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold">Recent Ingest History</h2>
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
                    {record.destPath || "No destination — routing failed"}
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
