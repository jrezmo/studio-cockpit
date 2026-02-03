import { render, screen } from "@testing-library/react";
import { ProjectCard } from "@/components/dashboard/ProjectCard";
import type { Project } from "@/lib/types/projects";

const baseProject: Project = {
  id: "proj-1",
  artistName: "Ava Monroe",
  projectName: "Midnight Electric",
  folderPath: "/Volumes/Studio/Artists/Ava Monroe/Midnight Electric",
  sampleRate: 48000,
  bpm: 124,
  songCount: 12,
  sizeBytes: 87_400_000_000,
  status: "active",
  updatedAt: "2026-01-28T14:30:00Z",
};

describe("ProjectCard", () => {
  it("renders without crashing for unknown status", () => {
    const project = { ...baseProject, status: "unknown" as Project["status"] };
    expect(() => render(<ProjectCard project={project} />)).not.toThrow();
    expect(screen.getByText("Active")).toBeInTheDocument();
  });
});
