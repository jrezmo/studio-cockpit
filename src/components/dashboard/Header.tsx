"use client";

import { useStudioStore } from "@/lib/store";

const panelTitles: Record<string, string> = {
  dashboard: "Dashboard",
  clients: "Clients",
  ingest: "Ingest Agent",
  stems: "Stem Engine",
  mixingWorkflow: "Mixing Workflow",
  sessionStats: "Session Stats",
  settings: "Settings",
  protools: "Pro Tools",
};

export function Header() {
  const activePanel = useStudioStore((s) => s.activePanel);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-6">
      <h1 className="text-lg font-semibold tracking-tight">
        {panelTitles[activePanel]}
      </h1>
      <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-green-500 status-green" />
          Pro Tools Connected
        </span>
        <span className="text-border">|</span>
        <span>v0.1.0-alpha</span>
      </div>
    </header>
  );
}
