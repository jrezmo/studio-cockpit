"use client";

import { useEffect, useMemo, useState } from "react";
import { useStudioStore } from "@/lib/store";
import type { SessionType } from "@/lib/crm/types";
import { useShallow } from "zustand/react/shallow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Users,
  Timer,
  Mail,
  MessageSquare,
  Phone,
  CalendarClock,
  ClipboardList,
  ArrowUpRight,
} from "lucide-react";
import { format, formatDistanceToNow, isThisMonth } from "date-fns";

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

  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState("");
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
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskStatus, setTaskStatus] = useState<"todo" | "in-progress" | "blocked" | "done">(
    "todo"
  );
  const [taskDueAt, setTaskDueAt] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskProjectId, setTaskProjectId] = useState<string>("");
  const [showCorrespondenceForm, setShowCorrespondenceForm] = useState(false);
  const [corrChannel, setCorrChannel] = useState<"email" | "sms" | "call" | "note">(
    "email"
  );
  const [corrDirection, setCorrDirection] = useState<"inbound" | "outbound">(
    "inbound"
  );
  const [corrSubject, setCorrSubject] = useState("");
  const [corrSummary, setCorrSummary] = useState("");
  const [corrOccurredAt, setCorrOccurredAt] = useState("");
  const [showClientForm, setShowClientForm] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientContact, setClientContact] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientRate, setClientRate] = useState("85");
  const [clientStatus, setClientStatus] = useState<"active" | "at-risk" | "inactive">(
    "active"
  );
  const [consoleTab, setConsoleTab] = useState<
    "overview" | "sessions" | "tasks" | "comms"
  >("overview");

  useEffect(() => {
    if (!timerRunning) return;
    const interval = window.setInterval(
      () => setElapsedSeconds((prev) => prev + 1),
      1000
    );
    return () => window.clearInterval(interval);
  }, [timerRunning]);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    fetch("/api/crm")
      .then((response) => response.json())
      .then((result) => {
        if (!isMounted) return;
        if (result?.ok && result?.data) {
          setCrmData(result.data);
        } else {
          setLoadingError(result?.error || "Unable to load CRM data.");
        }
      })
      .catch(() => {
        if (isMounted) setLoadingError("Unable to load CRM data.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [setCrmData]);

  async function postCrmAction(action: string, payload: Record<string, unknown>) {
    try {
      const response = await fetch("/api/crm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, payload }),
      });
      const result = await response.json();
      if (result?.ok && result?.data) {
        setCrmData(result.data);
        return true;
      }
      setLogError(result?.error || "Unable to save changes.");
      return false;
    } catch {
      setLogError("Unable to save changes.");
      return false;
    }
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
        type: "session",
        title: `${session.type} · ${projectName}`,
        detail: session.notes,
        occurredAt: session.startTime,
        meta: formatDuration(session.durationMinutes),
      };
    });
    const messageItems = activeClientCorrespondence.map((entry) => ({
      id: `message-${entry.id}`,
      type: "message",
      title: entry.subject,
      detail: entry.summary,
      occurredAt: entry.occurredAt,
      meta: `${entry.channel} · ${entry.direction === "inbound" ? "Inbound" : "Outbound"}`,
    }));
    const taskItems = activeClientTasks
      .filter((task) => task.dueAt)
      .map((task) => ({
        id: `task-${task.id}`,
        type: "task",
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
    if (!activeClient || !taskTitle.trim()) {
      setLogError("Add a task title before saving.");
      return;
    }
    setLogError("");
    const saved = await postCrmAction("addTask", {
      clientId: activeClient.id,
      projectId: taskProjectId || undefined,
      title: taskTitle.trim(),
      status: taskStatus,
      dueAt: taskDueAt || undefined,
      assignee: taskAssignee || undefined,
    });
    if (saved) {
      setTaskTitle("");
      setTaskAssignee("");
      setTaskDueAt("");
      setTaskProjectId("");
      setTaskStatus("todo");
      setShowTaskForm(false);
    }
  };

  const handleAddCorrespondence = async () => {
    if (!activeClient || !corrSubject.trim()) {
      setLogError("Add a subject before saving the message.");
      return;
    }
    setLogError("");
    const occurredAt = corrOccurredAt
      ? new Date(corrOccurredAt).toISOString()
      : new Date().toISOString();
    const saved = await postCrmAction("addCorrespondence", {
      clientId: activeClient.id,
      channel: corrChannel,
      direction: corrDirection,
      subject: corrSubject.trim(),
      summary: corrSummary.trim() || "Logged message",
      occurredAt,
      participants: [activeClient.primaryContact],
    });
    if (saved) {
      setCorrSubject("");
      setCorrSummary("");
      setCorrOccurredAt("");
      setShowCorrespondenceForm(false);
    }
  };

  const handleAddClient = async () => {
    if (!clientName.trim() || !clientContact.trim() || !clientEmail.trim()) {
      setLogError("Client name, contact, and email are required.");
      return;
    }
    setLogError("");
    const saved = await postCrmAction("addClient", {
      name: clientName.trim(),
      primaryContact: clientContact.trim(),
      email: clientEmail.trim(),
      phone: clientPhone.trim() || undefined,
      ratePerHour: Number.parseFloat(clientRate) || 0,
      status: clientStatus,
      tags: [],
      lastContactAt: new Date().toISOString(),
      notes: "",
    });
    if (saved) {
      setClientName("");
      setClientContact("");
      setClientEmail("");
      setClientPhone("");
      setClientRate("85");
      setClientStatus("active");
      setShowClientForm(false);
    }
  };

  if (!activeClient) {
    return (
      <div className="rounded-lg border border-border bg-card p-5 text-sm">
        Add a client to start tracking sessions.
      </div>
    );
  }

  const leftRail = (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="h-4 w-4" />
          Client List
        </div>
        <Input
          placeholder="Search clients..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        {loading && (
          <p className="text-[10px] text-muted-foreground">Syncing CRM...</p>
        )}
        <div className="space-y-2">
          {filteredClients.map((client) => {
            const projectCount = clientProjects.filter(
              (project) => project.clientId === client.id
            ).length;
            const lastContact = client.lastContactAt
              ? formatDistanceToNow(new Date(client.lastContactAt), {
                  addSuffix: true,
                })
              : "—";
            return (
              <button
                key={client.id}
                onClick={() => setActiveClientId(client.id)}
                className={cn(
                  "w-full rounded-md border border-transparent bg-secondary/40 px-3 py-2 text-left transition-colors hover:bg-secondary",
                  client.id === activeClient.id && "border-primary/40 bg-secondary"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate">{client.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {projectCount} projects · {lastContact}
                    </p>
                  </div>
                  <Badge
                    className={cn(
                      "text-[10px]",
                      clientStatusStyles[client.status]
                    )}
                  >
                    {client.status.replace("-", " ")}
                  </Badge>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CalendarClock className="h-4 w-4" />
          Upcoming Sessions
        </div>
        <div className="space-y-2 text-xs">
          {clients
            .filter((client) => client.nextSessionAt)
            .map((client) => (
              <div key={client.id} className="flex items-center justify-between">
                <span className="font-medium">{client.name}</span>
                <span className="text-[10px] text-muted-foreground">
                  {format(new Date(client.nextSessionAt ?? ""), "MMM d, h:mma")}
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
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

  const clientProfileCard = (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-5 space-y-4",
        clientsView === "console" &&
          "bg-gradient-to-br from-slate-950/90 via-slate-900/70 to-slate-900/30 border-primary/20"
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3
            className={cn(
              "text-sm font-semibold",
              clientsView === "console" && "text-lg"
            )}
          >
            {activeClient.name}
          </h3>
          <p className="text-xs text-muted-foreground">
            {activeClient.primaryContact} · {activeClient.email}
          </p>
        </div>
        <Badge className={cn(clientStatusStyles[activeClient.status])}>
          {activeClient.status.replace("-", " ")}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
        {activeClient.tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="text-[10px]">
            {tag}
          </Badge>
        ))}
      </div>

      <Separator />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div>
          <p className="text-xs text-muted-foreground">Rate</p>
          <p className="text-sm font-semibold">
            ${activeClient.ratePerHour}/hr
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Next Session</p>
          <p className="text-sm font-semibold">
            {activeClient.nextSessionAt
              ? format(new Date(activeClient.nextSessionAt), "MMM d, h:mma")
              : "Not scheduled"}
          </p>
        </div>
      </div>

      {activeClient.notes && (
        <div className="rounded-md bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
          {activeClient.notes}
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground">
          Active Projects
        </p>
        {activeClientProjects.map((project) => {
          const protoolsProject = projects.find(
            (item) => item.id === project.protoolsProjectId
          );
          return (
            <div
              key={project.id}
              className="rounded-md border border-border bg-secondary/30 p-3 text-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">{project.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {project.status} · {formatDuration(project.totalLoggedMinutes)}
                  </p>
                </div>
                {protoolsProject && (
                  <Badge variant="secondary" className="text-[10px]">
                    {protoolsProject.sampleRate / 1000}kHz
                  </Badge>
                )}
              </div>
              {protoolsProject && (
                <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
                  <ArrowUpRight className="h-3 w-3" />
                  Pro Tools: {protoolsProject.projectName}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const taskForm = showTaskForm ? (
    <div className="rounded-md border border-border bg-secondary/20 p-3 space-y-2">
      <div className="space-y-1.5">
        <Label className="text-[10px]">Task</Label>
        <Input
          value={taskTitle}
          onChange={(event) => setTaskTitle(event.target.value)}
          placeholder="Deliver stems, send mix notes..."
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[10px]">Project</Label>
        <select
          value={taskProjectId}
          onChange={(event) => setTaskProjectId(event.target.value)}
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
            value={taskStatus}
            onChange={(event) =>
              setTaskStatus(
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
            value={taskDueAt}
            onChange={(event) => setTaskDueAt(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px]">Assignee</Label>
          <Input
            value={taskAssignee}
            onChange={(event) => setTaskAssignee(event.target.value)}
          />
        </div>
      </div>
      <Button size="xs" onClick={handleAddTask}>
        Save Task
      </Button>
    </div>
  ) : null;

  const correspondenceForm = showCorrespondenceForm ? (
    <div className="rounded-md border border-border bg-secondary/20 p-3 space-y-2">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-[10px]">Channel</Label>
          <select
            value={corrChannel}
            onChange={(event) =>
              setCorrChannel(event.target.value as "email" | "sms" | "call" | "note")
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
            value={corrDirection}
            onChange={(event) =>
              setCorrDirection(event.target.value as "inbound" | "outbound")
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
            value={corrSubject}
            onChange={(event) => setCorrSubject(event.target.value)}
            placeholder="Session notes, mix feedback..."
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-[10px]">Summary</Label>
          <Input
            value={corrSummary}
            onChange={(event) => setCorrSummary(event.target.value)}
            placeholder="Quick summary of the message"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-[10px]">Occurred At</Label>
          <Input
            type="datetime-local"
            value={corrOccurredAt}
            onChange={(event) => setCorrOccurredAt(event.target.value)}
          />
        </div>
      </div>
      <Button size="xs" onClick={handleAddCorrespondence}>
        Save Entry
      </Button>
    </div>
  ) : null;

  const timerCard = (
    <div className="rounded-lg border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Timer className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Session Timer</h3>
        </div>
        <Badge variant="secondary" className="text-[10px]">
          {timerRunning ? "Running" : elapsedSeconds ? "Paused" : "Idle"}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="rounded-md bg-secondary/40 px-4 py-3 font-mono text-lg">
          {formatElapsed(elapsedSeconds)}
        </div>
        <div className="flex flex-wrap gap-2">
          {!timerRunning && elapsedSeconds === 0 && (
            <Button size="sm" onClick={handleTimerStart}>
              Start
            </Button>
          )}
          {timerRunning && (
            <Button size="sm" variant="secondary" onClick={handleTimerPause}>
              Pause
            </Button>
          )}
          {!timerRunning && elapsedSeconds > 0 && (
            <Button size="sm" onClick={handleTimerResume}>
              Resume
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={handleTimerReset}>
            Reset
          </Button>
          <Button size="sm" variant="secondary" onClick={handleLogTimer}>
            Log Session
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Session Type</Label>
        <div className="flex flex-wrap gap-2">
          {sessionTypeOptions.map((option) => (
            <Button
              key={option}
              size="xs"
              variant={timerType === option ? "secondary" : "ghost"}
              onClick={() => setTimerType(option)}
            >
              {option}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Project</Label>
        <select
          value={timerProjectId}
          onChange={(event) => setTimerProjectId(event.target.value)}
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

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Notes</Label>
        <Input
          value={timerNotes}
          onChange={(event) => setTimerNotes(event.target.value)}
          placeholder="Automation tweaks, review notes..."
        />
      </div>

      <Separator />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ClipboardList className="h-4 w-4" />
          Manual Session Log
        </div>
        <div className="flex gap-2">
          <Button
            size="xs"
            variant={manualMode === "duration" ? "secondary" : "ghost"}
            onClick={() => setManualMode("duration")}
          >
            Duration
          </Button>
          <Button
            size="xs"
            variant={manualMode === "range" ? "secondary" : "ghost"}
            onClick={() => setManualMode("range")}
          >
            Start / End
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Type</Label>
          <select
            value={manualType}
            onChange={(event) => setManualType(event.target.value as SessionType)}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {sessionTypeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Project</Label>
          <select
            value={manualProjectId}
            onChange={(event) => setManualProjectId(event.target.value)}
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
        {manualMode === "duration" ? (
          <div className="space-y-1.5">
            <Label className="text-xs">Duration (minutes)</Label>
            <Input
              value={manualDuration}
              onChange={(event) => setManualDuration(event.target.value)}
              placeholder="90"
            />
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs">Start</Label>
              <Input
                type="datetime-local"
                value={manualStart}
                onChange={(event) => setManualStart(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">End</Label>
              <Input
                type="datetime-local"
                value={manualEnd}
                onChange={(event) => setManualEnd(event.target.value)}
              />
            </div>
          </>
        )}
        <div className="sm:col-span-2 space-y-1.5">
          <Label className="text-xs">Notes</Label>
          <Input
            value={manualNotes}
            onChange={(event) => setManualNotes(event.target.value)}
            placeholder="Session highlights, deliverables..."
          />
        </div>
      </div>

      <Button size="sm" onClick={handleManualLog}>
        Add Session
      </Button>
    </div>
  );

  const loggedSessionsCard = (
    <div className="rounded-lg border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Logged Sessions</h3>
        <Badge variant="secondary" className="text-[10px]">
          {activeClientSessions.length} total
        </Badge>
      </div>
      <div className="space-y-2">
        {activeClientSessions.slice(0, 6).map((session) => {
          const project = clientProjects.find(
            (item) => item.id === session.projectId
          );
          return (
            <div
              key={session.id}
              className="rounded-md bg-secondary/30 px-3 py-2 text-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">
                    {session.type} · {project?.name ?? "General"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {format(new Date(session.startTime), "MMM d, h:mma")} —{" "}
                    {formatDuration(session.durationMinutes)}
                  </p>
                </div>
                <Badge variant="secondary" className="text-[10px]">
                  ${session.billableRate ?? activeClient.ratePerHour}/hr
                </Badge>
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
      {taskForm}
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
    <div className="rounded-lg border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Correspondence</h3>
        <Button
          size="xs"
          variant="secondary"
          onClick={() => setShowCorrespondenceForm((prev) => !prev)}
        >
          {showCorrespondenceForm ? "Close" : "Add Entry"}
        </Button>
      </div>
      {correspondenceForm}
      <div className="space-y-2">
        {activeClientCorrespondence.map((item) => {
          const Icon =
            item.channel === "email"
              ? Mail
              : item.channel === "sms"
              ? MessageSquare
              : item.channel === "call"
              ? Phone
              : Mail;
          return (
            <div
              key={item.id}
              className="rounded-md bg-secondary/30 px-3 py-2 text-xs"
            >
              <div className="flex items-center gap-2">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">{item.subject}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {item.direction === "inbound" ? "Inbound" : "Outbound"} ·{" "}
                    {format(new Date(item.occurredAt), "MMM d, h:mma")}
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {item.channel}
                </Badge>
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {item.summary}
              </p>
            </div>
          );
        })}
      </div>
    </div>
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
    <div className="rounded-lg border border-border bg-card p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Session Board</h3>
        <Button
          size="xs"
          variant="secondary"
          onClick={() => setShowTaskForm((prev) => !prev)}
        >
          {showTaskForm ? "Close" : "Add Task"}
        </Button>
      </div>
      {taskForm}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        {(
          [
            { key: "todo", label: "To Do" },
            { key: "in-progress", label: "In Progress" },
            { key: "blocked", label: "Blocked" },
            { key: "done", label: "Done" },
          ] as const
        ).map((column) => (
          <div key={column.key} className="rounded-md bg-secondary/20 p-3">
            <div className="mb-2 flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{column.label}</span>
              <span>{tasksByStatus[column.key].length}</span>
            </div>
            <div className="space-y-2">
              {tasksByStatus[column.key].map((task) => (
                <div
                  key={task.id}
                  className="rounded-md border border-border bg-secondary/40 px-2.5 py-2 text-xs"
                >
                  <p className="font-semibold">{task.title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {task.assignee ?? "Unassigned"}
                    {task.dueAt ? ` · due ${task.dueAt}` : ""}
                  </p>
                </div>
              ))}
              {tasksByStatus[column.key].length === 0 && (
                <p className="text-[10px] text-muted-foreground">
                  No tasks in this lane.
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
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

      {showClientForm && (
        <div className="rounded-lg border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">New Client</h3>
              <p className="text-xs text-muted-foreground">
                Add a client record to start tracking work.
              </p>
            </div>
            <Button size="xs" variant="outline" onClick={() => setShowClientForm(false)}>
              Close
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Client Name</Label>
              <Input
                value={clientName}
                onChange={(event) => setClientName(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Primary Contact</Label>
              <Input
                value={clientContact}
                onChange={(event) => setClientContact(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input
                type="email"
                value={clientEmail}
                onChange={(event) => setClientEmail(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Phone</Label>
              <Input
                value={clientPhone}
                onChange={(event) => setClientPhone(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Rate (per hour)</Label>
              <Input
                value={clientRate}
                onChange={(event) => setClientRate(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <select
                value={clientStatus}
                onChange={(event) =>
                  setClientStatus(event.target.value as "active" | "at-risk" | "inactive")
                }
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="active">active</option>
                <option value="at-risk">at risk</option>
                <option value="inactive">inactive</option>
              </select>
            </div>
          </div>
          <Button size="sm" onClick={handleAddClient}>
            Save Client
          </Button>
        </div>
      )}

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
