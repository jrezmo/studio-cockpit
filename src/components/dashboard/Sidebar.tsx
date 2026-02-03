"use client";

import { cn } from "@/lib/utils";
import { useStudioStore, type Panel } from "@/lib/store";
import {
  LayoutDashboard,
  FolderInput,
  Play,
  AudioLines,
  Settings,
  PlugZap,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useShallow } from "zustand/react/shallow";

const navItems: { id: Panel; label: string; icon: React.ElementType }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "ingest", label: "Ingest Agent", icon: FolderInput },
  { id: "sessions", label: "Session Launcher", icon: Play },
  { id: "stems", label: "Stem Engine", icon: AudioLines },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "protools", label: "Pro Tools", icon: PlugZap },
];

export function Sidebar() {
  const { activePanel, setActivePanel, sidebarCollapsed, setSidebarCollapsed } =
    useStudioStore(
      useShallow((s) => ({
        activePanel: s.activePanel,
        setActivePanel: s.setActivePanel,
        sidebarCollapsed: s.sidebarCollapsed,
        setSidebarCollapsed: s.setSidebarCollapsed,
      }))
    );

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-border bg-sidebar transition-all duration-200",
        sidebarCollapsed ? "w-16" : "w-56"
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-bold">
          SC
        </div>
        {!sidebarCollapsed && (
          <span className="text-sm font-semibold tracking-tight">
            Studio Cockpit
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePanel === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActivePanel(item.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-border p-2">
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="flex w-full items-center justify-center rounded-md px-3 py-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>
    </aside>
  );
}
