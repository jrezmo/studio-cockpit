"use client";

import { Badge } from "@/components/ui/badge";
import type { Project, ProjectStatus } from "@/lib/store";
import { formatBytes, formatSampleRate } from "@/lib/format";
import { formatDistanceToNow } from "date-fns";
import { Folder, Music } from "lucide-react";
import { cn } from "@/lib/utils";

const statusConfig: Record<
  ProjectStatus,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive"; dotColor: string }
> = {
  active: { label: "Active", variant: "default", dotColor: "bg-green-500" },
  mixing: { label: "Mixing", variant: "default", dotColor: "bg-blue-500" },
  review: { label: "Review", variant: "secondary", dotColor: "bg-yellow-500" },
  delivered: { label: "Delivered", variant: "outline", dotColor: "bg-muted-foreground" },
};

export function ProjectCard({ project }: { project: Project }) {
  const cfg = statusConfig[project.status] ?? statusConfig.active;

  return (
    <div className="rounded-lg border border-border bg-card p-4 hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold truncate">{project.projectName}</h3>
          <p className="text-xs text-muted-foreground truncate">
            {project.artistName}
          </p>
        </div>
        <Badge variant={cfg.variant} className="ml-2 shrink-0 text-[10px]">
          <span className={cn("mr-1.5 h-1.5 w-1.5 rounded-full inline-block", cfg.dotColor)} />
          {cfg.label}
        </Badge>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Music className="h-3 w-3" />
          <span>{project.songCount} songs</span>
        </div>
        <div className="text-muted-foreground font-mono">
          {formatSampleRate(project.sampleRate)}
        </div>
        <div className="text-muted-foreground font-mono">
          {project.bpm} BPM
        </div>
        <div className="text-muted-foreground font-mono">
          {formatBytes(project.sizeBytes)}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono truncate">
        <Folder className="h-3 w-3 shrink-0" />
        <span className="truncate">{project.folderPath}</span>
      </div>

      <p className="mt-2 text-[10px] text-muted-foreground">
        Updated {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}
      </p>
    </div>
  );
}
