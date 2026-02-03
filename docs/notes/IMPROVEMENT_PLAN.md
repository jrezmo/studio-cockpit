Here is the comprehensive task list, streamlined into a raw format suitable for a backlog or TODO file.

DB & MIGRATIONS

Implement migration rollback logic in the migration runner

Add sequential SQL down scripts for existing migrations

Implement automatic SQLite database backup before running migrations

Add database health check/integrity repair utility for WAL files

Move database settings from localStorage to a SQLite settings table

TESTING

Add API route tests for Pro Tools MCP protocol bridges

Add stress tests for concurrent database writes

Add unit tests for Zustand store selectors and persistence

Set up Playwright/Cypress for Tauri E2E testing

Create E2E tests for Ingest Watcher triggering and file routing

Create E2E tests for Pro Tools panel interaction

Create integration tests for "Add Client -> Log Session -> View Timeline" flow

RELIABILITY & ERROR HANDLING

Add structured error logging (Winston/Pino) to capture stack traces in production

Implement global React Error Boundary for the main application container

Add panel-level Error Boundaries for independent recovery

Extend exponential backoff retry logic to Pro Tools MCP connection attempts

Extend exponential backoff retry logic to file system operations

Add offline status detection and UI indicator

Add data sync status indicator (SQLite vs UI state)

SECURITY

Add rate limiting middleware to internal API routes

Implement strict sanitization for shell arguments passed to MCP processes

Add process sandboxing/timeout enforcement for external MCP scripts

Log all MCP operations for security auditing

Implement optional encryption for sensitive DB fields (contact info, rates)

Add PII redaction option for data exports

ARCHITECTURE

Create Repository Layer (/lib/repositories) for all CRM entities

Migrate all db.prepare calls from API routes to Repositories

Extract archive/file routing logic from API routes into Service Layer (/lib/services)

Implement internal Event Emitter (mitt/EventTarget) for cross-panel updates

Audit and optimize Lucide-react tree-shaking for bundle size

PERFORMANCE

Implement pagination for Session Stats history queries

Add database indices for client_id and other foreign keys

Memoize expensive list renders in SessionStatsList

Optimize Zustand selectors in ClientsPanel to minimize re-renders

FEATURES

Add CSV/Excel export engine for billing and session reports

Add full JSON system backup/export feature

Implement in-app Toast notification system

Integrate Tauri native desktop notifications for background file tasks