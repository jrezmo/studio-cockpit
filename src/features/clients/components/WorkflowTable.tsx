import { format } from "date-fns";
import { ClipboardList, Mail, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/utils";
import type { ClientCorrespondence, ClientProject, ClientTask } from "@/features/clients/types";

const taskStatusStyles: Record<string, string> = {
  todo: "bg-secondary text-secondary-foreground",
  "in-progress": "bg-blue-500/15 text-blue-400",
  blocked: "bg-red-500/15 text-red-400",
  done: "bg-green-500/15 text-green-400",
};

const directionStyles: Record<"inbound" | "outbound", string> = {
  inbound: "bg-purple-500/15 text-purple-400",
  outbound: "bg-amber-500/15 text-amber-400",
};

type WorkflowTableProps = {
  tasks: ClientTask[];
  correspondence: ClientCorrespondence[];
  projects: ClientProject[];
  onEditTask?: (task: ClientTask) => void;
  onDeleteTask?: (taskId: string) => void;
  onEditCorrespondence?: (entry: ClientCorrespondence) => void;
  onDeleteCorrespondence?: (entryId: string) => void;
};

type WorkflowRow = {
  id: string;
  type: "task" | "message";
  title: string;
  project: string;
  statusLabel: string;
  statusClassName: string;
  ownerLabel: string;
  dateLabel: string;
  dateSort: number;
  task?: ClientTask;
  message?: ClientCorrespondence;
};

export function WorkflowTable({
  tasks,
  correspondence,
  projects,
  onEditTask,
  onDeleteTask,
  onEditCorrespondence,
  onDeleteCorrespondence,
}: WorkflowTableProps) {
  const projectById = new Map(projects.map((project) => [project.id, project.name]));

  const rows: WorkflowRow[] = [
    ...tasks.map((task) => ({
      id: `task-${task.id}`,
      type: "task" as const,
      title: task.title,
      project: task.projectId ? projectById.get(task.projectId) ?? "General" : "General",
      statusLabel: task.status.replace("-", " "),
      statusClassName: taskStatusStyles[task.status],
      ownerLabel: task.assignee ?? "Unassigned",
      dateLabel: task.dueAt ? format(new Date(task.dueAt), "MMM d") : "—",
      dateSort: task.dueAt ? new Date(task.dueAt).getTime() : 0,
      task,
    })),
    ...correspondence.map((entry) => ({
      id: `message-${entry.id}`,
      type: "message" as const,
      title: entry.subject,
      project: "—",
      statusLabel: entry.direction === "inbound" ? "Inbound" : "Outbound",
      statusClassName: directionStyles[entry.direction],
      ownerLabel: entry.channel,
      dateLabel: format(new Date(entry.occurredAt), "MMM d, h:mma"),
      dateSort: new Date(entry.occurredAt).getTime(),
      message: entry,
    })),
  ].sort((a, b) => b.dateSort - a.dateSort);

  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Workflow Items</h3>
        <Badge variant="secondary" className="text-[10px]">
          {rows.length} total
        </Badge>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No workflow items yet. Add a task or log a message to get started.
        </p>
      ) : (
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase tracking-wide text-muted-foreground">
                <th className="px-2 py-2 font-semibold">Type</th>
                <th className="px-2 py-2 font-semibold">Item</th>
                <th className="px-2 py-2 font-semibold">Project</th>
                <th className="px-2 py-2 font-semibold">Status</th>
                <th className="px-2 py-2 font-semibold">Owner/Channel</th>
                <th className="px-2 py-2 font-semibold">Date</th>
                <th className="px-2 py-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const Icon = row.type === "task" ? ClipboardList : Mail;
                return (
                  <tr key={row.id} className="border-b border-border/60 last:border-0">
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-secondary/40">
                          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        </span>
                        <span className="font-semibold">
                          {row.type === "task" ? "Task" : "Message"}
                        </span>
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <p className="font-semibold text-foreground">{row.title}</p>
                      {row.type === "message" && row.message?.summary && (
                        <p className="text-[10px] text-muted-foreground">
                          {row.message.summary}
                        </p>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <span
                        className={cn(
                          "text-[10px]",
                          row.project === "—"
                            ? "text-muted-foreground"
                            : "text-foreground"
                        )}
                      >
                        {row.project}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <Badge className={cn("text-[10px]", row.statusClassName)}>
                        {row.statusLabel}
                      </Badge>
                    </td>
                    <td className="px-2 py-2">
                      <span className="text-[10px] text-muted-foreground">
                        {row.ownerLabel}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <span className="text-[10px] text-muted-foreground">
                        {row.type === "task" && row.dateLabel !== "—"
                          ? `Due ${row.dateLabel}`
                          : row.dateLabel}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-1">
                        {row.type === "task" && row.task && onEditTask && (
                          <button
                            type="button"
                            onClick={() => onEditTask(row.task as ClientTask)}
                            className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                            title="Edit task"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                        )}
                        {row.type === "task" && row.task && onDeleteTask && (
                          <button
                            type="button"
                            onClick={() => onDeleteTask(row.task?.id ?? "")}
                            className="rounded p-1 text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
                            title="Delete task"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                        {row.type === "message" && row.message && onEditCorrespondence && (
                          <button
                            type="button"
                            onClick={() => onEditCorrespondence(row.message as ClientCorrespondence)}
                            className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                            title="Edit message"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                        )}
                        {row.type === "message" && row.message && onDeleteCorrespondence && (
                          <button
                            type="button"
                            onClick={() => onDeleteCorrespondence(row.message?.id ?? "")}
                            className="rounded p-1 text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
                            title="Delete message"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
