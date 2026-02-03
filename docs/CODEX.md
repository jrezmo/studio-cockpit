# Session Codex Documentation

This document defines the **Session Codex** framework: data model, storage, ingestion, and API contracts.
It is intended as a living source of truth for future development (extractors, DB migrations, search, and UX).

## Overview
The Session Codex is a searchable index of Pro Tools sessions and their contents (tracks + plugins).
The goal is to answer questions like:
- How many times has a plugin been used, per session and across sessions?
- Which sessions use a given plugin?
- What tracks and sessions exist in a specific archive?

The current implementation is an in-app JSON store (`data/codex.json`) with an ingestion API
that normalizes incoming data and derives plugin usage.

## Storage
- Current storage file: `data/codex.json`
- Loader/writer: `src/lib/codex/storage.ts`
- Seed data: `src/lib/codex/seed.ts`
- Primary API: `src/app/api/codex/route.ts`

## Data Model
Source of truth types live in `src/lib/codex/types.ts`.

### CodexData
```ts
type CodexData = {
  sessions: CodexSession[];
  lastIngestedAt?: string;
};
```

### CodexSession
```ts
type CodexSession = {
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
  tracks: CodexTrack[];
  plugins: CodexPluginUsage[];
  sources?: CodexSessionSource[];
};
```

### CodexTrack
```ts
type CodexTrack = {
  id: string;
  name: string;
  type?: string;
  format?: string;
  plugins?: CodexPluginInstance[];
  notes?: string;
};
```

### CodexPluginInstance
```ts
type CodexPluginInstance = {
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

### CodexPluginUsage
```ts
type CodexPluginUsage = {
  pluginId: string;
  name: string;
  vendor?: string;
  version?: string;
  format?: string;
  count: number;      // number of instances in session
  trackCount: number; // number of tracks this plugin appears on in session
};
```

### CodexSessionSource
```ts
type CodexSessionSource = {
  type: "protools" | "archive" | "manual" | "import";
  path?: string;
  ingestedAt?: string;
  extractor?: string;
};
```

## Invariants and Derived Fields
Normalization lives in `src/lib/codex/utils.ts` and is applied on read/write.

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
`POST /api/codex`

Supported actions:
```json
{ "action": "ingestSessions", "payload": { "sessions": [/* CodexSession */] } }
{ "action": "ingestSessions", "payload": {/* single CodexSession */} }
{ "action": "replaceSessions", "payload": [/* CodexSession */] }
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
Otherwise, send track-level plugin instances and let the codex derive it.

## Search and Aggregation
The UI currently computes:
- Full-text search across session name, artist, project, notes, tags, track names, plugin names.
- Plugin aggregates: total instances, sessions, and track counts.

Core helpers:
- `buildSearchText(session)` for keyword search
- `aggregatePlugins(sessions)` for global plugin usage
- `getSessionTotals(session)` for per-session counts

## UI Integration
The Codex panel lives at:
- `src/components/codex/CodexPanel.tsx`

The store fields are:
```ts
codexSessions: CodexSession[];
codexLastIngestedAt: string | null;
setCodexData: (data: CodexData) => void;
```

## Extending the System
Recommended next steps:
1. Replace `data/codex.json` with SQLite (or Postgres) for scale.
2. Add indexing for plugin vendor/version filters.
3. Add a server-side ingest pipeline for archive scanning.
4. Add migrations: `schema_version` and a migration runner.

## Database Schema (Proposed)
If/when moving to SQL, a normalized schema could look like:

```sql
-- sessions
CREATE TABLE codex_sessions (
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
CREATE TABLE codex_tracks (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES codex_sessions(id),
  name TEXT NOT NULL,
  type TEXT,
  format TEXT,
  notes TEXT
);

-- plugins (unique definitions)
CREATE TABLE codex_plugins (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  vendor TEXT,
  version TEXT,
  format TEXT
);

-- track plugin instances
CREATE TABLE codex_track_plugins (
  id TEXT PRIMARY KEY,
  track_id TEXT NOT NULL REFERENCES codex_tracks(id),
  plugin_id TEXT NOT NULL REFERENCES codex_plugins(id),
  slot TEXT,
  preset TEXT,
  active INTEGER
);

-- session plugin usage summary
CREATE TABLE codex_session_plugins (
  session_id TEXT NOT NULL REFERENCES codex_sessions(id),
  plugin_id TEXT NOT NULL REFERENCES codex_plugins(id),
  count INTEGER NOT NULL,
  track_count INTEGER NOT NULL,
  PRIMARY KEY (session_id, plugin_id)
);
```

## Versioning
Current schema version: **v1 (JSON store)**

Add `schema_version` to future records if we need deterministic migrations.
