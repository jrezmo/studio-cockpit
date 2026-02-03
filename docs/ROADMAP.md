# Studio Cockpit Roadmap

This roadmap is a living plan. Keep it updated as scope changes.

## Phase 1: Data Stability (Now)

Goals:
- SQLite as the canonical data store.
- Clear APIs + documentation for data access.

Milestones:
1. SQLite migrations + seed data.
2. CRM + Session Stats repositories in `src/lib/*/storage.ts`.
3. Update architecture + session stats docs.
4. Ignore local DB files in git.

## Phase 2: Feature Depth

Goals:
- Make core panels production-ready.

Milestones:
1. Ingest pipeline backed by DB (watcher + routing rules).
2. Session Stats filters (vendor, format, date range).
3. CRM reporting views (client health, billables).

## Phase 3: Desktop Productization

Goals:
- Ship-ready desktop workflow.

Milestones:
1. Move DB location to Tauri app data dir.
2. Schema versioning + migration runner.
3. Background jobs (ingest, session indexing).
4. Safe backup/export tools.
