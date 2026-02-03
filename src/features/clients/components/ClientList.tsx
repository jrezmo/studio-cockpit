import { formatDistanceToNow } from "date-fns";
import { Users } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { cn } from "@/shared/utils";
import type { Client, ClientProject } from "@/features/clients/types";

const clientStatusStyles: Record<string, string> = {
  active: "bg-green-500/15 text-green-400",
  "at-risk": "bg-amber-500/15 text-amber-400",
  inactive: "bg-muted text-muted-foreground",
};

type ClientListProps = {
  filteredClients: Client[];
  clients: Client[];
  clientProjects: ClientProject[];
  activeClientId: string;
  onSelectClient: (clientId: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  loading: boolean;
};

export function ClientList({
  filteredClients,
  clients,
  clientProjects,
  activeClientId,
  onSelectClient,
  search,
  onSearchChange,
  loading,
}: ClientListProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="h-4 w-4" />
          Client List
        </div>
        <Input
          placeholder="Search clients..."
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
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
                onClick={() => onSelectClient(client.id)}
                className={cn(
                  "w-full rounded-md border border-transparent bg-secondary/40 px-3 py-2 text-left transition-colors hover:bg-secondary",
                  client.id === activeClientId && "border-primary/40 bg-secondary"
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
    </div>
  );
}
