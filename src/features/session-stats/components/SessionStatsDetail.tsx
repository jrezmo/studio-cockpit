import { formatDistanceToNow } from "date-fns";
import { Layers, ListMusic, Plug, RefreshCw } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { getSessionTotals } from "@/features/session-stats/utils";
import type { SessionStatsSession } from "@/features/session-stats/types";

type DetailTab = "overview" | "tracks" | "plugins";

type SessionStatsDetailProps = {
  session: SessionStatsSession | null;
  activeTab: DetailTab;
  onTabChange: (tab: DetailTab) => void;
  onPluginFilter: (name: string) => void;
};

function formatRelative(value?: string) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return formatDistanceToNow(date, { addSuffix: true });
}

export function SessionStatsDetail({
  session,
  activeTab,
  onTabChange,
  onPluginFilter,
}: SessionStatsDetailProps) {
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="border-b border-border p-4">
        {session ? (
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">{session.name}</h3>
              <p className="text-xs text-muted-foreground">
                {session.artist ?? "Unknown Artist"} •{" "}
                {session.project ?? "Unassigned Project"}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground font-mono">
                <span>{session.sampleRate ?? "?"} Hz</span>
                <span>•</span>
                <span>{session.bitDepth ?? "?"}-bit</span>
                <span>•</span>
                <span>{session.bpm ?? "?"} bpm</span>
                <span>•</span>
                <span>{session.key ?? "Unknown key"}</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 text-[10px] text-muted-foreground font-mono">
              <span>Updated {formatRelative(session.updatedAt)}</span>
              <span>Created {formatRelative(session.createdAt)}</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Select a session from the index to view details.
          </p>
        )}
      </div>

      {session && (
        <>
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
            <Button
              size="xs"
              variant={activeTab === "overview" ? "default" : "secondary"}
              onClick={() => onTabChange("overview")}
            >
              <ListMusic className="h-3 w-3" />
              Overview
            </Button>
            <Button
              size="xs"
              variant={activeTab === "tracks" ? "default" : "secondary"}
              onClick={() => onTabChange("tracks")}
            >
              <Layers className="h-3 w-3" />
              Tracks
            </Button>
            <Button
              size="xs"
              variant={activeTab === "plugins" ? "default" : "secondary"}
              onClick={() => onTabChange("plugins")}
            >
              <Plug className="h-3 w-3" />
              Plugins
            </Button>
            <div className="ml-auto flex items-center gap-2 text-[10px] text-muted-foreground">
              <RefreshCw className="h-3 w-3" />
              {session.sources?.[0]?.type ?? "manual"}
            </div>
          </div>

          <ScrollArea className="h-[470px]">
            <div className="space-y-4 p-4">
              {activeTab === "overview" && (
                <div className="space-y-4">
                  <div className="rounded-md border border-border bg-secondary/40 p-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <ListMusic className="h-3.5 w-3.5" />
                      Session Snapshot
                    </div>
                    <div className="mt-3 grid gap-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">Path</span>
                        <span className="font-mono text-[11px]">
                          {session.path ?? "Unknown"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">Duration</span>
                        <span className="font-mono text-[11px]">
                          {session.durationSeconds
                            ? `${session.durationSeconds}s`
                            : "Unknown"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">Tags</span>
                        <span className="font-mono text-[11px]">
                          {session.tags?.length
                            ? session.tags.join(", ")
                            : "None"}
                        </span>
                      </div>
                    </div>
                    {session.notes && (
                      <p className="mt-3 text-xs text-muted-foreground">
                        {session.notes}
                      </p>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      {
                        label: "Tracks",
                        value: getSessionTotals(session).trackCount,
                      },
                      {
                        label: "Unique Plugins",
                        value: getSessionTotals(session).uniquePlugins,
                      },
                      {
                        label: "Plugin Instances",
                        value: getSessionTotals(session).pluginInstances,
                      },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className="rounded-md border border-border bg-background px-3 py-2"
                      >
                        <p className="text-[10px] text-muted-foreground">
                          {stat.label}
                        </p>
                        <p className="text-lg font-semibold">{stat.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "tracks" && (
                <div className="space-y-3">
                  {session.tracks.map((track) => (
                    <div
                      key={track.id}
                      className="rounded-md border border-border bg-background p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold">{track.name}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">
                            {track.type ?? "track"} • {track.format ?? "unknown"}
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-[10px]">
                          {track.plugins?.length ?? 0} plugins
                        </Badge>
                      </div>
                      {track.plugins && track.plugins.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {track.plugins.map((plugin, index) => (
                            <Badge
                              key={`${track.id}-${plugin.name}-${index}`}
                              variant="outline"
                              className="text-[10px]"
                            >
                              {plugin.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "plugins" && (
                <div className="space-y-3">
                  {session.plugins.map((plugin) => (
                    <div
                      key={plugin.pluginId}
                      className="rounded-md border border-border bg-background p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold">{plugin.name}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">
                            {plugin.vendor ?? "Unknown vendor"} •{" "}
                            {plugin.format ?? "Unknown format"}
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-[10px]">
                          {plugin.count} instances
                        </Badge>
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span>Tracks: {plugin.trackCount}</span>
                        <span className="text-border">|</span>
                        <button
                          className="text-primary hover:underline"
                          onClick={() => onPluginFilter(plugin.name)}
                        >
                          Filter sessions
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </>
      )}
    </div>
  );
}
