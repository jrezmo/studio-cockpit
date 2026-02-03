# Studio Cockpit - Comprehensive Improvement Plan

## Executive Summary

After thorough analysis of the codebase, I've identified improvements across **8 key areas**: code quality, architecture, testing, reliability, security, performance, feature completeness, and technical debt. This plan is organized into **task streams** that can be tackled independently or in parallel.

---

## Progress Log

**Last updated:** 2026-02-03

### Completed
- Stream 1.1: Non-destructive CRM writes via UPSERT + per-entity delete helpers + `replaceCrmData` path for full imports.
- Stream 1.2: CRM input validation with Zod schemas + route integration and clear validation errors.
- Stream 2.1.1: ClientsPanel split into `ClientList`, `ClientProfile`, `SessionTimer`, `TaskBoard`, `CorrespondenceLog`, `ClientForm`.
- Stream 2.1.2: SessionStatsPanel split into `SessionStatsSearch`, `SessionStatsList`, `SessionStatsDetail`, `SessionStatsIngestForm`.
- Stream 2.1.3: Zustand store refactored into slices (single combined store).
- Stream 2.2.1/2.2.2: Shared `useFetch` + `useApiMutation` hooks with retry/backoff helpers.
- Stream 2.2.3: Centralized CRM form state using `useFormState` (client/task/correspondence).
- Stream 2.3.1: Centralized types under `/lib/types` with legacy re-exports.
- Stream 2.4.1/2.4.2: JSDoc + module-level comments for core utils/storage/MCP modules.
- Stream 2 (overall): Verified all Stream 2 tasks complete; no remaining items.
- Stream 3.3.1: Test utilities (`renderWithProviders`, mock helpers, data factories).
- Stream 4.2.1 (partial): Retry logic added for CRM + session-stats API calls.
- Stream 8.1: Implemented Tauri file watcher with routing + extraction events.

### Partially Completed
- Stream 1.3: Migration system with `schema_migrations` table and `001_initial.sql` (rollback support still missing).
- Stream 3.1.1: API route tests added for CRM + session-stats (Pro Tools API tests still missing).
- Stream 3.1.2: CRM storage tests added (broader DB tests still missing).

### Additional Improvements (not originally enumerated)
- Session-stats API validation added with Zod + tests for ingest payloads.
- CRM API route normalized to Node runtime (removed `use server` directive).
- Defaulted client-side API fetches to `cache: "no-store"` to avoid 304/empty JSON responses.
- Stabilized `useFetch` callbacks to prevent refetch loops caused by inline handlers.
- Ingest watcher wired to Tauri with real file routing/extraction + frontend event handling.

---

## Table of Contents

