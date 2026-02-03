import type { ReactNode } from "react";

type ClientSessionsViewProps = {
  backButton: ReactNode;
  sessionPlannerCard: ReactNode;
  timerCard: ReactNode;
  loggedSessionsCard: ReactNode;
};

export function ClientSessionsView({
  backButton,
  sessionPlannerCard,
  timerCard,
  loggedSessionsCard,
}: ClientSessionsViewProps) {
  return (
    <div className="space-y-4">
      {backButton}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {sessionPlannerCard}
        {timerCard}
      </div>
      {loggedSessionsCard}
    </div>
  );
}
