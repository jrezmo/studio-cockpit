# CRM Documentation

This document defines the CRM data model, storage, and API contracts.

## Overview

The CRM subsystem tracks clients, projects, sessions, tasks, and correspondence.
Data is persisted in a local SQLite database and surfaced through `/api/crm`.

## Storage

- Database file: `data/studio-cockpit.db`
- Loader/writer: `src/lib/crm/storage.ts`
- Seed data: `src/lib/crm/seed.ts`
- API route: `src/app/api/crm/route.ts`

### Tables

- `clients`
- `client_projects`
- `client_sessions`
- `client_tasks`
- `client_correspondence`

## Data Model

Source of truth types live in `src/lib/crm/types.ts`.

### Client
```ts
type Client = {
  id: string;
  name: string;
  status: "active" | "at-risk" | "inactive";
  primaryContact: string;
  email: string;
  phone?: string;
  ratePerHour: number;
  tags: string[];
  lastContactAt: string;
  nextSessionAt?: string;
  notes?: string;
};
```

### ClientProject
```ts
type ClientProject = {
  id: string;
  clientId: string;
  name: string;
  status: "active" | "mixing" | "review" | "delivered";
  protoolsProjectId?: string;
  dueDate?: string;
  lastSessionAt?: string;
  totalLoggedMinutes: number;
};
```

### ClientSession
```ts
type ClientSession = {
  id: string;
  clientId: string;
  projectId?: string;
  type: "mixing" | "recording" | "editing" | "production" | "mastering";
  startTime: string;
  endTime: string;
  durationMinutes: number;
  billableRate?: number;
  notes?: string;
};
```

### ClientTask
```ts
type ClientTask = {
  id: string;
  clientId: string;
  projectId?: string;
  title: string;
  status: "todo" | "in-progress" | "blocked" | "done";
  dueAt?: string;
  assignee?: string;
};
```

### ClientCorrespondence
```ts
type ClientCorrespondence = {
  id: string;
  clientId: string;
  channel: "email" | "sms" | "call" | "note";
  direction: "inbound" | "outbound";
  subject: string;
  summary: string;
  occurredAt: string;
  participants: string[];
};
```

## API

`GET /api/crm`

Returns the full CRM dataset:
```json
{ "ok": true, "data": { "clients": [], "clientProjects": [], "clientSessions": [], "clientTasks": [], "clientCorrespondence": [] } }
```

`POST /api/crm`

Supported actions:
```json
{ "action": "addSession", "payload": { /* ClientSession without id */ } }
{ "action": "addTask", "payload": { /* ClientTask without id */ } }
{ "action": "addCorrespondence", "payload": { /* ClientCorrespondence without id */ } }
{ "action": "addClient", "payload": { /* Client without id */ } }
{ "action": "addProject", "payload": { /* ClientProject without id */ } }
```

Legacy note:
- If `data/crm.json` exists, it is imported into SQLite the first time the DB is created.
