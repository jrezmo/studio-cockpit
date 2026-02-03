# Studio Cockpit Architecture Map

This codebase is organized to keep feature work isolated, keep shared utilities discoverable, and make agent-driven work low-context.

## Quick Map

- `src/app/`
  - Next.js App Router entrypoints and API routes.
- `src/features/`
  - Feature-first layout (UI, types, utilities, validation, and seed data live together).
  - Example: `src/features/clients/`, `src/features/session-stats/`.
- `src/shared/`
  - Cross-feature building blocks: UI primitives, hooks, utilities, API helpers, and shared types.
- `src/state/`
  - Zustand store and slice composition.
  - Mock data lives in `src/state/mock/` to keep the store lean.
- `src/server/`
  - Server-only modules: database access, storage/repositories, Pro Tools MCP bridge.

## Conventions

- **Feature isolation**
  - UI components and feature-specific types live under `src/features/<feature>/`.
  - Feature code should avoid importing from other features unless there’s a strong reason. Prefer `src/shared/`.

- **Shared utilities**
  - UI primitives: `src/shared/ui/`
  - Hooks: `src/shared/hooks/`
  - Helpers: `src/shared/utils.ts`, `src/shared/format.ts`, `src/shared/api/`
  - Types: `src/shared/types/`

- **Server boundary**
  - Server logic belongs in `src/server/`.
  - API routes in `src/app/api/*` should call into `src/server/*` modules.

- **State organization**
  - Slices live in `src/state/slices/`.
  - Mock/seed data for the store is in `src/state/mock/`.

## Documentation Zones

- `docs/marketing/`: marketing collateral (one-sheets, ad copy, site copy). Ignore unless explicitly needed.
- `docs/notes/`: internal working notes and plans. Ignore unless explicitly needed.

## Adding A Feature (Pattern)

1. Create `src/features/<feature>/components/` for UI components.
2. Add `types.ts`, `utils.ts`, `seed.ts`, or `validation/` as needed.
3. If server storage is required, add `src/server/<feature>/` and wire API routes in `src/app/api/<feature>/`.
4. If global state is needed, add a slice to `src/state/slices/`.

## Import Rules (Preferred)

- UI layers: `features/*` -> `shared/*`
- Server routes: `app/api/*` -> `server/*` + `features/*` types/validation
- Avoid `features/*` -> `server/*`
