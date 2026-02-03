"use client";

import { useEffect, useMemo, useState } from "react";
import { useStudioStore } from "@/lib/store";
import type { SessionType, CrmData, ClientTask, ClientSession, ClientCorrespondence, Client, ClientProject } from "@/lib/crm/types";
import { useApiMutation } from "@/hooks/useApiMutation";
import { useFetch } from "@/hooks/useFetch";
import { useFormState } from "@/hooks/useFormState";
import { useShallow } from "zustand/react/shallow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Timer, Mail, ClipboardList, Pencil, Trash2 } from "lucide-react";
import { format, formatDistanceToNow, isThisMonth } from "date-fns";
import { ClientList } from "@/components/clients/ClientList";
import { ClientForm } from "@/components/clients/ClientForm";
import { ClientProfile } from "@/components/clients/ClientProfile";
import { CorrespondenceLog } from "@/components/clients/CorrespondenceLog";
import { SessionTimer } from "@/components/clients/SessionTimer";
import { TaskBoard } from "@/components/clients/TaskBoard";

const sessionTypeOptions: SessionType[] = [
  "mixing",
  "recording",
  "editing",
  "production",
  "mastering",
];

const clientViewOptions = [
  { id: "logbook", label: "Logbook" },
  { id: "board", label: "Session Board" },
  { id: "console", label: "Artist Console" },
] as const;

const taskStatusStyles: Record<string, string> = {
  todo: "bg-secondary text-secondary-foreground",
  "in-progress": "bg-blue-500/15 text-blue-400",
  blocked: "bg-red-500/15 text-red-400",
  done: "bg-green-500/15 text-green-400",
};

const clientStatusStyles: Record<string, string> = {
  active: "bg-green-500/15 text-green-400",
  "at-risk": "bg-amber-500/15 text-amber-400",
  inactive: "bg-muted text-muted-foreground",
};

type LogItem = {
  id: string;
  type: "session" | "message" | "task";
  title: string;
  detail?: string;
  occurredAt: string;
  meta?: string;
};

