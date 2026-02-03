import { useEffect, useState } from "react";

export type ClientView =
  | "overview"
  | "projects"
  | "project"
  | "protools"
  | "sessions"
  | "workflow";

export function useClientDrill(activeClientId: string) {
  const [clientView, setClientView] = useState<ClientView>("overview");
  const [focusedProjectId, setFocusedProjectId] = useState<string | null>(null);

  useEffect(() => {
    setClientView("overview");
    setFocusedProjectId(null);
  }, [activeClientId]);

  const goOverview = () => setClientView("overview");
  const goProjects = () => setClientView("projects");
  const openProject = (projectId: string) => {
    setFocusedProjectId(projectId);
    setClientView("project");
  };

  return {
    clientView,
    setClientView,
    focusedProjectId,
    setFocusedProjectId,
    goOverview,
    goProjects,
    openProject,
  };
}
