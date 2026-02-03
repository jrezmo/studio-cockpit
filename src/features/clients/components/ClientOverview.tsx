import type { ReactNode } from "react";

type ClientOverviewProps = {
  profileCard: ReactNode;
  kpiRow: ReactNode;
  lastTouchLabel: string;
  drillCards: ReactNode;
  sessionPlannerCard: ReactNode;
  logbookTimelineCard: ReactNode;
};

export function ClientOverview({
  profileCard,
  kpiRow,
  lastTouchLabel,
  drillCards,
  sessionPlannerCard,
  logbookTimelineCard,
}: ClientOverviewProps) {
  return (
    <div className="space-y-4">
      {profileCard}
      {kpiRow}
      <p className="text-xs text-muted-foreground">
        Last touch {lastTouchLabel}
      </p>
      {drillCards}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {sessionPlannerCard}
        {logbookTimelineCard}
      </div>
    </div>
  );
}
