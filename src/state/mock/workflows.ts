import type { Project, WorkflowStep } from "@/shared/types/projects";

export const createMixingWorkflowSteps = (): WorkflowStep[] => [
  {
    id: "mix-step-1",
    title: "Collect source files",
    detail:
      "Download audio files and the Pro Tools session from the transfer service.",
    status: "todo",
  },
  {
    id: "mix-step-2",
    title: "Place files in artist folder",
    detail:
      "Unzip and move to the artist folder on the session drive (waves go in Uploaded Tracks).",
    status: "todo",
  },
  {
    id: "mix-step-3",
    title: "Clear downloads",
    detail:
      "Delete the original download so Pro Tools won’t reference the wrong location.",
    status: "todo",
  },
  {
    id: "mix-step-4",
    title: "Create new session",
    detail:
      "Start a new Pro Tools session with the correct sample rate and mix template I/O.",
    status: "todo",
  },
  {
    id: "mix-step-5",
    title: "Import audio",
    detail: "Import WAVs into the new session.",
    status: "todo",
  },
  {
    id: "mix-step-6",
    title: "Import template routing",
    detail:
      "Import session data from the mix template (routing, I/O, and recurring settings).",
    status: "todo",
  },
  {
    id: "mix-step-7",
    title: "Organize multitracks",
    detail:
      "Route and move tracks into their folders (kick in/out, drums, etc.) before mixing.",
    status: "todo",
  },
];

export const createMixingWorkflowsByProject = (projects: Project[]) =>
  Object.fromEntries(
    projects.map((project) => [project.id, createMixingWorkflowSteps()])
  );
