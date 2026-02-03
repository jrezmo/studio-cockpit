import type { ReactNode } from "react";
import { Mail, MessageSquare, Phone } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ClientCorrespondence } from "@/lib/crm/types";

type CorrespondenceLogProps = {
  entries: ClientCorrespondence[];
  showForm: boolean;
  onToggleForm: () => void;
  formContent: ReactNode;
};

export function CorrespondenceLog({
  entries,
  showForm,
  onToggleForm,
  formContent,
}: CorrespondenceLogProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Correspondence</h3>
        <Button size="xs" variant="secondary" onClick={onToggleForm}>
          {showForm ? "Close" : "Add Entry"}
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
}
