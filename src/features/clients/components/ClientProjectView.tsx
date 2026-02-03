import type { ReactNode } from "react";

type ClientProjectViewProps = {
  backButton: ReactNode;
  projectEditForm: ReactNode;
  projectDetailCard: ReactNode;
  projectSessionsCard: ReactNode;
  projectTasksCard: ReactNode;
};

export function ClientProjectView({
  backButton,
  projectEditForm,
  projectDetailCard,
  projectSessionsCard,
  projectTasksCard,
}: ClientProjectViewProps) {
  return (
    <div className="space-y-4">
      {backButton}
      {projectEditForm}
      {projectDetailCard}
      {projectSessionsCard}
      {projectTasksCard}
    </div>
  );
}
