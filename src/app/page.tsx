"use client";

import { useStudioStore } from "@/lib/store";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { DashboardPanel } from "@/components/dashboard/DashboardPanel";
import { ClientsPanel } from "@/components/clients/ClientsPanel";
import { IngestPanel } from "@/components/ingest/IngestPanel";
import { StemEngine } from "@/components/stems/StemEngine";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { ProToolsPanel } from "@/components/protools/ProToolsPanel";
import { SessionStatsPanel } from "@/components/session-stats/SessionStatsPanel";
import { MixingWorkflowPanel } from "@/components/workflows/MixingWorkflowPanel";

const panels: Record<string, React.ComponentType> = {
  dashboard: DashboardPanel,
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
  const ActivePanelComponent = panels[activePanel] || DashboardPanel;

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
