import {
  aggregatePlugins,
  buildPluginId,
  buildSearchText,
  deriveSessionPlugins,
  getSessionTotals,
  normalizePluginInstance,
  normalizeSession,
} from "@/lib/session-stats/utils";
import type { SessionStatsSession } from "@/lib/session-stats/types";

describe("session-stats utils", () => {
  it("normalizes plugin instances and derives pluginId", () => {
    const normalized = normalizePluginInstance({
      name: "  FabFilter Pro-Q 3  ",
      vendor: " FabFilter ",
      version: " 3.17 ",
      format: "AAX Native",
    });

    expect(normalized.name).toBe("FabFilter Pro-Q 3");
    expect(normalized.vendor).toBe("FabFilter");
    expect(normalized.version).toBe("3.17");
    expect(normalized.pluginId).toBe(
      buildPluginId({
        name: "FabFilter Pro-Q 3",
        vendor: "FabFilter",
        version: "3.17",
        format: "AAX Native",
      })
    );
  });

  it("derives per-session plugin usage from track instances", () => {
    const plugins = deriveSessionPlugins([
      {
        id: "track-1",
        name: "Lead Vocal",
        plugins: [
          { name: "Plugin A", vendor: "Vendor" },
          { name: "Plugin A", vendor: "Vendor" },
        ],
      },
      {
        id: "track-2",
        name: "Guitar",
        plugins: [{ name: "Plugin A", vendor: "Vendor" }],
      },
    ]);

    expect(plugins).toHaveLength(1);
    expect(plugins[0].count).toBe(3);
    expect(plugins[0].trackCount).toBe(2);
  });

  it("normalizes sessions and sets fingerprint", () => {
    const session = normalizeSession({
      id: "session-1",
      name: "Test Session",
      path: "/Volumes/Session/Test.ptx",
      createdAt: "2026-01-01T10:00:00Z",
      tracks: [],
      plugins: [],
    });

    expect(session.fingerprint).toBe(
      "/volumes/session/test.ptx|test session|2026-01-01t10:00:00z"
    );
  });

  it("builds searchable text from session fields", () => {
    const session: SessionStatsSession = {
      id: "session-2",
      fingerprint: "session-2",
      name: "Mix V4",
      artist: "Artist A",
      project: "Project A",
      path: "/Volumes/Project/Mix V4.ptx",
      tracks: [
        {
          id: "track-1",
          name: "Lead Vocal",
          plugins: [{ name: "Plugin A", vendor: "Vendor" }],
        },
      ],
      plugins: [{ pluginId: "plugin-a", name: "Plugin A", count: 1, trackCount: 1 }],
    };

    const text = buildSearchText(session);
    expect(text).toContain("mix v4");
    expect(text).toContain("lead vocal");
    expect(text).toContain("plugin a");
  });

  it("aggregates plugins across sessions", () => {
    const sessions: SessionStatsSession[] = [
      {
        id: "s1",
        fingerprint: "s1",
        name: "S1",
        tracks: [],
        plugins: [
          { pluginId: "p1", name: "Plugin One", count: 2, trackCount: 1 },
        ],
      },
      {
        id: "s2",
        fingerprint: "s2",
        name: "S2",
        tracks: [],
        plugins: [
          { pluginId: "p1", name: "Plugin One", count: 1, trackCount: 1 },
        ],
      },
    ];

    const totals = aggregatePlugins(sessions);
    expect(totals).toHaveLength(1);
    expect(totals[0].totalInstances).toBe(3);
    expect(totals[0].sessionCount).toBe(2);
    expect(totals[0].trackCount).toBe(2);
  });

  it("computes session totals", () => {
    const session: SessionStatsSession = {
      id: "s3",
      fingerprint: "s3",
      name: "S3",
      tracks: [{ id: "t1", name: "Track 1" }],
      plugins: [
        { pluginId: "p1", name: "Plugin One", count: 2, trackCount: 1 },
      ],
    };

    expect(getSessionTotals(session)).toEqual({
      trackCount: 1,
      uniquePlugins: 1,
      pluginInstances: 2,
    });
  });
});
