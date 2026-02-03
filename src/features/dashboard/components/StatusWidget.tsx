"use client";

import { cn } from "@/shared/utils";

interface StatusWidgetProps {
  label: string;
  value: string;
  status: "green" | "yellow" | "red";
  detail?: string;
}

const statusColors = {
  green: "bg-green-500",
  yellow: "bg-yellow-500",
  red: "bg-red-500",
};

const statusGlow = {
  green: "status-green",
  yellow: "status-yellow",
  red: "status-red",
};

export function StatusWidget({ label, value, status, detail }: StatusWidgetProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
        <span
          className={cn(
            "h-2.5 w-2.5 rounded-full",
            statusColors[status],
            statusGlow[status]
          )}
        />
      </div>
      <p className="mt-2 text-lg font-semibold">{value}</p>
      {detail && (
        <p className="mt-0.5 text-xs text-muted-foreground font-mono">
          {detail}
        </p>
      )}
    </div>
  );
}
