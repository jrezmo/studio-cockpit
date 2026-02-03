# Application Architecture

## Overview

Studio Cockpit is a Next.js + Tauri desktop app with a thin API layer and a local
SQLite database.

High-level flow:
1. UI panels render in `src/app/page.tsx` based on `activePanel`.
2. Panels fetch data from `src/app/api/*` routes (Node runtime).
3. API routes read/write SQLite via `src/lib/db`.
4. Integrations (Pro Tools MCP) are accessed through API routes.

## State Management

- Central client store in `src/lib/store.ts` using Zustand with persistence.
- Panels read from the store and hydrate via API calls on mount.

## Data Layer (SQLite)

- Database path (default): `data/studio-cockpit.db`
- Connection + migrations: `src/lib/db/index.ts`
- CRM storage: `src/lib/crm/storage.ts`
- Session Stats storage: `src/lib/session-stats/storage.ts`

## API Routes

- `/api/crm` → CRM CRUD (SQLite)
- `/api/session-stats` → Session Stats ingest + search (SQLite)
- `/api/protools` → MCP tool bridge (Pro Tools)
- `/api/protools/project` → Create session + tracks (Pro Tools)

## Panels

- **Dashboard**: status widgets + project grid.
- **Clients (CRM)**: logbook, board, and console views.
- **Ingest**: watcher control, rules, recent history.
- **Stems**: filename preview and part selection.
- **Mixing Workflow**: step checklist per project.
- **Session Stats**: searchable session + plugin index.
- **Pro Tools MCP**: live session info and project creation.
- **Settings**: editable path configuration.

## Desktop Shell

- Tauri wrapper lives in `src-tauri`.
- Web app must build successfully before Tauri packaging.
