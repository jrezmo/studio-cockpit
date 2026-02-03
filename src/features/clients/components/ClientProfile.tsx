import { format } from "date-fns";
import { ArrowUpRight, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Separator } from "@/shared/ui/separator";
import { cn } from "@/shared/utils";
import type { Client, ClientProject } from "@/features/clients/types";
import type { Project } from "@/shared/types/projects";

type ClientProfileProps = {
  client: Client;
  activeClientProjects: ClientProject[];
  projects: Project[];
  statusClassName: string;
  formatDuration: (minutes: number) => string;
  onEdit?: (client: Client) => void;
  onDelete?: (clientId: string) => void;
  onEditProject?: (project: ClientProject) => void;
  onDeleteProject?: (projectId: string) => void;
};

export function ClientProfile({
  client,
  activeClientProjects,
  projects,
  statusClassName,
  formatDuration,
  onEdit,
  onDelete,
  onEditProject,
  onDeleteProject,
}: ClientProfileProps) {
  return (
    <div
      className={cn("rounded-lg border border-border bg-card p-5 space-y-4")}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">{client.name}</h3>
          <p className="text-xs text-muted-foreground">
            {client.primaryContact} · {client.email}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(onEdit || onDelete) && (
            <div className="flex gap-1">
              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(client)}
                  className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  title="Edit client"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(client.id)}
                  className="rounded p-1 text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
                  title="Delete client"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
          <Badge className={cn(statusClassName)}>
            {client.status.replace("-", " ")}
          </Badge>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
        {client.tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="text-[10px]">
            {tag}
          </Badge>
        ))}
      </div>

      <Separator />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div>
          <p className="text-xs text-muted-foreground">Rate</p>
          <p className="text-sm font-semibold">${client.ratePerHour}/hr</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Next Session</p>
          <p className="text-sm font-semibold">
            {client.nextSessionAt
              ? format(new Date(client.nextSessionAt), "MMM d, h:mma")
              : "Not scheduled"}
          </p>
        </div>
      </div>

      {client.notes && (
        <div className="rounded-md bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
          {client.notes}
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground">Active Projects</p>
        {activeClientProjects.map((project) => {
          const protoolsProject = projects.find(
            (item) => item.id === project.protoolsProjectId
          );
          return (
            <div
              key={project.id}
              className="group rounded-md border border-border bg-secondary/30 p-3 text-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1">
                  <p className="font-semibold">{project.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {project.status} · {formatDuration(project.totalLoggedMinutes)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {(onEditProject || onDeleteProject) && (
                    <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      {onEditProject && (
                        <button
                          type="button"
                          onClick={() => onEditProject(project)}
                          className="rounded p-0.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                          title="Edit project"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                      )}
                      {onDeleteProject && (
                        <button
                          type="button"
                          onClick={() => onDeleteProject(project.id)}
                          className="rounded p-0.5 text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
                          title="Delete project"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  )}
                  {protoolsProject && (
                    <Badge variant="secondary" className="text-[10px]">
                      {protoolsProject.sampleRate / 1000}kHz
                    </Badge>
                  )}
                </div>
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
}
