"use client";

import { useEffect, useMemo, useState } from "react";
import { useStudioStore } from "@/lib/store";
import { useApiMutation } from "@/hooks/useApiMutation";
import { useFetch } from "@/hooks/useFetch";
import { useShallow } from "zustand/react/shallow";
import { Separator } from "@/components/ui/separator";
import {
  aggregatePlugins,
  buildSearchText,
  getSessionTotals,
} from "@/lib/session-stats/utils";
import type { SessionStatsData, SessionStatsSession } from "@/lib/session-stats/types";
import { SessionStatsDetail } from "@/components/session-stats/SessionStatsDetail";
import { SessionStatsIngestForm } from "@/components/session-stats/SessionStatsIngestForm";
import { SessionStatsList } from "@/components/session-stats/SessionStatsList";
import { SessionStatsSearch } from "@/components/session-stats/SessionStatsSearch";

type DetailTab = "overview" | "tracks" | "plugins";

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

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "plugins" | "tracks">("recent");
  const [selectedId, setSelectedId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  const [pluginQuery, setPluginQuery] = useState("");
  const [showIngest, setShowIngest] = useState(false);
  const [ingestPayload, setIngestPayload] = useState("");
  const [ingestState, setIngestState] = useState<"idle" | "loading" | "error" | "ok">("idle");
  const [ingestMessage, setIngestMessage] = useState("");

  const { loading, error: loadingError } = useFetch<SessionStatsData>(
    "/api/session-stats",
    {
      retries: 2,
      delayMs: 400,
      errorMessage: "Unable to load session stats.",
      onSuccess: setSessionStatsData,
      onError: (message) => {
        console.error("Failed to load session stats.", message);
      },
    }
  );

  const { mutate: mutateSessionStats } = useApiMutation<SessionStatsData>(
    "/api/session-stats",
    {
      retries: 2,
      delayMs: 400,
      errorMessage: "Ingest failed.",
    }
  );

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
        return getSessionTotals(b).uniquePlugins - getSessionTotals(a).uniquePlugins;
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

    const result = await mutateSessionStats({
      action: "ingestSessions",
      payload,
    });
    if (result.ok && result.data) {
      setSessionStatsData(result.data);
      setIngestState("ok");
      setIngestMessage("Sessions ingested and indexed.");
      setIngestPayload("");
    } else {
      setIngestState("error");
      setIngestMessage(result.error || "Ingest failed.");
    }
  }

  return (
    <div className="space-y-6">
      <SessionStatsSearch
        loading={loading}
        loadingError={loadingError}
        search={search}
        onSearchChange={setSearch}
        pluginQuery={pluginQuery}
        onPluginQueryChange={setPluginQuery}
        showIngest={showIngest}
        onToggleIngest={() => setShowIngest((prev) => !prev)}
        sessionCount={sessionStatsSessions.length}
        lastIngestedAt={sessionStatsLastIngestedAt}
        pluginTotals={pluginTotals}
        totalPluginInstances={totalPluginInstances}
        totalTracks={totalTracks}
        onPluginQuickFilter={(name) =>
          setPluginQuery((current) =>
            current.toLowerCase() === name.toLowerCase() ? "" : name
          )
        }
      />

      {showIngest && (
        <SessionStatsIngestForm
          ingestState={ingestState}
          ingestMessage={ingestMessage}
          ingestPayload={ingestPayload}
          onPayloadChange={setIngestPayload}
          onIngest={handleIngest}
          onClear={() => {
            setIngestPayload("");
            setIngestState("idle");
            setIngestMessage("");
          }}
        />
      )}

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <SessionStatsList
          sessions={sortedSessions}
          activeSessionId={activeSession?.id}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          onSelect={setSelectedId}
        />
        <SessionStatsDetail
          session={activeSession}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onPluginFilter={setPluginQuery}
        />
      </div>

      <Separator />
      <p className="text-xs text-muted-foreground">
        Session Stats ingests JSON exports today. Wire the extractor to
        `/api/session-stats` to index new sessions automatically.
      </p>
    </div>
  );
}
