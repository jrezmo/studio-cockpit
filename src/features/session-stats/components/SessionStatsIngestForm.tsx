import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/utils";

type IngestState = "idle" | "loading" | "error" | "ok";

type SessionStatsIngestFormProps = {
  ingestState: IngestState;
  ingestMessage: string;
  ingestPayload: string;
  onPayloadChange: (value: string) => void;
  onIngest: () => void;
  onClear: () => void;
};

export function SessionStatsIngestForm({
  ingestState,
  ingestMessage,
  ingestPayload,
  onPayloadChange,
  onIngest,
  onClear,
}: SessionStatsIngestFormProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Ingest Sessions</h3>
          <p className="text-xs text-muted-foreground">
            Paste the JSON export from your session extractor. We will index
            tracks and plugin usage immediately.
          </p>
        </div>
        <Badge
          variant="secondary"
          className={cn(
            "text-[10px]",
            ingestState === "error" && "bg-destructive/15 text-destructive",
            ingestState === "ok" && "bg-green-500/15 text-green-400",
            ingestState === "loading" && "bg-amber-500/15 text-amber-400"
          )}
        >
          {ingestState === "idle" && "Idle"}
          {ingestState === "loading" && "Ingesting"}
          {ingestState === "ok" && "Ingested"}
          {ingestState === "error" && "Error"}
        </Badge>
      </div>
      {ingestMessage && (
        <p className="rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs">
          {ingestMessage}
        </p>
      )}
      <textarea
        value={ingestPayload}
        onChange={(e) => onPayloadChange(e.target.value)}
        placeholder='{"sessions":[{"name":"Session Name","tracks":[{"name":"Lead","plugins":[{"name":"FabFilter Pro-Q 3"}]}]}]}'
        className="min-h-[140px] w-full rounded-md border border-border bg-background p-3 text-xs font-mono text-foreground"
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={onIngest} disabled={!ingestPayload}>
          Ingest Now
        </Button>
        <Button size="sm" variant="secondary" onClick={onClear}>
          Clear
        </Button>
      </div>
    </div>
  );
}
