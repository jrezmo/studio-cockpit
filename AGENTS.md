# Agent Instructions (Claude Code, Gemini Code Assist, Codex)

This repo is optimized for low-context, feature-first work. Follow the rules below to stay aligned with the architecture and minimize drift.

## Required First Step

Before making changes, read `docs/ARCHITECTURE.md` to understand the folder layout, boundaries, and import rules. Keep it open while working.

## Common Rules (All Agents)

- Prefer feature-first structure:
  - UI/components belong in `src/features/<feature>/components/`.
  - Feature-specific types, utils, validation, and seed data live alongside the feature in `src/features/<feature>/`.
- Use shared building blocks from `src/shared/`.
- Server-only logic must live in `src/server/` and be called from `src/app/api/*`.
- Global state lives in `src/state/` and must be composed via slices.
- Avoid cross-feature imports. If something is reused, move it to `src/shared/`.
- Keep imports stable and explicit (don’t re-export just to shorten paths unless asked).
- When creating new files, follow the existing naming and file placement conventions in `docs/ARCHITECTURE.md`.
- Context hygiene:
  - Ignore `docs/marketing/` and `docs/notes/` unless the task explicitly involves marketing or internal planning.
  - Do not load working/marketing docs by default; prioritize `docs/ARCHITECTURE.md` and feature code.

## Claude Code

- Start every task by skimming `docs/ARCHITECTURE.md` and relevant feature folders.
- Do not place server logic in `src/features/` or `src/shared/`.
- If touching the store, keep slice logic in `src/state/slices/` and mock data in `src/state/mock/`.

## Gemini Code Assist

- Use `docs/ARCHITECTURE.md` as the single source of truth for layout decisions.
- Add new shared utilities only in `src/shared/` and reference them from features.
- Keep API routes thin: validate in the route, delegate work to `src/server/`.

## Codex

- Read `docs/ARCHITECTURE.md` first, then navigate by feature.
- If you need a new shared type or helper, place it in `src/shared/` and update imports.
- Do not co-locate test helpers with feature code; keep them under `src/__tests__/`.
