import { render } from "@testing-library/react";
import type { RenderOptions } from "@testing-library/react";
import type { ReactElement } from "react";
import { useStudioStore } from "@/lib/store";
import type {
  Client,
  ClientCorrespondence,
  ClientProject,
  ClientSession,
  ClientTask,
  CrmData,
} from "@/lib/crm/types";

let idCounter = 0;
const nextId = (prefix: string) => `${prefix}-${++idCounter}`;

const initialState = useStudioStore.getState();

export function resetStudioStore() {
  useStudioStore.setState(initialState, true);
}

export function renderWithProviders(
  ui: ReactElement,
  options?: RenderOptions & { storeState?: Partial<ReturnType<typeof useStudioStore.getState>> }
) {
  resetStudioStore();
  if (options?.storeState) {
    useStudioStore.setState(options.storeState);
  }
  const { storeState, ...renderOptions } = options ?? {};
  return render(ui, renderOptions);
}

export function mockApiResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

export const createMockClient = (overrides: Partial<Client> = {}): Client => ({
  id: overrides.id ?? nextId("client"),
  name: overrides.name ?? "Test Client",
  status: overrides.status ?? "active",
  primaryContact: overrides.primaryContact ?? "Alex Engineer",
  email: overrides.email ?? "client@example.com",
  phone: overrides.phone,
  ratePerHour: overrides.ratePerHour ?? 120,
  tags: overrides.tags ?? [],
  lastContactAt: overrides.lastContactAt ?? new Date().toISOString(),
  nextSessionAt: overrides.nextSessionAt,
  notes: overrides.notes,
});

export const createMockProject = (
  overrides: Partial<ClientProject> = {}
): ClientProject => ({
  id: overrides.id ?? nextId("project"),
  clientId: overrides.clientId ?? nextId("client"),
  name: overrides.name ?? "Test Project",
  status: overrides.status ?? "active",
  protoolsProjectId: overrides.protoolsProjectId,
  dueDate: overrides.dueDate,
  lastSessionAt: overrides.lastSessionAt,
  totalLoggedMinutes: overrides.totalLoggedMinutes ?? 0,
});

export const createMockSession = (
  overrides: Partial<ClientSession> = {}
): ClientSession => ({
  id: overrides.id ?? nextId("session"),
  clientId: overrides.clientId ?? nextId("client"),
  projectId: overrides.projectId,
  type: overrides.type ?? "mixing",
  startTime: overrides.startTime ?? new Date().toISOString(),
  endTime: overrides.endTime ?? new Date().toISOString(),
  durationMinutes: overrides.durationMinutes ?? 60,
  billableRate: overrides.billableRate,
  notes: overrides.notes,
});

export const createMockTask = (overrides: Partial<ClientTask> = {}): ClientTask => ({
  id: overrides.id ?? nextId("task"),
  clientId: overrides.clientId ?? nextId("client"),
  projectId: overrides.projectId,
  title: overrides.title ?? "Test task",
  status: overrides.status ?? "todo",
  dueAt: overrides.dueAt,
  assignee: overrides.assignee,
});

export const createMockCorrespondence = (
  overrides: Partial<ClientCorrespondence> = {}
): ClientCorrespondence => ({
  id: overrides.id ?? nextId("corr"),
  clientId: overrides.clientId ?? nextId("client"),
  channel: overrides.channel ?? "email",
  direction: overrides.direction ?? "outbound",
  subject: overrides.subject ?? "Follow-up",
  summary: overrides.summary ?? "Sent a quick check-in.",
  occurredAt: overrides.occurredAt ?? new Date().toISOString(),
  participants: overrides.participants ?? ["Alex Engineer"],
});

export const createMockCrmData = (overrides: Partial<CrmData> = {}): CrmData => ({
  clients: overrides.clients ?? [createMockClient()],
  clientProjects: overrides.clientProjects ?? [],
  clientSessions: overrides.clientSessions ?? [],
  clientTasks: overrides.clientTasks ?? [],
  clientCorrespondence: overrides.clientCorrespondence ?? [],
});
