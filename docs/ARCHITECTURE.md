# Application Architecture

## State Management

- Central store in `src/lib/store.ts` using Zustand with persistence.
- UI panels are driven by the `activePanel` state, with panel components mapped in `src/app/page.tsx`.

## Panels

- **Dashboard**: status widgets + project grid.
- **Ingest**: watcher control, rules, recent history.
- **Sessions**: guided launch flow with stepper.
- **Stems**: filename preview and part selection.
- **Settings**: editable path configuration.
