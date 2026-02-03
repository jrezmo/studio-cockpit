"use client";

import { useEffect, useMemo } from "react";
import { format } from "date-fns";
import { useShallow } from "zustand/react/shallow";
import {
  CheckCircle2,
  Circle,
  PlayCircle,
  RotateCcw,
} from "lucide-react";
import { useStudioStore, type WorkflowStepStatus } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const statusOrder: WorkflowStepStatus[] = ["todo", "inProgress", "done"];

const statusMeta: Record<
  WorkflowStepStatus,
  { label: string; icon: typeof Circle; badgeClass: string }
> = {
  todo: {
    label: "To do",
    icon: Circle,
    badgeClass: "border-border text-muted-foreground bg-muted/30",
  },
  inProgress: {
    label: "In progress",
    icon: PlayCircle,
    badgeClass: "border-yellow-500/30 text-yellow-600 bg-yellow-500/10",
  },
  done: {
    label: "Done",
    icon: CheckCircle2,
    badgeClass: "border-green-500/30 text-green-600 bg-green-500/10",
  },
};

function formatTimestamp(timestamp: string) {
  return format(new Date(timestamp), "MMM d, h:mma");
}

export function MixingWorkflowPanel() {
  const {
    projects,
    activeProjectId,
    setActiveProjectId,
    workflows,
    setStatus,
    reset,
  } = useStudioStore(
    useShallow((s) => ({
      projects: s.projects,
      activeProjectId: s.activeMixingWorkflowProjectId,
      setActiveProjectId: s.setActiveMixingWorkflowProjectId,
      workflows: s.mixingWorkflowByProject,
      setStatus: s.setMixingWorkflowStepStatus,
      reset: s.resetMixingWorkflow,
    }))
  );

  useEffect(() => {
    if (!projects.length) return;
    const hasActive = projects.some((project) => project.id === activeProjectId);
    if (!hasActive) {
      setActiveProjectId(projects[0]?.id ?? "");
    }
  }, [projects, activeProjectId, setActiveProjectId]);

  const activeProject =
    projects.find((project) => project.id === activeProjectId) ?? projects[0];
  const projectId = activeProject?.id ?? "";
  const steps = projectId ? workflows[projectId] ?? [] : [];

  useEffect(() => {
    if (!projectId) return;
    if (!workflows[projectId]) {
      reset(projectId);
    }
  }, [projectId, workflows, reset]);

  const summary = useMemo(() => {
    const total = steps.length;
    const done = steps.filter((step) => step.status === "done").length;
    const inProgress = steps.filter((step) => step.status === "inProgress").length;
    const todo = total - done - inProgress;
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, inProgress, todo, progress };
  }, [steps]);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold">Project Focus</h2>
            <p className="text-xs text-muted-foreground">
              Select the project to track Joel's prep workflow.
            </p>
          </div>
          <div className="w-full max-w-sm">
            <label className="text-xs font-medium text-muted-foreground">
              Active Project
            </label>
            <select
              value={projectId}
              onChange={(event) => setActiveProjectId(event.target.value)}
              disabled={!projects.length}
              className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none transition focus:border-primary"
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.artistName} — {project.projectName}
                </option>
              ))}
            </select>
          </div>
        </div>
        {activeProject ? (
          <div className="mt-4 grid gap-3 text-xs text-muted-foreground sm:grid-cols-3">
            <div className="rounded-md border border-border bg-secondary/40 px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide">Sample Rate</p>
              <p className="text-sm font-semibold text-foreground">
                {activeProject.sampleRate} Hz
              </p>
            </div>
            <div className="rounded-md border border-border bg-secondary/40 px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide">BPM</p>
              <p className="text-sm font-semibold text-foreground">
                {activeProject.bpm}
              </p>
            </div>
            <div className="rounded-md border border-border bg-secondary/40 px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide">Songs</p>
              <p className="text-sm font-semibold text-foreground">
                {activeProject.songCount}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold">Mixing Workflow</h2>
            <p className="text-xs text-muted-foreground">
              Track Joel's prep steps before the mix starts.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="gap-2 text-xs"
            onClick={() => projectId && reset(projectId)}
            disabled={!projectId}
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </Button>
        </div>
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="outline" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {summary.done} done
            </Badge>
            <Badge variant="outline" className="gap-1">
              <PlayCircle className="h-3 w-3" />
              {summary.inProgress} in progress
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Circle className="h-3 w-3" />
              {summary.todo} to do
            </Badge>
          </div>
          <Progress value={summary.progress} className="h-2" />
          <p className="text-xs text-muted-foreground font-mono">
            {summary.progress}% complete
          </p>
        </div>
      </div>

      {steps.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
          No workflow steps yet. Select a project to begin tracking the mix setup.
        </div>
      ) : (
        <div className="space-y-3">
          {steps.map((step, index) => {
            const meta = statusMeta[step.status];
            const StatusIcon = meta.icon;
            const timestamp =
              step.status === "done"
                ? step.completedAt ?? step.updatedAt
                : step.updatedAt;
            const hasTimestamp = Boolean(timestamp);
            const timestampLabel = hasTimestamp
              ? `${step.status === "done" ? "Completed" : "Updated"} ${formatTimestamp(
                  timestamp
                )}`
              : "Not started yet";
            return (
              <div
                key={step.id}
                className="rounded-lg border border-border bg-card p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-xs font-semibold text-muted-foreground">
                      {index + 1}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold">{step.title}</h3>
                        <Badge
                          variant="outline"
                          className={cn("gap-1", meta.badgeClass)}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {meta.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{step.detail}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        {timestampLabel}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {statusOrder.map((status) => {
                      const option = statusMeta[status];
                      const Icon = option.icon;
                      const isActive = step.status === status;
                      return (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setStatus(projectId, step.id, status)}
                          className={cn(
                            "flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
                            isActive
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary"
                          )}
                          aria-pressed={isActive}
                        >
                          <Icon className="h-3 w-3" />
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
