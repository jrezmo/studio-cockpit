export type ClientStatus = "active" | "at-risk" | "inactive";
export type SessionType =
  | "mixing"
  | "recording"
  | "editing"
  | "production"
  | "mastering";
export type TaskStatus = "todo" | "in-progress" | "blocked" | "done";
export type CorrespondenceChannel = "email" | "sms" | "call" | "note";
export type CorrespondenceDirection = "inbound" | "outbound";

export interface Client {
  id: string;
  name: string;
  status: ClientStatus;
  primaryContact: string;
  email: string;
  phone?: string;
  ratePerHour: number;
  tags: string[];
  lastContactAt: string;
  nextSessionAt?: string;
  notes?: string;
}

export interface ClientProject {
  id: string;
  clientId: string;
  name: string;
  status: "active" | "mixing" | "review" | "delivered";
  protoolsProjectId?: string;
  dueDate?: string;
  lastSessionAt?: string;
  totalLoggedMinutes: number;
}

export interface ClientSession {
  id: string;
  clientId: string;
  projectId?: string;
  type: SessionType;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  billableRate?: number;
  notes?: string;
}

export interface ClientTask {
  id: string;
  clientId: string;
  projectId?: string;
  title: string;
  status: TaskStatus;
  dueAt?: string;
  assignee?: string;
}

export interface ClientCorrespondence {
  id: string;
  clientId: string;
  channel: CorrespondenceChannel;
  direction: CorrespondenceDirection;
  subject: string;
  summary: string;
  occurredAt: string;
  participants: string[];
}

export interface CrmData {
  clients: Client[];
  clientProjects: ClientProject[];
  clientSessions: ClientSession[];
  clientTasks: ClientTask[];
  clientCorrespondence: ClientCorrespondence[];
}
