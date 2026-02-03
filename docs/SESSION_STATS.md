# Session Stats Documentation

This document defines the **Session Stats** framework: data model, storage, ingestion, and API contracts.
It is intended as a living source of truth for future development (extractors, DB migrations, search, and UX).

## Overview
Session Stats is a searchable index of Pro Tools sessions and their contents (tracks + plugins).
The goal is to answer questions like:
- How many times has a plugin been used, per session and across sessions?
- Which sessions use a given plugin?
- What tracks and sessions exist in a specific archive?

The current implementation uses a local SQLite database (`data/studio-cockpit.db`) with an ingestion API
that normalizes incoming data and derives plugin usage.

## Storage
- Current storage file: `data/studio-cockpit.db`
- Loader/writer: `src/lib/session-stats/storage.ts`
- Seed data: `src/lib/session-stats/seed.ts`
- Primary API: `src/app/api/session-stats/route.ts`

### Tables
Session Stats currently stores normalized session JSON in SQLite:
- `session_stats_sessions`
- `session_stats_meta` (stores `lastIngestedAt`)

Legacy note:
- If `data/session-stats.json` exists, it is imported into SQLite the first time the DB is created.

## Data Model
Source of truth types live in `src/lib/session-stats/types.ts`.

### SessionStatsData
```ts
type SessionStatsData = {
  sessions: SessionStatsSession[];
  lastIngestedAt?: string;
};
```

### SessionStatsSession
```ts
type SessionStatsSession = {
  id: string;
  fingerprint: string;
  name: string;
  artist?: string;
  project?: string;
  path?: string;
  createdAt?: string;
  updatedAt?: string;
  sampleRate?: number;
  bitDepth?: number;
  bpm?: number;
  key?: string;
  durationSeconds?: number;
  notes?: string;
  tags?: string[];
  tracks: SessionStatsTrack[];
  plugins: SessionStatsPluginUsage[];
  sources?: SessionStatsSessionSource[];
};
```

### SessionStatsTrack
```ts
type SessionStatsTrack = {
  id: string;
  name: string;
  type?: string;
  format?: string;
  plugins?: SessionStatsPluginInstance[];
  notes?: string;
};
```

### SessionStatsPluginInstance
```ts
type SessionStatsPluginInstance = {
  pluginId?: string;
  name: string;
  vendor?: string;
  version?: string;
  format?: string;
  slot?: string;
  preset?: string;
  active?: boolean;
};
```

### SessionStatsPluginUsage
```ts
type SessionStatsPluginUsage = {
  pluginId: string;
  name: string;
  vendor?: string;
  version?: string;
  format?: string;
  count: number;      // number of instances in session
  trackCount: number; // number of tracks this plugin appears on in session
};
```

### SessionStatsSessionSource
```ts
type SessionStatsSessionSource = {
  type: "protools" | "archive" | "manual" | "import";
  path?: string;
  ingestedAt?: string;
  extractor?: string;
};
```

## Invariants and Derived Fields
Normalization lives in `src/lib/session-stats/utils.ts` and is applied on read/write.

### Fingerprint
`fingerprint` is used as the stable key for upserts. If it is not provided:
1. The normalizer attempts `path | name | createdAt`
2. Falls back to `id` if needed

### Plugin ID
`pluginId` is derived from vendor + name + version + format when missing:
```
pluginId = lower(vendor|name|version|format)
```
This keeps aggregation stable across ingest sources.

### Plugin Usage
If a session is ingested with tracks + plugin instances but no `plugins` summary,
the system derives `plugins` by counting instances across tracks.

## Ingestion
### API
`POST /api/session-stats`

Supported actions:
```json
{ "action": "ingestSessions", "payload": { "sessions": [/* SessionStatsSession */] } }
{ "action": "ingestSessions", "payload": {/* single SessionStatsSession */} }
{ "action": "replaceSessions", "payload": [/* SessionStatsSession */] }
```

### Minimal Ingest Example
```json
{
  "action": "ingestSessions",
  "payload": {
    "sessions": [
      {
        "name": "Session A",
        "artist": "Artist X",
        "project": "Project Y",
        "tracks": [
          {
            "name": "Lead Vocal",
            "plugins": [
              { "name": "FabFilter Pro-Q 3", "vendor": "FabFilter" }
            ]
          }
        ]
      }
    ]
  }
}
```

### Ingestion Mapping Guidance
If you are mapping from a Pro Tools or archive extractor:
- Session name → `name`
- Session path → `path`
- Audio format → `sampleRate`, `bitDepth`
- Tempo / key → `bpm`, `key`
- Track list → `tracks[]`
- Track plugins → `tracks[].plugins[]`
- Pro Tools source metadata → `sources[]` with `type="protools"` and `extractor`

If your extractor can compute plugin usage, set `plugins[]` directly.
Otherwise, send track-level plugin instances and let Session Stats derive it.

## Search and Aggregation
The UI currently computes:
- Full-text search across session name, artist, project, notes, tags, track names, plugin names.
- Plugin aggregates: total instances, sessions, and track counts.

Core helpers:
- `buildSearchText(session)` for keyword search
- `aggregatePlugins(sessions)` for global plugin usage
- `getSessionTotals(session)` for per-session counts

## UI Integration
The Session Stats panel lives at:
- `src/components/session-stats/SessionStatsPanel.tsx`

The store fields are:
```ts
sessionStatsSessions: SessionStatsSession[];
sessionStatsLastIngestedAt: string | null;
setSessionStatsData: (data: SessionStatsData) => void;
```

## Extending the System
Recommended next steps:
1. Replace `data/session-stats.json` with SQLite (or Postgres) for scale.
2. Add indexing for plugin vendor/version filters.
3. Add a server-side ingest pipeline for archive scanning.
4. Add migrations: `schema_version` and a migration runner.

## Database Schema (Proposed)
If/when moving to SQL, a normalized schema could look like:

```sql
-- sessions
CREATE TABLE session_stats_sessions (
  id TEXT PRIMARY KEY,
  fingerprint TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  artist TEXT,
  project TEXT,
  path TEXT,
  created_at TEXT,
  updated_at TEXT,
  sample_rate INTEGER,
  bit_depth INTEGER,
  bpm REAL,
  key TEXT,
  duration_seconds INTEGER,
  notes TEXT
);

-- tracks
CREATE TABLE session_stats_tracks (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES session_stats_sessions(id),
  name TEXT NOT NULL,
  type TEXT,
  format TEXT,
  notes TEXT
);

-- plugins (unique definitions)
CREATE TABLE session_stats_plugins (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  vendor TEXT,
  version TEXT,
  format TEXT
);

-- track plugin instances
CREATE TABLE session_stats_track_plugins (
  id TEXT PRIMARY KEY,
  track_id TEXT NOT NULL REFERENCES session_stats_tracks(id),
  plugin_id TEXT NOT NULL REFERENCES session_stats_plugins(id),
  slot TEXT,
  preset TEXT,
  active INTEGER
);

-- session plugin usage summary
CREATE TABLE session_stats_session_plugins (
  session_id TEXT NOT NULL REFERENCES session_stats_sessions(id),
  plugin_id TEXT NOT NULL REFERENCES session_stats_plugins(id),
  count INTEGER NOT NULL,
  track_count INTEGER NOT NULL,
  PRIMARY KEY (session_id, plugin_id)
);
```

## Versioning
Current schema version: **v1 (JSON store)**

Add `schema_version` to future records if we need deterministic migrations.
