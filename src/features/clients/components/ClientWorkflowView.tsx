import type { ReactNode } from "react";

type ClientWorkflowViewProps = {
  backButton: ReactNode;
  workflowControls: ReactNode;
  workflowTable: ReactNode;
};

export function ClientWorkflowView({
  backButton,
  workflowControls,
  workflowTable,
}: ClientWorkflowViewProps) {
  return (
    <div className="space-y-4">
      {backButton}
      {workflowControls}
      {workflowTable}
    </div>
  );
}
