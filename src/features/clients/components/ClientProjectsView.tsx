import type { ReactNode } from "react";

type ClientProjectsViewProps = {
  backButton: ReactNode;
  projectEditForm: ReactNode;
  projectListCard: ReactNode;
};

export function ClientProjectsView({
  backButton,
  projectEditForm,
  projectListCard,
}: ClientProjectsViewProps) {
  return (
    <div className="space-y-4">
      {backButton}
      {projectEditForm}
      {projectListCard}
    </div>
  );
}
