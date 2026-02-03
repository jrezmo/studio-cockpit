import { formatDistanceToNow } from "date-fns";
import { Database, Filter, Layers, Plug, Search } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { cn } from "@/shared/utils";
import type { PluginAggregate } from "@/features/session-stats/utils";

function formatRelative(value?: string | null) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return formatDistanceToNow(date, { addSuffix: true });
}

type SessionStatsSearchProps = {
  loading: boolean;
  loadingError: string;
  search: string;
  onSearchChange: (value: string) => void;
  pluginQuery: string;
  onPluginQueryChange: (value: string) => void;
  showIngest: boolean;
  onToggleIngest: () => void;
  sessionCount: number;
  lastIngestedAt?: string | null;
  pluginTotals: PluginAggregate[];
  totalPluginInstances: number;
  totalTracks: number;
  onPluginQuickFilter: (name: string) => void;
};

export function SessionStatsSearch({
  loading,
  loadingError,
  search,
  onSearchChange,
  pluginQuery,
  onPluginQueryChange,
  showIngest,
  onToggleIngest,
  sessionCount,
  lastIngestedAt,
  pluginTotals,
  totalPluginInstances,
  totalTracks,
  onPluginQuickFilter,
}: SessionStatsSearchProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Session Stats</h2>
          <p className="text-xs text-muted-foreground">
            Search across sessions, tracks, and plugins. Build a long-term memory
            of every mix decision.
          </p>
        </div>
        <Badge
          variant="secondary"
          className={cn(
            "text-[10px]",
            loadingError && "bg-destructive/15 text-destructive",
            loading && "bg-amber-500/15 text-amber-400"
          )}
        >
          {loading ? "Indexing" : loadingError ? "Index Offline" : "Index Ready"}
        </Badge>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr_auto]">
        <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search sessions, tracks, plugins, notes..."
            className="h-7 border-0 bg-transparent p-0 text-sm focus-visible:ring-0"
          />
        </div>
        <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Input
            value={pluginQuery}
            onChange={(e) => onPluginQueryChange(e.target.value)}
            placeholder="Filter by plugin"
            className="h-7 border-0 bg-transparent p-0 text-sm focus-visible:ring-0"
          />
        </div>
        <Button variant="secondary" size="sm" onClick={onToggleIngest}>
          {showIngest ? "Hide Ingest" : "Ingest JSON"}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border border-border bg-secondary/40 p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Database className="h-3.5 w-3.5" />
            Indexed Sessions
          </div>
          <p className="mt-2 text-lg font-semibold">{sessionCount}</p>
          <p className="text-[10px] text-muted-foreground font-mono">
            Last ingest {formatRelative(lastIngestedAt)}
          </p>
        </div>
        <div className="rounded-md border border-border bg-secondary/40 p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Plug className="h-3.5 w-3.5" />
            Total Plugin Instances
          </div>
          <p className="mt-2 text-lg font-semibold">{totalPluginInstances}</p>
          <p className="text-[10px] text-muted-foreground font-mono">
            {pluginTotals.length} unique plugins
          </p>
        </div>
        <div className="rounded-md border border-border bg-secondary/40 p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Layers className="h-3.5 w-3.5" />
            Total Tracks Indexed
          </div>
          <p className="mt-2 text-lg font-semibold">{totalTracks}</p>
          <p className="text-[10px] text-muted-foreground font-mono">
            Across {sessionCount} sessions
          </p>
        </div>
      </div>

      {pluginTotals.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {pluginTotals.slice(0, 10).map((plugin) => (
            <Button
              key={plugin.pluginId}
              size="xs"
              variant={
                pluginQuery.toLowerCase() === plugin.name.toLowerCase()
                  ? "default"
                  : "secondary"
              }
              onClick={() => onPluginQuickFilter(plugin.name)}
            >
              {plugin.name} · {plugin.totalInstances}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
