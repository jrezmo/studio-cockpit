// Utilities for normalizing, aggregating, and searching session stats data.
import type {
  SessionStatsPluginInstance,
  SessionStatsPluginUsage,
  SessionStatsSession,
  SessionStatsTrack,
} from "./types";

function sanitize(value?: string) {
  return value?.trim() ?? "";
}

function lower(value?: string) {
  return sanitize(value).toLowerCase();
}

export function createId(prefix: string) {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `${prefix}-${uuid}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/** Build a stable identifier for a plugin based on name/vendor/version/format. */
export function buildPluginId(
  plugin: Pick<
    SessionStatsPluginInstance,
    "name" | "vendor" | "version" | "format"
  >
) {
  const name = sanitize(plugin.name) || "unknown";
  const parts = [plugin.vendor, name, plugin.version, plugin.format]
    .map(lower)
    .filter(Boolean);
  return parts.length > 0 ? parts.join("|") : lower(name);
}

/** Normalize a plugin instance by filling in defaults and generating pluginId. */
export function normalizePluginInstance(
  plugin: SessionStatsPluginInstance
): SessionStatsPluginInstance {
  const name = sanitize(plugin.name) || "Unknown Plugin";
  const pluginId = plugin.pluginId || buildPluginId({ ...plugin, name });
  return {
    ...plugin,
    name,
    vendor: sanitize(plugin.vendor) || undefined,
    version: sanitize(plugin.version) || undefined,
    format: sanitize(plugin.format) || undefined,
    slot: sanitize(plugin.slot) || undefined,
    preset: sanitize(plugin.preset) || undefined,
    pluginId,
  };
}

/** Normalize a track and its plugins with sane defaults. */
export function normalizeTrack(track: SessionStatsTrack): SessionStatsTrack {
  const plugins = (track.plugins ?? []).map(normalizePluginInstance);
  return {
    ...track,
    id: track.id || createId("track"),
    name: sanitize(track.name) || "Untitled Track",
    type: sanitize(track.type) || undefined,
    format: sanitize(track.format) || undefined,
    notes: sanitize(track.notes) || undefined,
    plugins,
  };
}

/** Derive aggregate plugin usage from normalized tracks. */
export function deriveSessionPlugins(tracks: SessionStatsTrack[]) {
  const usageMap = new Map<string, SessionStatsPluginUsage>();

  tracks.forEach((track) => {
    const seenOnTrack = new Set<string>();
    const plugins = track.plugins ?? [];
    plugins.forEach((plugin) => {
      const normalized = normalizePluginInstance(plugin);
      const key = normalized.pluginId || buildPluginId(normalized);
      const existing = usageMap.get(key);
      if (!existing) {
        usageMap.set(key, {
          pluginId: key,
          name: normalized.name,
          vendor: normalized.vendor,
          version: normalized.version,
          format: normalized.format,
          count: 1,
          trackCount: 0,
        });
      } else {
        existing.count += 1;
      }
      if (!seenOnTrack.has(key)) {
        const target = usageMap.get(key);
        if (target) target.trackCount += 1;
        seenOnTrack.add(key);
      }
    });
  });

  return Array.from(usageMap.values()).sort((a, b) => b.count - a.count);
}

/** Normalize a session payload into a complete SessionStatsSession. */
export function normalizeSession(
  session: Partial<SessionStatsSession>
): SessionStatsSession {
  const id = session.id || createId("session");
  const name = sanitize(session.name) || "Untitled Session";
  const tracks = (session.tracks ?? []).map(normalizeTrack);
  const plugins =
    session.plugins && session.plugins.length > 0
      ? session.plugins.map((plugin) => ({
          ...plugin,
          pluginId:
            plugin.pluginId ||
            buildPluginId({
              name: plugin.name,
              vendor: plugin.vendor,
              version: plugin.version,
              format: plugin.format,
            }),
          name: sanitize(plugin.name) || "Unknown Plugin",
          vendor: sanitize(plugin.vendor) || undefined,
          version: sanitize(plugin.version) || undefined,
          format: sanitize(plugin.format) || undefined,
          count: Math.max(plugin.count ?? 0, 0),
          trackCount: Math.max(plugin.trackCount ?? 0, 0),
        }))
      : deriveSessionPlugins(tracks);

  const fingerprint =
    sanitize(session.fingerprint) ||
    [session.path, name, session.createdAt]
      .map(lower)
      .filter(Boolean)
      .join("|") ||
    id;

  return {
    id,
    fingerprint,
    name,
    artist: sanitize(session.artist) || undefined,
    project: sanitize(session.project) || undefined,
    path: sanitize(session.path) || undefined,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    sampleRate: session.sampleRate,
    bitDepth: session.bitDepth,
    bpm: session.bpm,
    key: sanitize(session.key) || undefined,
    durationSeconds: session.durationSeconds,
    notes: sanitize(session.notes) || undefined,
    tags: session.tags?.map((tag) => sanitize(tag)).filter(Boolean) ?? [],
    tracks,
    plugins,
    sources: session.sources ?? [],
  };
}

/** Merge sessions by fingerprint, preferring incoming non-empty fields. */
export function mergeSessions(
  existing: SessionStatsSession[],
  incoming: SessionStatsSession[]
) {
  const merged = new Map<string, SessionStatsSession>();
  existing.forEach((session) => merged.set(session.fingerprint, session));

  incoming.forEach((session) => {
    const current = merged.get(session.fingerprint);
    if (!current) {
      merged.set(session.fingerprint, session);
      return;
    }
    merged.set(session.fingerprint, {
      ...current,
      ...session,
      tracks: session.tracks.length > 0 ? session.tracks : current.tracks,
      plugins: session.plugins.length > 0 ? session.plugins : current.plugins,
      tags: session.tags?.length ? session.tags : current.tags,
      sources: session.sources?.length ? session.sources : current.sources,
    });
  });

  return Array.from(merged.values());
}

/** Build a searchable text blob for filtering by keyword. */
export function buildSearchText(session: SessionStatsSession) {
  const trackNames = session.tracks.map((track) => track.name).join(" ");
  const pluginNames = session.plugins
    .map((plugin) => `${plugin.name} ${plugin.vendor ?? ""}`)
    .join(" ");
  return [
    session.name,
    session.artist ?? "",
    session.project ?? "",
    session.path ?? "",
    session.notes ?? "",
    session.tags?.join(" ") ?? "",
    trackNames,
    pluginNames,
  ]
    .join(" ")
    .toLowerCase();
}

/** Compute totals for a session (tracks, unique plugins, instances). */
export function getSessionTotals(session: SessionStatsSession) {
  const trackCount = session.tracks.length;
  const uniquePlugins = session.plugins.length;
  const pluginInstances = session.plugins.reduce(
    (total, plugin) => total + plugin.count,
    0
  );
  return { trackCount, uniquePlugins, pluginInstances };
}

export type PluginAggregate = {
  pluginId: string;
  name: string;
  vendor?: string;
  version?: string;
  format?: string;
  totalInstances: number;
  sessionCount: number;
  trackCount: number;
};

/** Aggregate plugin usage across sessions for summary stats. */
export function aggregatePlugins(sessions: SessionStatsSession[]) {
  const totals = new Map<string, PluginAggregate>();

  sessions.forEach((session) => {
    const seenInSession = new Set<string>();
    session.plugins.forEach((plugin) => {
      const key = plugin.pluginId || buildPluginId(plugin);
      const existing = totals.get(key);
      if (!existing) {
        totals.set(key, {
          pluginId: key,
          name: plugin.name,
          vendor: plugin.vendor,
          version: plugin.version,
          format: plugin.format,
          totalInstances: plugin.count,
          sessionCount: 0,
          trackCount: plugin.trackCount,
        });
      } else {
        existing.totalInstances += plugin.count;
        existing.trackCount += plugin.trackCount;
      }
      if (!seenInSession.has(key)) {
        const target = totals.get(key);
        if (target) target.sessionCount += 1;
        seenInSession.add(key);
      }
    });
  });

  return Array.from(totals.values()).sort(
    (a, b) => b.totalInstances - a.totalInstances
  );
}
