import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { ClientTask } from "@/lib/crm/types";

type TaskBoardProps = {
  tasksByStatus: Record<"todo" | "in-progress" | "blocked" | "done", ClientTask[]>;
  showTaskForm: boolean;
  onToggleForm: () => void;
  formContent: ReactNode;
};

export function TaskBoard({
  tasksByStatus,
  showTaskForm,
  onToggleForm,
  formContent,
}: TaskBoardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Session Board</h3>
        <Button size="xs" variant="secondary" onClick={onToggleForm}>
          {showTaskForm ? "Close" : "Add Task"}
        </Button>
      </div>
      {formContent}
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
}