function formatDuration(minutes: number) {
  if (!minutes || Number.isNaN(minutes)) return "0m";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins.toString().padStart(2, "0")}m`;
}

function formatElapsed(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return [
    hours.toString().padStart(2, "0"),
    minutes.toString().padStart(2, "0"),
    secs.toString().padStart(2, "0"),
  ].join(":");
}

export function ClientsPanel() {
  const {
    clients,
    clientProjects,
    clientSessions,
    clientTasks,
    clientCorrespondence,
    activeClientId,
    setActiveClientId,
    setCrmData,
    clientsView,
    setClientsView,
    projects,
  } = useStudioStore(
    useShallow((s) => ({
      clients: s.clients,
      clientProjects: s.clientProjects,
      clientSessions: s.clientSessions,
      clientTasks: s.clientTasks,
      clientCorrespondence: s.clientCorrespondence,
      activeClientId: s.activeClientId,
      setActiveClientId: s.setActiveClientId,
      setCrmData: s.setCrmData,
      clientsView: s.clientsView,
      setClientsView: s.setClientsView,
      projects: s.projects,
    }))
  );

  const [search, setSearch] = useState("");
  const [timerRunning, setTimerRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timerType, setTimerType] = useState<SessionType>("mixing");
  const [timerProjectId, setTimerProjectId] = useState<string>("");
  const [timerNotes, setTimerNotes] = useState("");
  const [manualMode, setManualMode] = useState<"duration" | "range">("duration");
  const [manualType, setManualType] = useState<SessionType>("mixing");
  const [manualProjectId, setManualProjectId] = useState<string>("");
  const [manualDuration, setManualDuration] = useState("90");
  const [manualStart, setManualStart] = useState("");
  const [manualEnd, setManualEnd] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const [logError, setLogError] = useState("");
  const [editingSession, setEditingSession] = useState<ClientSession | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<ClientTask | null>(null);
  const taskForm = useFormState({
    title: "",
    status: "todo" as "todo" | "in-progress" | "blocked" | "done",
    dueAt: "",
    assignee: "",
    projectId: "",
  });
  const [showCorrespondenceForm, setShowCorrespondenceForm] = useState(false);
  const [editingCorrespondence, setEditingCorrespondence] = useState<ClientCorrespondence | null>(null);
  const correspondenceForm = useFormState({
    channel: "email" as "email" | "sms" | "call" | "note",
    direction: "inbound" as "inbound" | "outbound",
    subject: "",
    summary: "",
    occurredAt: "",
  });
  const [showClientForm, setShowClientForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingProject, setEditingProject] = useState<ClientProject | null>(null);
  const [projectForm, setProjectForm] = useState({
    name: "",
    status: "active" as "active" | "mixing" | "review" | "delivered",
    dueDate: "",
  });
  const clientForm = useFormState({
    name: "",
    contact: "",
    email: "",
    phone: "",
    rate: "85",
    status: "active" as "active" | "at-risk" | "inactive",
  });
  const [consoleTab, setConsoleTab] = useState<
    "overview" | "sessions" | "tasks" | "comms"
  >("overview");

  const { error: loadingError, loading } = useFetch<CrmData>("/api/crm", {
    retries: 2,
    delayMs: 400,
    errorMessage: "Unable to load CRM data.",
    onSuccess: setCrmData,
    onError: (message) => {
      console.error("Failed to load CRM data.", message);
    },
  });

  const { mutate: mutateCrm } = useApiMutation<CrmData>("/api/crm", {
    retries: 2,
    delayMs: 400,
    errorMessage: "Unable to save changes.",
    onSuccess: setCrmData,
    onError: setLogError,
  });

  useEffect(() => {
    if (!timerRunning) return;
    const interval = window.setInterval(
      () => setElapsedSeconds((prev) => prev + 1),
      1000
    );
    return () => window.clearInterval(interval);
  }, [timerRunning]);

  async function postCrmAction(action: string, payload: Record<string, unknown>) {
    const result = await mutateCrm({ action, payload });
    return result.ok;
  }

  const filteredClients = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return clients;
    return clients.filter((client) =>
      [client.name, client.primaryContact, client.email]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(query))
    );
  }, [clients, search]);

  const activeClient = useMemo(
    () => clients.find((client) => client.id === activeClientId) ?? clients[0],
    [clients, activeClientId]
  );

  const activeClientProjects = useMemo(
    () =>
      activeClient
        ? clientProjects.filter((project) => project.clientId === activeClient.id)
        : [],
    [clientProjects, activeClient]
  );

  const activeClientSessions = useMemo(
    () =>
      activeClient
        ? clientSessions.filter((session) => session.clientId === activeClient.id)
        : [],
    [clientSessions, activeClient]
  );

  const activeClientTasks = useMemo(
    () =>
      activeClient
        ? clientTasks.filter((task) => task.clientId === activeClient.id)
        : [],
    [clientTasks, activeClient]
  );

  const activeClientCorrespondence = useMemo(
    () =>
      activeClient
        ? clientCorrespondence.filter((item) => item.clientId === activeClient.id)
        : [],
    [clientCorrespondence, activeClient]
  );

  const loggedMinutesThisMonth = useMemo(() => {
    return activeClientSessions
      .filter((session) => isThisMonth(new Date(session.startTime)))
      .reduce((sum, session) => sum + session.durationMinutes, 0);
  }, [activeClientSessions]);

  const openTasksCount = useMemo(
    () =>
      activeClientTasks.filter((task) => task.status !== "done").length,
    [activeClientTasks]
  );

  const tasksByStatus = useMemo(
    () => ({
      todo: activeClientTasks.filter((task) => task.status === "todo"),
      "in-progress": activeClientTasks.filter((task) => task.status === "in-progress"),
      blocked: activeClientTasks.filter((task) => task.status === "blocked"),
      done: activeClientTasks.filter((task) => task.status === "done"),
    }),
    [activeClientTasks]
  );

  const logItems = useMemo<LogItem[]>(() => {
    if (!activeClient) return [];
    const projectById = new Map(clientProjects.map((project) => [project.id, project]));
    const sessionItems = activeClientSessions.map((session) => {
      const projectName = session.projectId
        ? projectById.get(session.projectId)?.name ?? "General"
        : "General";
      return {
        id: `session-${session.id}`,
        type: "session" as const,
        title: `${session.type} · ${projectName}`,
        detail: session.notes,
        occurredAt: session.startTime,
        meta: formatDuration(session.durationMinutes),
      };
    });
    const messageItems = activeClientCorrespondence.map((entry) => ({
      id: `message-${entry.id}`,
      type: "message" as const,
      title: entry.subject,
      detail: entry.summary,
      occurredAt: entry.occurredAt,
      meta: `${entry.channel} · ${entry.direction === "inbound" ? "Inbound" : "Outbound"}`,
    }));
    const taskItems = activeClientTasks
      .filter((task) => task.dueAt)
      .map((task) => ({
        id: `task-${task.id}`,
        type: "task" as const,
        title: task.title,
        detail: task.assignee ? `Assigned to ${task.assignee}` : undefined,
        occurredAt: new Date(task.dueAt ?? "").toISOString(),
        meta: `Due ${task.dueAt}`,
      }));
    return [...sessionItems, ...messageItems, ...taskItems]
      .sort(
        (a, b) =>
          new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
      )
      .slice(0, 8);
  }, [
    activeClient,
    activeClientSessions,
    activeClientCorrespondence,
    activeClientTasks,
    clientProjects,
  ]);

  const latestSession = useMemo(() => {
    if (activeClientSessions.length === 0) return null;
    return [...activeClientSessions].sort(
      (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    )[0];
  }, [activeClientSessions]);

  const lastContactLabel = activeClient?.lastContactAt
    ? formatDistanceToNow(new Date(activeClient.lastContactAt), { addSuffix: true })
    : "—";

  const handleTimerStart = () => {
    setElapsedSeconds(0);
    setTimerRunning(true);
  };

  const handleTimerPause = () => setTimerRunning(false);
  const handleTimerResume = () => setTimerRunning(true);
  const handleTimerReset = () => {
    setTimerRunning(false);
    setElapsedSeconds(0);
  };

  const handleLogTimer = () => {
    if (!activeClient) return;
    setLogError("");
    const durationMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
    if (!elapsedSeconds) {
      setLogError("Start the timer before logging a session.");
      return;
    }
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - durationMinutes * 60 * 1000);
    void postCrmAction("addSession", {
      clientId: activeClient.id,
      projectId: timerProjectId || undefined,
      type: timerType,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      durationMinutes,
      billableRate: activeClient.ratePerHour,
      notes: timerNotes || undefined,
    });
    handleTimerReset();
    setTimerNotes("");
  };

  const handleManualLog = () => {
    if (!activeClient) return;
    setLogError("");
    const durationMinutes =
      manualMode === "duration"
        ? Number.parseInt(manualDuration, 10)
        : Math.round(
            (new Date(manualEnd).getTime() - new Date(manualStart).getTime()) /
              (60 * 1000)
          );

    if (!durationMinutes || Number.isNaN(durationMinutes) || durationMinutes <= 0) {
      setLogError("Enter a valid duration or start/end time.");
      return;
    }

    const now = new Date();
    const startTime =
      manualMode === "range" && manualStart
        ? new Date(manualStart)
        : new Date(now.getTime() - durationMinutes * 60 * 1000);
    const endTime =
      manualMode === "range" && manualEnd ? new Date(manualEnd) : now;

    void postCrmAction("addSession", {
      clientId: activeClient.id,
      projectId: manualProjectId || undefined,
      type: manualType,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      durationMinutes,
      billableRate: activeClient.ratePerHour,
      notes: manualNotes || undefined,
    });

    setManualNotes("");
  };

  const handleAddTask = async () => {
    if (!activeClient || !taskForm.values.title.trim()) {
      setLogError("Add a task title before saving.");
      return;
    }
    setLogError("");
    const saved = await postCrmAction("addTask", {
      clientId: activeClient.id,
      projectId: taskForm.values.projectId || undefined,
      title: taskForm.values.title.trim(),
      status: taskForm.values.status,
      dueAt: taskForm.values.dueAt || undefined,
      assignee: taskForm.values.assignee || undefined,
    });
    if (saved) {
      taskForm.reset();
      setEditingTask(null);
      setShowTaskForm(false);
    }
  };

  const handleEditTask = (task: ClientTask) => {
    setEditingTask(task);
    taskForm.update("title", task.title);
    taskForm.update("status", task.status);
    taskForm.update("dueAt", task.dueAt ?? "");
    taskForm.update("assignee", task.assignee ?? "");
    taskForm.update("projectId", task.projectId ?? "");
    setShowTaskForm(true);
  };

  const handleUpdateTask = async () => {
    if (!editingTask || !taskForm.values.title.trim()) {
      setLogError("Add a task title before saving.");
      return;
    }
    setLogError("");
    const saved = await postCrmAction("updateTask", {
      id: editingTask.id,
      clientId: editingTask.clientId,
      projectId: taskForm.values.projectId || undefined,
      title: taskForm.values.title.trim(),
      status: taskForm.values.status,
      dueAt: taskForm.values.dueAt || undefined,
      assignee: taskForm.values.assignee || undefined,
    });
    if (saved) {
      taskForm.reset();
      setEditingTask(null);
      setShowTaskForm(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    setLogError("");
    await postCrmAction("deleteTask", { id: taskId });
  };

  const handleEditSession = (session: ClientSession) => {
    setEditingSession(session);
    setManualMode("range");
    setManualType(session.type);
    setManualProjectId(session.projectId ?? "");
    setManualStart(session.startTime.slice(0, 16));
    setManualEnd(session.endTime.slice(0, 16));
    setManualNotes(session.notes ?? "");
  };

  const handleUpdateSession = async () => {
    if (!editingSession || !activeClient) return;
    const startDate = new Date(manualStart);
    const endDate = new Date(manualEnd);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      setLogError("Invalid start or end time.");
      return;
    }
    const durationMinutes = Math.round(
      (endDate.getTime() - startDate.getTime()) / 60000
    );
    if (durationMinutes <= 0) {
      setLogError("End time must be after start time.");
      return;
    }
    setLogError("");
    const saved = await postCrmAction("updateSession", {
      id: editingSession.id,
      clientId: editingSession.clientId,
      projectId: manualProjectId || undefined,
      type: manualType,
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      durationMinutes,
      billableRate: editingSession.billableRate,
      notes: manualNotes.trim() || undefined,
    });
    if (saved) {
      setEditingSession(null);
      setManualStart("");
      setManualEnd("");
      setManualNotes("");
    }
  };

  const handleCancelEditSession = () => {
    setEditingSession(null);
    setManualStart("");
    setManualEnd("");
    setManualNotes("");
  };

  const handleDeleteSession = async (sessionId: string) => {
    setLogError("");
    await postCrmAction("deleteSession", { id: sessionId });
  };

  const handleEditCorrespondence = (entry: ClientCorrespondence) => {
    setEditingCorrespondence(entry);
    correspondenceForm.update("channel", entry.channel);
    correspondenceForm.update("direction", entry.direction);
    correspondenceForm.update("subject", entry.subject);
    correspondenceForm.update("summary", entry.summary);
    correspondenceForm.update("occurredAt", entry.occurredAt.slice(0, 16));
    setShowCorrespondenceForm(true);
  };

  const handleUpdateCorrespondence = async () => {
    if (!editingCorrespondence || !correspondenceForm.values.subject.trim()) {
      setLogError("Add a subject before saving the message.");
      return;
    }
    setLogError("");
    const occurredAt = correspondenceForm.values.occurredAt
      ? new Date(correspondenceForm.values.occurredAt).toISOString()
      : editingCorrespondence.occurredAt;
    const saved = await postCrmAction("updateCorrespondence", {
      id: editingCorrespondence.id,
      clientId: editingCorrespondence.clientId,
      channel: correspondenceForm.values.channel,
      direction: correspondenceForm.values.direction,
      subject: correspondenceForm.values.subject.trim(),
      summary: correspondenceForm.values.summary.trim() || "Logged message",
      occurredAt,
      participants: editingCorrespondence.participants,
    });
    if (saved) {
      correspondenceForm.reset();
      setEditingCorrespondence(null);
      setShowCorrespondenceForm(false);
    }
  };

  const handleDeleteCorrespondence = async (entryId: string) => {
    setLogError("");
    await postCrmAction("deleteCorrespondence", { id: entryId });
  };

  const handleAddCorrespondence = async () => {
    if (!activeClient || !correspondenceForm.values.subject.trim()) {
      setLogError("Add a subject before saving the message.");
      return;
    }
    setLogError("");
    const occurredAt = correspondenceForm.values.occurredAt
      ? new Date(correspondenceForm.values.occurredAt).toISOString()
      : new Date().toISOString();
    const saved = await postCrmAction("addCorrespondence", {
      clientId: activeClient.id,
      channel: correspondenceForm.values.channel,
      direction: correspondenceForm.values.direction,
      subject: correspondenceForm.values.subject.trim(),
      summary: correspondenceForm.values.summary.trim() || "Logged message",
      occurredAt,
      participants: [activeClient.primaryContact],
    });
    if (saved) {
      correspondenceForm.reset();
      setShowCorrespondenceForm(false);
    }
  };

  const handleAddClient = async () => {
    if (
      !clientForm.values.name.trim() ||
      !clientForm.values.contact.trim() ||
      !clientForm.values.email.trim()
    ) {
      setLogError("Client name, contact, and email are required.");
      return;
    }
    setLogError("");
    const saved = await postCrmAction("addClient", {
      name: clientForm.values.name.trim(),
      primaryContact: clientForm.values.contact.trim(),
      email: clientForm.values.email.trim(),
      phone: clientForm.values.phone.trim() || undefined,
      ratePerHour: Number.parseFloat(clientForm.values.rate) || 0,
      status: clientForm.values.status,
      tags: [],
      lastContactAt: new Date().toISOString(),
      notes: "",
    });
    if (saved) {
      clientForm.reset();
      setEditingClient(null);
      setShowClientForm(false);
    }
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    clientForm.update("name", client.name);
    clientForm.update("contact", client.primaryContact);
    clientForm.update("email", client.email);
    clientForm.update("phone", client.phone ?? "");
    clientForm.update("rate", String(client.ratePerHour));
    clientForm.update("status", client.status);
    setShowClientForm(true);
  };

  const handleUpdateClient = async () => {
    if (
      !editingClient ||
      !clientForm.values.name.trim() ||
      !clientForm.values.contact.trim() ||
      !clientForm.values.email.trim()
    ) {
      setLogError("Client name, contact, and email are required.");
      return;
    }
    setLogError("");
    const saved = await postCrmAction("updateClient", {
      id: editingClient.id,
      name: clientForm.values.name.trim(),
      primaryContact: clientForm.values.contact.trim(),
      email: clientForm.values.email.trim(),
      phone: clientForm.values.phone.trim() || undefined,
      ratePerHour: Number.parseFloat(clientForm.values.rate) || 0,
      status: clientForm.values.status,
      tags: editingClient.tags,
      lastContactAt: editingClient.lastContactAt,
      nextSessionAt: editingClient.nextSessionAt,
      notes: editingClient.notes,
    });
    if (saved) {
      clientForm.reset();
      setEditingClient(null);
      setShowClientForm(false);
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    setLogError("");
    await postCrmAction("deleteClient", { id: clientId });
    if (activeClientId === clientId) {
      setActiveClientId(clients.find((c) => c.id !== clientId)?.id ?? "");
    }
  };

  const handleEditProject = (project: ClientProject) => {
    setEditingProject(project);
    setProjectForm({
      name: project.name,
      status: project.status,
      dueDate: project.dueDate?.slice(0, 10) ?? "",
    });
    setShowProjectForm(true);
  };

  const handleUpdateProject = async () => {
    if (!editingProject || !projectForm.name.trim()) {
      setLogError("Project name is required.");
      return;
    }
    setLogError("");
    const saved = await postCrmAction("updateProject", {
      id: editingProject.id,
      clientId: editingProject.clientId,
      name: projectForm.name.trim(),
      status: projectForm.status,
      dueDate: projectForm.dueDate || undefined,
      protoolsProjectId: editingProject.protoolsProjectId,
      lastSessionAt: editingProject.lastSessionAt,
      totalLoggedMinutes: editingProject.totalLoggedMinutes,
    });
    if (saved) {
      setProjectForm({ name: "", status: "active", dueDate: "" });
      setEditingProject(null);
      setShowProjectForm(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    setLogError("");
    await postCrmAction("deleteProject", { id: projectId });
  };

  if (!activeClient) {
    return (
      <div className="rounded-lg border border-border bg-card p-5 text-sm">
        Add a client to start tracking sessions.
      </div>
    );
  }

  const leftRail = (
    <ClientList
      filteredClients={filteredClients}
      clients={clients}
      clientProjects={clientProjects}
      activeClientId={activeClient.id}
      onSelectClient={setActiveClientId}
      search={search}
      onSearchChange={setSearch}
      loading={loading}
    />
  );

  const kpiRow = (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-xs text-muted-foreground">Active Projects</p>
        <p className="mt-2 text-lg font-semibold">
          {activeClientProjects.length}
        </p>
      </div>
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-xs text-muted-foreground">Hours This Month</p>
        <p className="mt-2 text-lg font-semibold">
          {formatDuration(loggedMinutesThisMonth)}
        </p>
      </div>
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-xs text-muted-foreground">Open Tasks</p>
        <p className="mt-2 text-lg font-semibold">{openTasksCount}</p>
      </div>
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-xs text-muted-foreground">Last Touch</p>
        <p className="mt-2 text-lg font-semibold">{lastContactLabel}</p>
      </div>
    </div>
  );

  const projectEditForm = showProjectForm && editingProject ? (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Edit Project</h4>
        <Button
          size="xs"
          variant="ghost"
          onClick={() => {
            setProjectForm({ name: "", status: "active", dueDate: "" });
            setEditingProject(null);
            setShowProjectForm(false);
          }}
        >
          Cancel
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label className="text-[10px]">Name</Label>
          <Input
            value={projectForm.name}
            onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px]">Status</Label>
          <select
            value={projectForm.status}
            onChange={(e) =>
              setProjectForm({
                ...projectForm,
                status: e.target.value as "active" | "mixing" | "review" | "delivered",
              })
            }
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="active">active</option>
            <option value="mixing">mixing</option>
            <option value="review">review</option>
            <option value="delivered">delivered</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px]">Due Date</Label>
          <Input
            type="date"
            value={projectForm.dueDate}
            onChange={(e) => setProjectForm({ ...projectForm, dueDate: e.target.value })}
          />
        </div>
      </div>
      <Button size="xs" onClick={handleUpdateProject}>
        Update Project
      </Button>
    </div>
  ) : null;

  const clientProfileCard = (
    <ClientProfile
      client={activeClient}
      activeClientProjects={activeClientProjects}
      projects={projects}
      clientsView={clientsView}
      statusClassName={clientStatusStyles[activeClient.status]}
      formatDuration={formatDuration}
      onEdit={handleEditClient}
      onDelete={handleDeleteClient}
      onEditProject={handleEditProject}
      onDeleteProject={handleDeleteProject}
    />
  );

  const taskFormContent = showTaskForm ? (
    <div className="rounded-md border border-border bg-secondary/20 p-3 space-y-2">
      <div className="space-y-1.5">
        <Label className="text-[10px]">Task</Label>
        <Input
          value={taskForm.values.title}
          onChange={(event) => taskForm.update("title", event.target.value)}
          placeholder="Deliver stems, send mix notes..."
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[10px]">Project</Label>
        <select
          value={taskForm.values.projectId}
          onChange={(event) => taskForm.update("projectId", event.target.value)}
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">General / Non-project</option>
          {activeClientProjects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label className="text-[10px]">Status</Label>
          <select
            value={taskForm.values.status}
            onChange={(event) =>
              taskForm.update(
                "status",
                event.target.value as "todo" | "in-progress" | "blocked" | "done"
              )
            }
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="todo">todo</option>
            <option value="in-progress">in progress</option>
            <option value="blocked">blocked</option>
            <option value="done">done</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px]">Due Date</Label>
          <Input
            type="date"
            value={taskForm.values.dueAt}
            onChange={(event) => taskForm.update("dueAt", event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px]">Assignee</Label>
          <Input
            value={taskForm.values.assignee}
            onChange={(event) => taskForm.update("assignee", event.target.value)}
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="xs" onClick={editingTask ? handleUpdateTask : handleAddTask}>
          {editingTask ? "Update Task" : "Save Task"}
        </Button>
        {editingTask && (
          <Button
            size="xs"
            variant="ghost"
            onClick={() => {
              taskForm.reset();
              setEditingTask(null);
              setShowTaskForm(false);
            }}
          >
            Cancel
          </Button>
        )}
      </div>
    </div>
  ) : null;

  const correspondenceFormContent = showCorrespondenceForm ? (
    <div className="rounded-md border border-border bg-secondary/20 p-3 space-y-2">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-[10px]">Channel</Label>
          <select
            value={correspondenceForm.values.channel}
            onChange={(event) =>
              correspondenceForm.update(
                "channel",
                event.target.value as "email" | "sms" | "call" | "note"
              )
            }
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="email">email</option>
            <option value="sms">sms</option>
            <option value="call">call</option>
            <option value="note">note</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px]">Direction</Label>
          <select
            value={correspondenceForm.values.direction}
            onChange={(event) =>
              correspondenceForm.update(
                "direction",
                event.target.value as "inbound" | "outbound"
              )
            }
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="inbound">inbound</option>
            <option value="outbound">outbound</option>
          </select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-[10px]">Subject</Label>
          <Input
            value={correspondenceForm.values.subject}
            onChange={(event) => correspondenceForm.update("subject", event.target.value)}
            placeholder="Session notes, mix feedback..."
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-[10px]">Summary</Label>
          <Input
            value={correspondenceForm.values.summary}
            onChange={(event) => correspondenceForm.update("summary", event.target.value)}
            placeholder="Quick summary of the message"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-[10px]">Occurred At</Label>
          <Input
            type="datetime-local"
            value={correspondenceForm.values.occurredAt}
            onChange={(event) =>
              correspondenceForm.update("occurredAt", event.target.value)
            }
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="xs" onClick={editingCorrespondence ? handleUpdateCorrespondence : handleAddCorrespondence}>
          {editingCorrespondence ? "Update Entry" : "Save Entry"}
        </Button>
        {editingCorrespondence && (
          <Button
            size="xs"
            variant="ghost"
            onClick={() => {
              correspondenceForm.reset();
              setEditingCorrespondence(null);
              setShowCorrespondenceForm(false);
            }}
          >
            Cancel
          </Button>
        )}
      </div>
    </div>
  ) : null;

  const timerCard = (
    <SessionTimer
      timerRunning={timerRunning}
      elapsedSeconds={elapsedSeconds}
      timerType={timerType}
      onTimerTypeChange={setTimerType}
      timerProjectId={timerProjectId}
      onTimerProjectChange={setTimerProjectId}
      timerNotes={timerNotes}
      onTimerNotesChange={setTimerNotes}
      onTimerStart={handleTimerStart}
      onTimerPause={handleTimerPause}
      onTimerResume={handleTimerResume}
      onTimerReset={handleTimerReset}
      onLogTimer={handleLogTimer}
      sessionTypeOptions={sessionTypeOptions}
      activeClientProjects={activeClientProjects}
      manualMode={manualMode}
      onManualModeChange={setManualMode}
      manualType={manualType}
      onManualTypeChange={setManualType}
      manualProjectId={manualProjectId}
      onManualProjectChange={setManualProjectId}
      manualDuration={manualDuration}
      onManualDurationChange={setManualDuration}
      manualStart={manualStart}
      manualEnd={manualEnd}
      onManualStartChange={setManualStart}
      onManualEndChange={setManualEnd}
      manualNotes={manualNotes}
      onManualNotesChange={setManualNotes}
      onManualLog={handleManualLog}
      formatElapsed={formatElapsed}
    />
  );

  const loggedSessionsCard = (
    <div className="rounded-lg border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Logged Sessions</h3>
        <Badge variant="secondary" className="text-[10px]">
          {activeClientSessions.length} total
        </Badge>
      </div>
      {editingSession && (
        <div className="rounded-md border border-border bg-secondary/20 p-3 space-y-2">
          <p className="text-xs font-semibold">Edit Session</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px]">Start</Label>
              <Input
                type="datetime-local"
                value={manualStart}
                onChange={(e) => setManualStart(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">End</Label>
              <Input
                type="datetime-local"
                value={manualEnd}
                onChange={(e) => setManualEnd(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px]">Type</Label>
              <select
                value={manualType}
                onChange={(e) => setManualType(e.target.value as SessionType)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {sessionTypeOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">Project</Label>
              <select
                value={manualProjectId}
                onChange={(e) => setManualProjectId(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">General</option>
                {activeClientProjects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">Notes</Label>
            <Input
              value={manualNotes}
              onChange={(e) => setManualNotes(e.target.value)}
              placeholder="Session notes..."
            />
          </div>
          <div className="flex gap-2">
            <Button size="xs" onClick={handleUpdateSession}>Update</Button>
            <Button size="xs" variant="ghost" onClick={handleCancelEditSession}>Cancel</Button>
          </div>
        </div>
      )}
      <div className="space-y-2">
        {activeClientSessions.slice(0, 6).map((session) => {
          const project = clientProjects.find(
            (item) => item.id === session.projectId
          );
          return (
            <div
              key={session.id}
              className="group rounded-md bg-secondary/30 px-3 py-2 text-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1">
                  <p className="font-semibold">
                    {session.type} · {project?.name ?? "General"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {format(new Date(session.startTime), "MMM d, h:mma")} —{" "}
                    {formatDuration(session.durationMinutes)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => handleEditSession(session)}
                      className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                      title="Edit session"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSession(session.id)}
                      className="rounded p-1 text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
                      title="Delete session"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    ${session.billableRate ?? activeClient.ratePerHour}/hr
                  </Badge>
                </div>
              </div>
              {session.notes && (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {session.notes}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const tasksCard = (
    <div className="rounded-lg border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Tasks</h3>
        <Button
          size="xs"
          variant="secondary"
          onClick={() => setShowTaskForm((prev) => !prev)}
        >
          {showTaskForm ? "Close" : "Add Task"}
        </Button>
      </div>
      {taskFormContent}
      <div className="space-y-2">
        {activeClientTasks.map((task) => (
          <div
            key={task.id}
            className="rounded-md bg-secondary/30 px-3 py-2 text-xs"
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-semibold">{task.title}</p>
                <p className="text-[10px] text-muted-foreground">
                  {task.assignee ?? "Unassigned"}
                  {task.dueAt ? ` · due ${task.dueAt}` : ""}
                </p>
              </div>
              <Badge
                className={cn("text-[10px]", taskStatusStyles[task.status])}
              >
                {task.status.replace("-", " ")}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const correspondenceCard = (
    <CorrespondenceLog
      entries={activeClientCorrespondence}
      showForm={showCorrespondenceForm}
      onToggleForm={() => {
        if (showCorrespondenceForm && editingCorrespondence) {
          correspondenceForm.reset();
          setEditingCorrespondence(null);
        }
        setShowCorrespondenceForm((prev) => !prev);
      }}
      formContent={correspondenceFormContent}
      onEdit={handleEditCorrespondence}
      onDelete={handleDeleteCorrespondence}
    />
  );

  const logbookTimelineCard = (
    <div className="rounded-lg border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Studio Logbook</h3>
        <Badge variant="secondary" className="text-[10px]">
          {logItems.length} entries
        </Badge>
      </div>
      {logItems.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Log a session or message to start building the timeline.
        </p>
      ) : (
        <div className="relative">
          <div className="absolute left-3 top-2 bottom-2 w-px bg-border/60" />
          <div className="space-y-4">
            {logItems.map((item) => {
              const Icon =
                item.type === "session"
                  ? Timer
                  : item.type === "task"
                  ? ClipboardList
                  : Mail;
              const accentClass =
                item.type === "session"
                  ? "bg-blue-500/15 text-blue-400"
                  : item.type === "task"
                  ? "bg-amber-500/15 text-amber-400"
                  : "bg-purple-500/15 text-purple-400";
              return (
                <div key={item.id} className="relative pl-10 text-xs">
                  <div
                    className={cn(
                      "absolute left-0 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-border",
                      accentClass
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="rounded-md bg-secondary/30 px-3 py-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold">{item.title}</p>
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(item.occurredAt), "MMM d, h:mma")}
                      </span>
                    </div>
                    {item.detail && (
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {item.detail}
                      </p>
                    )}
                    {item.meta && (
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {item.meta}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  const sessionPlannerCard = (
    <div className="rounded-lg border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Session Planner</h3>
        <Badge variant="secondary" className="text-[10px]">
          {activeClient.nextSessionAt ? "Scheduled" : "No booking"}
        </Badge>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-md bg-secondary/30 p-3 text-xs">
          <p className="text-[10px] text-muted-foreground">Next Session</p>
          <p className="mt-2 font-semibold">
            {activeClient.nextSessionAt
              ? format(new Date(activeClient.nextSessionAt), "EEE, MMM d · h:mma")
              : "No session scheduled"}
          </p>
        </div>
        <div className="rounded-md bg-secondary/30 p-3 text-xs">
          <p className="text-[10px] text-muted-foreground">Last Session</p>
          <p className="mt-2 font-semibold">
            {latestSession
              ? format(new Date(latestSession.startTime), "EEE, MMM d · h:mma")
              : "No sessions logged"}
          </p>
          {latestSession && (
            <p className="mt-1 text-[10px] text-muted-foreground">
              {latestSession.type} · {formatDuration(latestSession.durationMinutes)}
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
        <Badge variant="secondary" className="text-[10px]">
          {formatDuration(loggedMinutesThisMonth)} this month
        </Badge>
        <span>•</span>
        <span>{openTasksCount} open tasks</span>
      </div>
    </div>
  );

  const taskBoard = (
    <TaskBoard
      tasksByStatus={tasksByStatus}
      showTaskForm={showTaskForm}
      onToggleForm={() => {
        if (showTaskForm && editingTask) {
          taskForm.reset();
          setEditingTask(null);
        }
        setShowTaskForm((prev) => !prev);
      }}
      onEdit={handleEditTask}
      onDelete={handleDeleteTask}
      formContent={taskFormContent}
    />
  );

  const consoleTabs = (
    <div className="flex flex-wrap gap-2">
      {[
        { id: "overview", label: "Overview" },
        { id: "sessions", label: "Sessions" },
        { id: "tasks", label: "Tasks" },
        { id: "comms", label: "Comms" },
      ].map((tab) => (
        <button
          key={tab.id}
          onClick={() =>
            setConsoleTab(tab.id as "overview" | "sessions" | "tasks" | "comms")
          }
          className={cn(
            "rounded-full border border-transparent px-3 py-1 text-xs transition-colors",
            consoleTab === tab.id
              ? "bg-secondary text-secondary-foreground"
              : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );

  const consoleContent =
    consoleTab === "sessions" ? (
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {timerCard}
        {loggedSessionsCard}
      </div>
    ) : consoleTab === "tasks" ? (
      tasksCard
    ) : consoleTab === "comms" ? (
      correspondenceCard
    ) : (
      <>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {timerCard}
          {loggedSessionsCard}
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {tasksCard}
          {correspondenceCard}
        </div>
      </>
    );

  const logbookView = (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[320px_1fr]">
      {leftRail}
      <div className="space-y-4">
        {kpiRow}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            {clientProfileCard}
            {projectEditForm}
            {logbookTimelineCard}
            {loggedSessionsCard}
          </div>
          <div className="space-y-4">
            {timerCard}
            {tasksCard}
            {correspondenceCard}
          </div>
        </div>
      </div>
    </div>
  );

  const boardView = (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[320px_1fr]">
      {leftRail}
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            {clientProfileCard}
            {projectEditForm}
            {sessionPlannerCard}
          </div>
          <div className="space-y-4">
            {timerCard}
            {correspondenceCard}
          </div>
        </div>
        {taskBoard}
      </div>
    </div>
  );

  const consoleView = (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[320px_1fr]">
      {leftRail}
      <div className="space-y-4">
        {kpiRow}
        {clientProfileCard}
        {projectEditForm}
        {consoleTabs}
        {consoleContent}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Clients</h2>
          <p className="text-xs text-muted-foreground">
            CRM, project tracking, and session logging
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-full border border-border bg-secondary/40 p-1 text-[10px]">
            {clientViewOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => setClientsView(option.id)}
                className={cn(
                  "rounded-full px-3 py-1 transition-colors",
                  clientsView === option.id
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowClientForm((prev) => !prev)}
            >
              {showClientForm ? "Close" : "Add Client"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowCorrespondenceForm(true)}
            >
              Log Message
            </Button>
          </div>
        </div>
      </div>

      <ClientForm
        visible={showClientForm}
        values={clientForm.values}
        onUpdate={(key, value) => clientForm.update(key, value)}
        onClose={() => {
          clientForm.reset();
          setEditingClient(null);
          setShowClientForm(false);
        }}
        onSave={editingClient ? handleUpdateClient : handleAddClient}
        isEditing={!!editingClient}
      />

      {loadingError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-xs text-destructive">
          {loadingError}
        </div>
      )}
      {logError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-xs text-destructive">
          {logError}
        </div>
      )}
      {clientsView === "logbook"
        ? logbookView
        : clientsView === "board"
        ? boardView
        : consoleView}
    </div>
  );
}
