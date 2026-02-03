import type { ReactNode } from "react";

type ClientWorkflowViewProps = {
  backButton: ReactNode;
  taskBoard: ReactNode;
  correspondenceCard: ReactNode;
};

export function ClientWorkflowView({
  backButton,
  taskBoard,
  correspondenceCard,
}: ClientWorkflowViewProps) {
  return (
    <div className="space-y-4">
      {backButton}
      {taskBoard}
      {correspondenceCard}
    </div>
  );
}