1. [Critical Issues (Address First)](#stream-1-critical-issues)
2. [Code Quality & Maintainability](#stream-2-code-quality--maintainability)
3. [Testing Infrastructure](#stream-3-testing-infrastructure)
4. [Error Handling & Reliability](#stream-4-error-handling--reliability)
5. [Security Hardening](#stream-5-security-hardening)
6. [Performance Optimization](#stream-6-performance-optimization)
7. [Architecture Improvements](#stream-7-architecture-improvements)
8. [Feature Completeness](#stream-8-feature-completeness)

---

## Stream 1: Critical Issues

**Priority: HIGH | Estimated Effort: 1-2 days**

### 1.1 Database Write Operation is Destructive

**Location:** [storage.ts:124-218](src/lib/crm/storage.ts#L124-L218)

**Issue:** The `writeCrmData()` function deletes ALL existing data before inserting, making every update a full table replacement. This is:
- Extremely slow for large datasets
- Prone to data loss if the write fails mid-transaction
- Inefficient for single-record updates

**Fix:**
```
- Implement proper UPSERT operations (INSERT OR REPLACE)
- Add individual record update/delete functions
- Keep full-table-write only for import/export scenarios
```

### 1.2 No Input Validation/Sanitization

**Location:** [route.ts:54-145](src/app/api/crm/route.ts#L54-L145)

**Issue:** API endpoints accept user input without validation beyond basic field presence. Missing:
- Type coercion validation (is `ratePerHour` actually a number?)
- String length limits
- Email format validation
- SQL injection prevention (though better-sqlite3 uses prepared statements)

**Fix:**
```
- Add Zod schemas for all API payloads
- Validate before database operations
- Return specific validation error messages
```

### 1.3 Missing Database Migration System

**Location:** [index.ts:21-126](src/lib/db/index.ts#L21-L126)

**Issue:** Schema changes are handled by a single `user_version` check. No way to:
- Add columns to existing tables
- Transform data during migrations
- Roll back failed migrations

**Fix:**
```
- Implement sequential migration files (001_initial.sql, 002_add_column.sql)
- Track applied migrations in a migrations table
- Add rollback support
```

---

## Stream 2: Code Quality & Maintainability

**Priority: MEDIUM | Estimated Effort: 3-5 days**

### 2.1 Giant Component Files

**Issue:** Several components exceed 500+ lines, making them hard to maintain:

| File | Lines | Issue |
|------|-------|-------|
| [ClientsPanel.tsx](src/components/clients/ClientsPanel.tsx) | 1535 | Contains 30+ useState hooks, 10+ form handlers |
| [SessionStatsPanel.tsx](src/components/session-stats/SessionStatsPanel.tsx) | 651 | Mixed concerns: search, filtering, display, ingest |
| [store.ts](src/lib/store.ts) | 404 | Single store for all app state |

**Fix:**
```
Task 2.1.1: Extract ClientsPanel sub-components
- ClientList.tsx (client sidebar)
- ClientProfile.tsx (profile card)
- SessionTimer.tsx (timer + manual log)
- TaskBoard.tsx (kanban board)
- CorrespondenceLog.tsx (messages)
- ClientForm.tsx (new client modal)

Task 2.1.2: Extract SessionStatsPanel sub-components
- SessionSearch.tsx
- SessionList.tsx
- SessionDetail.tsx
- IngestForm.tsx

Task 2.1.3: Split Zustand store into slices
- useProjectStore
- useCrmStore
- useSessionStatsStore
- useWorkflowStore
- useUIStore
```

### 2.2 Duplicated Patterns

**Issue:** Same patterns repeated across files:

**Pattern 1: Data fetching with loading/error state**
```typescript
// Repeated in ClientsPanel.tsx:156-187, SessionStatsPanel.tsx:68-91
const [loading, setLoading] = useState(false);
const [loadingError, setLoadingError] = useState("");
useEffect(() => {
  let isMounted = true;
  setLoading(true);
  fetch("/api/...")
    .then(...)
    .finally(() => { if (isMounted) setLoading(false); });
  return () => { isMounted = false; };
}, []);
```

**Fix:**
```
Task 2.2.1: Create useFetch custom hook
- Handles loading, error, data states
- Automatic cleanup on unmount
- Optional caching

Task 2.2.2: Create useApiMutation hook
- Handles POST operations with optimistic updates
- Error recovery
```

**Pattern 2: Form state management**
```typescript
// 20+ individual useState calls for forms in ClientsPanel.tsx:109-154
const [taskTitle, setTaskTitle] = useState("");
const [taskStatus, setTaskStatus] = useState("todo");
// ... repeated for every field
```

**Fix:**
```
Task 2.2.3: Implement form library (React Hook Form or useReducer)
- Single form state object
- Built-in validation
- Reduced re-renders
```

### 2.3 Inconsistent Type Definitions

**Issue:** Types defined in multiple places with subtle differences:

```typescript
// store.ts defines ProjectStatus
export type ProjectStatus = "active" | "mixing" | "review" | "delivered";

// types.ts defines ClientProject.status (same values but separate)
status: "active" | "mixing" | "review" | "delivered";
```

**Fix:**
```
Task 2.3.1: Centralize all types in /lib/types/
- /lib/types/crm.ts
- /lib/types/projects.ts
- /lib/types/session-stats.ts
- /lib/types/api.ts (request/response types)
```

### 2.4 Missing JSDoc/Comments

**Issue:** Complex utility functions lack documentation:

- [protools-mcp.ts](src/lib/protools-mcp.ts) - No docs on MCP protocol, expected responses
- [storage.ts](src/lib/crm/storage.ts) - No docs on data flow, transaction behavior
- [utils.ts](src/lib/session-stats/utils.ts) - Aggregation logic undocumented

**Fix:**
```
Task 2.4.1: Add JSDoc to all exported functions
Task 2.4.2: Add module-level comments explaining purpose
```

---

## Stream 3: Testing Infrastructure

**Priority: HIGH | Estimated Effort: 3-4 days**

### 3.1 Critically Low Test Coverage

**Current State:**
- 5 test files total
- Only utility functions and 2 components tested
- 0% coverage on: API routes, database layer, store, most components

**Missing Tests:**

| Area | Files | Risk |
|------|-------|------|
| API Routes | `route.ts` (CRM, ProTools, SessionStats) | Data corruption, security |
| Database | `storage.ts`, `db/index.ts` | Data loss, migration failures |
| Store | `store.ts` | State inconsistencies |
| Components | ClientsPanel, ProToolsPanel, etc. | UI regressions |

**Fix:**
```
Task 3.1.1: Add API route tests
- Test all CRUD operations
- Test validation failures
- Test error handling
- Use test database

Task 3.1.2: Add database layer tests
- Test migrations run correctly
- Test data persistence
- Test transaction rollback on failure

Task 3.1.3: Add store tests
- Test all actions
- Test persistence (localStorage mock)
- Test selectors with derived data

Task 3.1.4: Add component integration tests
- Test user flows (add client -> log session -> view in timeline)
- Test form validation
- Test loading/error states
```

### 3.2 No E2E Tests

**Issue:** No end-to-end testing for critical user flows.

**Fix:**
```
Task 3.2.1: Set up Playwright or Cypress
Task 3.2.2: Add E2E tests for:
- Client creation flow
- Session logging (timer + manual)
- Session stats ingest
- Pro Tools panel (mocked)
```

### 3.3 Missing Test Utilities

**Issue:** No shared test utilities for common patterns.

**Fix:**
```
Task 3.3.1: Create test utilities
- renderWithProviders (Zustand store)
- mockApiResponse helper
- test data factories (createMockClient, createMockSession, etc.)
```

---

## Stream 4: Error Handling & Reliability

**Priority: HIGH | Estimated Effort: 2-3 days**

### 4.1 Silent Failures

**Issue:** Many operations fail silently or show generic errors:

```typescript
// ClientsPanel.tsx:178
.catch(() => {
  if (isMounted) setLoadingError("Unable to load CRM data.");
});
// Actual error is lost - could be network, JSON parse, etc.
```

**Fix:**
```
Task 4.1.1: Add error categorization
- Network errors vs. server errors vs. validation errors
- User-friendly messages with technical details in console

Task 4.1.2: Add global error boundary
- Catch React rendering errors
- Show recovery UI
- Report to error tracking (optional)
```

### 4.2 No Retry Logic

**Issue:** Network requests fail permanently on first error.

**Fix:**
```
Task 4.2.1: Add retry logic to API calls
- Exponential backoff for transient failures
- Configurable retry count
- User-visible retry status
```

### 4.3 No Offline Support

**Issue:** App fails completely without network. LocalStorage has stale data but sync isn't handled.

**Fix:**
```
Task 4.3.1: Add offline detection
- Show offline indicator
- Queue mutations for later sync
- Optimistic UI updates

Task 4.3.2: Add sync status indicator
- "Synced", "Syncing", "Offline - changes pending"
```

### 4.4 Database Error Handling

**Issue:** Database errors (disk full, corruption) not handled gracefully:

```typescript
// db/index.ts - no try/catch around db operations
db = new Database(dbPath);
db.pragma("journal_mode = WAL");
```

**Fix:**
```
Task 4.4.1: Wrap all DB operations in try/catch
Task 4.4.2: Add DB health check endpoint
Task 4.4.3: Add automatic backup before destructive operations
```

---

## Stream 5: Security Hardening

**Priority: MEDIUM | Estimated Effort: 2 days**

### 5.1 Missing Rate Limiting

**Issue:** API endpoints have no rate limiting, enabling:
- DoS attacks
- Data scraping
- Brute force attempts

**Fix:**
```
Task 5.1.1: Add rate limiting middleware
- Per-endpoint limits
- IP-based tracking (for Tauri, use session ID)
```

### 5.2 Pro Tools MCP Security

**Issue:** The MCP integration spawns child processes and passes user input:

```typescript
// protools-mcp.ts:103-107
const child = spawn(process.execPath, [mcpPath], {
  env,
  stdio: ["pipe", "pipe", "pipe"],
});
```

**Risks:**
- Command injection if mcpPath is user-controlled
- Env variable leakage
- No process sandboxing

**Fix:**
```
Task 5.2.1: Validate mcpPath is absolute and within expected directories
Task 5.2.2: Sanitize tool arguments before passing to MCP
Task 5.2.3: Add timeout enforcement (currently 15s, but no graceful handling)
Task 5.2.4: Log all MCP operations for audit
```

### 5.3 Sensitive Data Exposure

**Issue:** Client data (email, phone, rates) stored in plaintext in SQLite and localStorage.

**Fix:**
```
Task 5.3.1: Add option to encrypt sensitive fields in database
Task 5.3.2: Clear localStorage on logout/session end
Task 5.3.3: Add data export with PII redaction option
```

---

## Stream 6: Performance Optimization

**Priority: LOW | Estimated Effort: 2-3 days**

### 6.1 Unnecessary Re-renders

**Issue:** Large component trees re-render on any state change:

```typescript
// ClientsPanel uses useShallow but still extracts many values
const { clients, clientProjects, clientSessions, ... } = useStudioStore(
  useShallow((s) => ({ ... 12 properties ... }))
);
```

**Fix:**
```
Task 6.1.1: Split selectors into smaller chunks
Task 6.1.2: Memoize expensive derived data with useMemo
Task 6.1.3: Add React.memo to list item components
```

### 6.2 Database Query Optimization

**Issue:** `readCrmData()` fetches ALL data every time:

```typescript
// storage.ts - loads entire tables
const clients = db.prepare("SELECT * FROM clients ORDER BY rowid DESC").all();
```

**Fix:**
```
Task 6.2.1: Add pagination to queries
Task 6.2.2: Add query-specific functions (getClientById, getRecentSessions)
Task 6.2.3: Consider client-side filtering for small datasets
```

### 6.3 Bundle Size

**Issue:** No code splitting configured.

**Fix:**
```
Task 6.3.1: Lazy-load panel components
Task 6.3.2: Analyze bundle with @next/bundle-analyzer
Task 6.3.3: Tree-shake unused Lucide icons
```

---

## Stream 7: Architecture Improvements

**Priority: MEDIUM | Estimated Effort: 4-5 days**

### 7.1 Add Repository Pattern

**Issue:** Database access scattered across storage files with duplicated patterns.

**Fix:**
```
Task 7.1.1: Create repository layer
- /lib/repositories/ClientRepository.ts
- /lib/repositories/ProjectRepository.ts
- /lib/repositories/SessionRepository.ts

Each with: findById, findAll, create, update, delete, findByFilter
```

### 7.2 Add Service Layer

**Issue:** Business logic mixed into API routes and components.

**Fix:**
```
Task 7.2.1: Create service layer
- /lib/services/CrmService.ts (client management, validation)
- /lib/services/SessionService.ts (timer, logging, calculations)
- /lib/services/IngestService.ts (file detection, routing)
```

### 7.3 State Management Refactor

**Issue:** Single Zustand store with mixed concerns.

**Fix:**
```
Task 7.3.1: Implement Zustand slices pattern
- Separate stores with namespaced keys
- Shared middleware for persistence
- Type-safe selectors
```

### 7.4 Add Event System

**Issue:** No way for components to react to cross-cutting events (e.g., "session logged").

**Fix:**
```
Task 7.4.1: Add event emitter for app events
- SessionLogged, ClientCreated, TaskCompleted, etc.
- Enable analytics, notifications, cross-panel updates
```

---

## Stream 8: Feature Completeness

**Priority: MEDIUM | Estimated Effort: 5+ days**

### 8.1 Ingest Panel is UI-Only

**Issue:** The File Watcher toggle and detection rules are visual only - no actual file watching implemented.

**Fix:**
```
Task 8.1.1: Implement Tauri file system watcher
- Watch downloads folder
- Detect file types
- Trigger routing logic

Task 8.1.2: Add actual file operations
- Move files to destination
- Extract archives
- Create artist folder structure
```

### 8.2 Missing CRUD Operations

**Issue:** Can only ADD records, no UPDATE or DELETE:

| Entity | Create | Read | Update | Delete |
|--------|--------|------|--------|--------|
| Client | Yes | Yes | No | No |
| Project | Yes | Yes | No | No |
| Session | Yes | Yes | No | No |
| Task | Yes | Yes | No | No |
| Correspondence | Yes | Yes | No | No |

**Fix:**
```
Task 8.2.1: Add edit modals/forms for all entities
Task 8.2.2: Add delete confirmations
Task 8.2.3: Add API endpoints for update/delete
Task 8.2.4: Handle cascading deletes (delete client -> delete their projects)
```

### 8.3 Missing Settings Persistence

**Issue:** Settings are stored in localStorage but not synced to database.

**Fix:**
```
Task 8.3.1: Add settings table to database
Task 8.3.2: Sync settings between localStorage and database
Task 8.3.3: Add settings export/import
```

### 8.4 Missing Data Export

**Issue:** No way to export client/session data for invoicing, reporting, etc.

**Fix:**
```
Task 8.4.1: Add CSV export for sessions (billing reports)
Task 8.4.2: Add JSON export for full backup
Task 8.4.3: Add PDF invoice generation (optional)
```

### 8.5 Missing Notification System

**Issue:** No alerts for upcoming sessions, overdue tasks, etc.

**Fix:**
```
Task 8.5.1: Add in-app notification center
Task 8.5.2: Add desktop notifications (Tauri API)
Task 8.5.3: Add notification preferences
```

---

## Implementation Priority Matrix

| Stream | Priority | Effort | Impact |
|--------|----------|--------|--------|
| Stream 1: Critical Issues | HIGH | 1-2 days | Data safety |
| Stream 4: Error Handling | HIGH | 2-3 days | Reliability |
| Stream 3: Testing | HIGH | 3-4 days | Confidence |
| Stream 2: Code Quality | MEDIUM | 3-5 days | Maintainability |
| Stream 5: Security | MEDIUM | 2 days | Safety |
| Stream 7: Architecture | MEDIUM | 4-5 days | Scalability |
| Stream 8: Features | MEDIUM | 5+ days | Functionality |
| Stream 6: Performance | LOW | 2-3 days | UX polish |

---

## Recommended Execution Order

### Phase 1: Foundation (Week 1)
1. **Stream 1.1** - Fix destructive database writes
2. **Stream 1.2** - Add input validation (Zod)
3. **Stream 4.1** - Add proper error categorization
4. **Stream 3.3** - Create test utilities

### Phase 2: Stability (Week 2)
5. **Stream 3.1** - Add API route tests
6. **Stream 3.2** - Add database tests
7. **Stream 4.2** - Add retry logic
8. **Stream 1.3** - Add migration system

### Phase 3: Quality (Week 3)
9. **Stream 2.1** - Split giant components
10. **Stream 2.2** - Create shared hooks
11. **Stream 3.3** - Add component tests
12. **Stream 5.2** - Harden MCP integration

### Phase 4: Enhancement (Week 4+)
13. **Stream 8.2** - Add update/delete operations
14. **Stream 7.1** - Add repository pattern
15. **Stream 8.1** - Implement actual file watching
16. **Stream 6.1** - Optimize re-renders

---

## Appendix: Files to Create

```
/src
├── /hooks
│   ├── useFetch.ts
│   ├── useApiMutation.ts
│   └── useFormState.ts
├── /lib
│   ├── /repositories
│   │   ├── ClientRepository.ts
│   │   ├── ProjectRepository.ts
│   │   └── SessionRepository.ts
│   ├── /services
│   │   ├── CrmService.ts
│   │   ├── SessionService.ts
│   │   └── IngestService.ts
│   ├── /validation
│   │   ├── clientSchema.ts
│   │   ├── sessionSchema.ts
│   │   └── taskSchema.ts
│   └── /types
│       ├── api.ts
│       ├── crm.ts
│       └── projects.ts
├── /components
│   ├── /clients
│   │   ├── ClientList.tsx
│   │   ├── ClientProfile.tsx
│   │   ├── SessionTimer.tsx
│   │   ├── TaskBoard.tsx
│   │   └── ClientForm.tsx
│   └── /shared
│       ├── ErrorBoundary.tsx
│       ├── LoadingState.tsx
│       └── ConfirmDialog.tsx
└── /__tests__
    ├── /api
    │   ├── crm.test.ts
    │   └── session-stats.test.ts
    ├── /db
    │   └── storage.test.ts
    └── /integration
        └── client-flow.test.ts
```

---

## Appendix: Dependencies to Consider Adding

| Package | Purpose | Priority |
|---------|---------|----------|
| `zod` | Schema validation | HIGH |
| `react-hook-form` | Form state management | MEDIUM |
| `@tanstack/react-query` | Server state management | MEDIUM |
| `playwright` | E2E testing | HIGH |
| `zustand/middleware/immer` | Immutable state updates | LOW |
| `winston` or `pino` | Structured logging | MEDIUM |

---

*Generated: 2026-02-03*
*Codebase Version: 0.1.0*
