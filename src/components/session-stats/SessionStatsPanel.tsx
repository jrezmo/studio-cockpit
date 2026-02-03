"use client";

import { useEffect, useMemo, useState } from "react";
import { useStudioStore } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  aggregatePlugins,
  buildSearchText,
  getSessionTotals,
} from "@/lib/session-stats/utils";
import type { SessionStatsSession } from "@/lib/session-stats/types";
import { formatDistanceToNow } from "date-fns";
import {
  BookOpen,
  Search,
  Filter,
  Database,
  Plug,
  ListMusic,
  Layers,
  RefreshCw,
} from "lucide-react";

type DetailTab = "overview" | "tracks" | "plugins";

function formatRelative(value?: string) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return formatDistanceToNow(date, { addSuffix: true });
}

function getSessionTime(session: SessionStatsSession) {
  return session.updatedAt ?? session.createdAt ?? "";
}

export function SessionStatsPanel() {
  const {
    sessionStatsSessions,
    sessionStatsLastIngestedAt,
    setSessionStatsData,
  } = useStudioStore(
    useShallow((s) => ({
      sessionStatsSessions: s.sessionStatsSessions,
      sessionStatsLastIngestedAt: s.sessionStatsLastIngestedAt,
      setSessionStatsData: s.setSessionStatsData,
    }))
  );

  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "plugins" | "tracks">("recent");
  const [selectedId, setSelectedId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  const [pluginQuery, setPluginQuery] = useState("");
  const [showIngest, setShowIngest] = useState(false);
  const [ingestPayload, setIngestPayload] = useState("");
  const [ingestState, setIngestState] = useState<"idle" | "loading" | "error" | "ok">("idle");
  const [ingestMessage, setIngestMessage] = useState("");

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    fetch("/api/session-stats")
      .then((response) => response.json())
      .then((result) => {
        if (!isMounted) return;
        if (result?.ok && result?.data) {
          setSessionStatsData(result.data);
          setLoadingError("");
        } else {
          setLoadingError(result?.error || "Unable to load session stats.");
        }
      })
      .catch(() => {
        if (isMounted) setLoadingError("Unable to load session stats.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [setSessionStatsData]);

  const pluginTotals = useMemo(
    () => aggregatePlugins(sessionStatsSessions),
    [sessionStatsSessions]
  );

  const totalTracks = useMemo(
    () =>
      sessionStatsSessions.reduce(
        (total, session) => total + getSessionTotals(session).trackCount,
        0
      ),
    [sessionStatsSessions]
  );

  const totalPluginInstances = useMemo(
    () =>
      sessionStatsSessions.reduce(
        (total, session) => total + getSessionTotals(session).pluginInstances,
        0
      ),
    [sessionStatsSessions]
  );

  const filteredSessions = useMemo(() => {
    const query = search.trim().toLowerCase();
    const pluginFilter = pluginQuery.trim().toLowerCase();
    return sessionStatsSessions.filter((session) => {
      const matchesSearch = !query || buildSearchText(session).includes(query);
      const matchesPlugin =
        !pluginFilter ||
        session.plugins.some((plugin) =>
          `${plugin.name} ${plugin.vendor ?? ""}`.toLowerCase().includes(pluginFilter)
        );
      return matchesSearch && matchesPlugin;
    });
  }, [sessionStatsSessions, search, pluginQuery]);

  const sortedSessions = useMemo(() => {
    const sessions = [...filteredSessions];
    sessions.sort((a, b) => {
      if (sortBy === "plugins") {
        return (
          getSessionTotals(b).uniquePlugins -
          getSessionTotals(a).uniquePlugins
        );
      }
      if (sortBy === "tracks") {
        return getSessionTotals(b).trackCount - getSessionTotals(a).trackCount;
      }
      const timeA = new Date(getSessionTime(a)).getTime();
      const timeB = new Date(getSessionTime(b)).getTime();
      return (Number.isNaN(timeB) ? 0 : timeB) - (Number.isNaN(timeA) ? 0 : timeA);
    });
    return sessions;
  }, [filteredSessions, sortBy]);

  const activeSession = useMemo(() => {
    return (
      sortedSessions.find((session) => session.id === selectedId) ??
      sortedSessions[0] ??
      null
    );
  }, [sortedSessions, selectedId]);

  useEffect(() => {
    if (!activeSession) return;
    if (activeSession.id !== selectedId) {
      setSelectedId(activeSession.id);
    }
  }, [activeSession, selectedId]);

  async function handleIngest() {
    setIngestState("loading");
    setIngestMessage("");
    let payload: unknown;
    try {
      payload = JSON.parse(ingestPayload);
    } catch (error) {
      setIngestState("error");
      setIngestMessage(
        error instanceof Error ? error.message : "Invalid JSON payload."
      );
      return;
    }

    try {
      const response = await fetch("/api/session-stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ingestSessions", payload }),
      });
      const result = await response.json();
      if (result?.ok && result?.data) {
        setSessionStatsData(result.data);
        setIngestState("ok");
        setIngestMessage("Sessions ingested and indexed.");
        setIngestPayload("");
      } else {
        setIngestState("error");
        setIngestMessage(result?.error || "Ingest failed.");
      }
    } catch {
      setIngestState("error");
      setIngestMessage("Ingest failed.");
    }
  }

  return (
    <div className="space-y-6">
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
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sessions, tracks, plugins, notes..."
              className="h-7 border-0 bg-transparent p-0 text-sm focus-visible:ring-0"
            />
          </div>
          <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Input
              value={pluginQuery}
              onChange={(e) => setPluginQuery(e.target.value)}
              placeholder="Filter by plugin"
              className="h-7 border-0 bg-transparent p-0 text-sm focus-visible:ring-0"
            />
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowIngest((prev) => !prev)}
          >
            {showIngest ? "Hide Ingest" : "Ingest JSON"}
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-border bg-secondary/40 p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Database className="h-3.5 w-3.5" />
              Indexed Sessions
            </div>
            <p className="mt-2 text-lg font-semibold">{sessionStatsSessions.length}</p>
            <p className="text-[10px] text-muted-foreground font-mono">
              Last ingest {formatRelative(sessionStatsLastIngestedAt ?? undefined)}
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
              Across {sessionStatsSessions.length} sessions
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
                onClick={() =>
                  setPluginQuery((current) =>
                    current.toLowerCase() === plugin.name.toLowerCase()
                      ? ""
                      : plugin.name
                  )
                }
              >
                {plugin.name} · {plugin.totalInstances}
              </Button>
            ))}
          </div>
        )}
      </div>

      {showIngest && (
        <div className="rounded-lg border border-border bg-card p-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">Ingest Sessions</h3>
              <p className="text-xs text-muted-foreground">
                Paste the JSON export from your session extractor. We will index
                tracks and plugin usage immediately.
              </p>
            </div>
            <Badge
              variant="secondary"
              className={cn(
                "text-[10px]",
                ingestState === "error" && "bg-destructive/15 text-destructive",
                ingestState === "ok" && "bg-green-500/15 text-green-400",
                ingestState === "loading" && "bg-amber-500/15 text-amber-400"
              )}
            >
              {ingestState === "idle" && "Idle"}
              {ingestState === "loading" && "Ingesting"}
              {ingestState === "ok" && "Ingested"}
              {ingestState === "error" && "Error"}
            </Badge>
          </div>
          {ingestMessage && (
            <p className="rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs">
              {ingestMessage}
            </p>
          )}
          <textarea
            value={ingestPayload}
            onChange={(e) => setIngestPayload(e.target.value)}
            placeholder='{"sessions":[{"name":"Session Name","tracks":[{"name":"Lead","plugins":[{"name":"FabFilter Pro-Q 3"}]}]}]}'
            className="min-h-[140px] w-full rounded-md border border-border bg-background p-3 text-xs font-mono text-foreground"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={handleIngest} disabled={!ingestPayload}>
              Ingest Now
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setIngestPayload("");
                setIngestState("idle");
                setIngestMessage("");
              }}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <BookOpen className="h-4 w-4 text-primary" />
              Session Index
            </div>
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as "recent" | "plugins" | "tracks")
              }
              className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground"
            >
              <option value="recent">Recent</option>
              <option value="plugins">Most Plugins</option>
              <option value="tracks">Most Tracks</option>
            </select>
          </div>
          <ScrollArea className="h-[520px]">
            <div className="space-y-2 p-3">
              {sortedSessions.map((session) => {
                const stats = getSessionTotals(session);
                const isActive = session.id === activeSession?.id;
                return (
                  <button
                    key={session.id}
                    onClick={() => setSelectedId(session.id)}
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
              {sortedSessions.length === 0 && (
                <div className="rounded-md border border-dashed border-border p-4 text-xs text-muted-foreground">
                  No sessions match this filter yet.
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="rounded-lg border border-border bg-card">
          <div className="border-b border-border p-4">
            {activeSession ? (
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">{activeSession.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {activeSession.artist ?? "Unknown Artist"} •{" "}
                    {activeSession.project ?? "Unassigned Project"}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground font-mono">
                    <span>{activeSession.sampleRate ?? "?"} Hz</span>
                    <span>•</span>
                    <span>{activeSession.bitDepth ?? "?"}-bit</span>
                    <span>•</span>
                    <span>{activeSession.bpm ?? "?"} bpm</span>
                    <span>•</span>
                    <span>{activeSession.key ?? "Unknown key"}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 text-[10px] text-muted-foreground font-mono">
                  <span>Updated {formatRelative(activeSession.updatedAt)}</span>
                  <span>Created {formatRelative(activeSession.createdAt)}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Select a session from the index to view details.
              </p>
            )}
          </div>

          {activeSession && (
            <>
              <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
                <Button
                  size="xs"
                  variant={activeTab === "overview" ? "default" : "secondary"}
                  onClick={() => setActiveTab("overview")}
                >
                  <ListMusic className="h-3 w-3" />
                  Overview
                </Button>
                <Button
                  size="xs"
                  variant={activeTab === "tracks" ? "default" : "secondary"}
                  onClick={() => setActiveTab("tracks")}
                >
                  <Layers className="h-3 w-3" />
                  Tracks
                </Button>
                <Button
                  size="xs"
                  variant={activeTab === "plugins" ? "default" : "secondary"}
                  onClick={() => setActiveTab("plugins")}
                >
                  <Plug className="h-3 w-3" />
                  Plugins
                </Button>
                <div className="ml-auto flex items-center gap-2 text-[10px] text-muted-foreground">
                  <RefreshCw className="h-3 w-3" />
                  {activeSession.sources?.[0]?.type ?? "manual"}
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
                              {activeSession.path ?? "Unknown"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-muted-foreground">Duration</span>
                            <span className="font-mono text-[11px]">
                              {activeSession.durationSeconds
                                ? `${activeSession.durationSeconds}s`
                                : "Unknown"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-muted-foreground">Tags</span>
                            <span className="font-mono text-[11px]">
                              {activeSession.tags?.length
                                ? activeSession.tags.join(", ")
                                : "None"}
                            </span>
                          </div>
                        </div>
                        {activeSession.notes && (
                          <p className="mt-3 text-xs text-muted-foreground">
                            {activeSession.notes}
                          </p>
                        )}
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        {[
                          {
                            label: "Tracks",
                            value: getSessionTotals(activeSession).trackCount,
                          },
                          {
                            label: "Unique Plugins",
                            value: getSessionTotals(activeSession).uniquePlugins,
                          },
                          {
                            label: "Plugin Instances",
                            value: getSessionTotals(activeSession).pluginInstances,
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
                      {activeSession.tracks.map((track) => (
                        <div
                          key={track.id}
                          className="rounded-md border border-border bg-background p-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold">
                                {track.name}
                              </p>
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
                      {activeSession.plugins.map((plugin) => (
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
                              onClick={() => setPluginQuery(plugin.name)}
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
      </div>

      <Separator />
      <p className="text-xs text-muted-foreground">
        Session Stats ingests JSON exports today. Wire the extractor to
        `/api/session-stats` to index new sessions automatically.
      </p>
    </div>
  );
}
