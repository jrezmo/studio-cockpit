"use client";

import { useStudioStore } from "@/state/store";
import { Sidebar } from "@/features/dashboard/components/Sidebar";
import { Header } from "@/features/dashboard/components/Header";
import { ClientsPanel } from "@/features/clients/components/ClientsPanel";
import { IngestPanel } from "@/features/ingest/components/IngestPanel";
import { StemEngine } from "@/features/stems/components/StemEngine";
import { SettingsPanel } from "@/features/settings/components/SettingsPanel";
import { ProToolsPanel } from "@/features/protools/components/ProToolsPanel";
import { SessionStatsPanel } from "@/features/session-stats/components/SessionStatsPanel";
import { MixingWorkflowPanel } from "@/features/workflows/components/MixingWorkflowPanel";

const panels: Record<string, React.ComponentType> = {
  clients: ClientsPanel,
  ingest: IngestPanel,
  stems: StemEngine,
  mixingWorkflow: MixingWorkflowPanel,
  sessionStats: SessionStatsPanel,
  settings: SettingsPanel,
  protools: ProToolsPanel,
};

export default function Home() {
  const activePanel = useStudioStore((s) => s.activePanel);
  const ActivePanelComponent = panels[activePanel] || ClientsPanel;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <ActivePanelComponent />
        </main>
      </div>
    </div>
  );
}
