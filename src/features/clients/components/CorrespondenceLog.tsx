import type { ReactNode } from "react";
import { Mail, MessageSquare, Phone, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import type { ClientCorrespondence } from "@/features/clients/types";

type CorrespondenceLogProps = {
  entries: ClientCorrespondence[];
  showForm: boolean;
  onToggleForm: () => void;
  formContent: ReactNode;
  onEdit?: (entry: ClientCorrespondence) => void;
  onDelete?: (entryId: string) => void;
};

export function CorrespondenceLog({
  entries,
  showForm,
  onToggleForm,
  formContent,
  onEdit,
  onDelete,
}: CorrespondenceLogProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Messages</h3>
        <Button size="xs" variant="secondary" onClick={onToggleForm}>
          {showForm ? "Close" : "Log Message"}
        </Button>
      </div>
      {formContent}
      <div className="space-y-2">
        {entries.map((item) => {
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
              className="group rounded-md bg-secondary/30 px-3 py-2 text-xs"
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
                <div className="flex items-center gap-1">
                  <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    {onEdit && (
                      <button
                        type="button"
                        onClick={() => onEdit(item)}
                        className="rounded p-0.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                        title="Edit entry"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        type="button"
                        onClick={() => onDelete(item.id)}
                        className="rounded p-0.5 text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
                        title="Delete entry"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {item.channel}
                  </Badge>
                </div>
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
}
