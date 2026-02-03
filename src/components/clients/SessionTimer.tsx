import { ClipboardList, Timer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { ClientProject, SessionType } from "@/lib/crm/types";

type SessionTimerProps = {
  timerRunning: boolean;
  elapsedSeconds: number;
  timerType: SessionType;
  onTimerTypeChange: (value: SessionType) => void;
  timerProjectId: string;
  onTimerProjectChange: (value: string) => void;
  timerNotes: string;
  onTimerNotesChange: (value: string) => void;
  onTimerStart: () => void;
  onTimerPause: () => void;
  onTimerResume: () => void;
  onTimerReset: () => void;
  onLogTimer: () => void;
  sessionTypeOptions: SessionType[];
  activeClientProjects: ClientProject[];
  manualMode: "duration" | "range";
  onManualModeChange: (value: "duration" | "range") => void;
  manualType: SessionType;
  onManualTypeChange: (value: SessionType) => void;
  manualProjectId: string;
  onManualProjectChange: (value: string) => void;
  manualDuration: string;
  onManualDurationChange: (value: string) => void;
  manualStart: string;
  manualEnd: string;
  onManualStartChange: (value: string) => void;
  onManualEndChange: (value: string) => void;
  manualNotes: string;
  onManualNotesChange: (value: string) => void;
  onManualLog: () => void;
  formatElapsed: (seconds: number) => string;
};

export function SessionTimer({
  timerRunning,
  elapsedSeconds,
  timerType,
  onTimerTypeChange,
  timerProjectId,
  onTimerProjectChange,
  timerNotes,
  onTimerNotesChange,
  onTimerStart,
  onTimerPause,
  onTimerResume,
  onTimerReset,
  onLogTimer,
  sessionTypeOptions,
  activeClientProjects,
  manualMode,
  onManualModeChange,
  manualType,
  onManualTypeChange,
  manualProjectId,
  onManualProjectChange,
  manualDuration,
  onManualDurationChange,
  manualStart,
  manualEnd,
  onManualStartChange,
  onManualEndChange,
  manualNotes,
  onManualNotesChange,
  onManualLog,
  formatElapsed,
}: SessionTimerProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Timer className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Session Timer</h3>
        </div>
        <Badge variant="secondary" className="text-[10px]">
          {timerRunning ? "Running" : elapsedSeconds ? "Paused" : "Idle"}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="rounded-md bg-secondary/40 px-4 py-3 font-mono text-lg">
          {formatElapsed(elapsedSeconds)}
        </div>
        <div className="flex flex-wrap gap-2">
          {!timerRunning && elapsedSeconds === 0 && (
            <Button size="sm" onClick={onTimerStart}>
              Start
            </Button>
          )}
          {timerRunning && (
            <Button size="sm" variant="secondary" onClick={onTimerPause}>
              Pause
            </Button>
          )}
          {!timerRunning && elapsedSeconds > 0 && (
            <Button size="sm" onClick={onTimerResume}>
              Resume
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={onTimerReset}>
            Reset
          </Button>
          <Button size="sm" variant="secondary" onClick={onLogTimer}>
            Log Session
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Session Type</Label>
        <div className="flex flex-wrap gap-2">
          {sessionTypeOptions.map((option) => (
            <Button
              key={option}
              size="xs"
              variant={timerType === option ? "secondary" : "ghost"}
              onClick={() => onTimerTypeChange(option)}
            >
              {option}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Project</Label>
        <select
          value={timerProjectId}
          onChange={(event) => onTimerProjectChange(event.target.value)}
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">General / Non-project</option>
          {activeClientProjects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Notes</Label>
        <Input
          value={timerNotes}
          onChange={(event) => onTimerNotesChange(event.target.value)}
          placeholder="Automation tweaks, review notes..."
        />
      </div>

      <Separator />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ClipboardList className="h-4 w-4" />
          Manual Session Log
        </div>
        <div className="flex gap-2">
          <Button
            size="xs"
            variant={manualMode === "duration" ? "secondary" : "ghost"}
            onClick={() => onManualModeChange("duration")}
          >
            Duration
          </Button>
          <Button
            size="xs"
            variant={manualMode === "range" ? "secondary" : "ghost"}
            onClick={() => onManualModeChange("range")}
          >
            Start / End
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Type</Label>
          <select
            value={manualType}
            onChange={(event) => onManualTypeChange(event.target.value as SessionType)}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {sessionTypeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Project</Label>
          <select
            value={manualProjectId}
            onChange={(event) => onManualProjectChange(event.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">General / Non-project</option>
            {activeClientProjects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
        {manualMode === "duration" ? (
          <div className="space-y-1.5">
            <Label className="text-xs">Duration (minutes)</Label>
            <Input
              value={manualDuration}
              onChange={(event) => onManualDurationChange(event.target.value)}
              placeholder="90"
            />
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs">Start</Label>
              <Input
                type="datetime-local"
                value={manualStart}
                onChange={(event) => onManualStartChange(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">End</Label>
              <Input
                type="datetime-local"
                value={manualEnd}
                onChange={(event) => onManualEndChange(event.target.value)}
              />
            </div>
          </>
        )}
        <div className="sm:col-span-2 space-y-1.5">
          <Label className="text-xs">Notes</Label>
          <Input
            value={manualNotes}
            onChange={(event) => onManualNotesChange(event.target.value)}
            placeholder="Session highlights, deliverables..."
          />
        </div>
      </div>

      <Button size="sm" onClick={onManualLog}>
        Add Session
      </Button>
    </div>
  );
}
