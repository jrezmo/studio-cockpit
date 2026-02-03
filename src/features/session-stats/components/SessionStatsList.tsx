import { formatDistanceToNow } from "date-fns";
import { BookOpen } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { cn } from "@/shared/utils";
import { getSessionTotals } from "@/features/session-stats/utils";
import type { SessionStatsSession } from "@/features/session-stats/types";

function formatRelative(value?: string) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return formatDistanceToNow(date, { addSuffix: true });
}

function getSessionTime(session: SessionStatsSession) {
  return session.updatedAt ?? session.createdAt ?? "";
}

type SessionStatsListProps = {
  sessions: SessionStatsSession[];
  activeSessionId?: string;
  sortBy: "recent" | "plugins" | "tracks";
  onSortByChange: (value: "recent" | "plugins" | "tracks") => void;
  onSelect: (id: string) => void;
};

export function SessionStatsList({
  sessions,
  activeSessionId,
  sortBy,
  onSortByChange,
  onSelect,
}: SessionStatsListProps) {
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <BookOpen className="h-4 w-4 text-primary" />
          Session Index
        </div>
        <select
          value={sortBy}
          onChange={(e) => onSortByChange(e.target.value as "recent" | "plugins" | "tracks")}
          className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground"
        >
          <option value="recent">Recent</option>
          <option value="plugins">Most Plugins</option>
          <option value="tracks">Most Tracks</option>
        </select>
      </div>
      <ScrollArea className="h-[520px]">
        <div className="space-y-2 p-3">
          {sessions.map((session) => {
            const stats = getSessionTotals(session);
            const isActive = session.id === activeSessionId;
            return (
              <button
                key={session.id}
                onClick={() => onSelect(session.id)}
                className={cn(
                  "w-full rounded-md border border-border bg-background px-3 py-2.5 text-left transition-colors",
                  isActive
                    ? "border-primary/40 bg-primary/10"
                    : "hover:bg-secondary/40"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{session.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {session.artist ?? "Unknown Artist"} •{" "}
                      {session.project ?? "Unassigned Project"}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {stats.uniquePlugins} plugins
                  </Badge>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground font-mono">
                  <span>{stats.trackCount} tracks</span>
                  <span>•</span>
                  <span>{session.sampleRate ?? "?"} Hz</span>
                  <span>•</span>
                  <span>{formatRelative(getSessionTime(session))}</span>
                </div>
              </button>
            );
          })}
          {sessions.length === 0 && (
            <div className="rounded-md border border-dashed border-border p-4 text-xs text-muted-foreground">
              No sessions match this filter yet.
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
