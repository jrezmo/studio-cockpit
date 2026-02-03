import type { ReactNode } from "react";

type ClientProtoolsViewProps = {
  backButton: ReactNode;
  protoolsSessionsCard: ReactNode;
};

export function ClientProtoolsView({
  backButton,
  protoolsSessionsCard,
}: ClientProtoolsViewProps) {
  return (
    <div className="space-y-4">
      {backButton}
      {protoolsSessionsCard}
    </div>
  );
}
