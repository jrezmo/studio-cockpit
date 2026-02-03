"use client";

import { useState } from "react";
import { useStudioStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronRight, Check, Play, User, Disc3, Radio } from "lucide-react";

const sampleRates = [44100, 48000, 88200, 96000];

const steps = [
  { label: "Artist", icon: User },
  { label: "Project", icon: Disc3 },
  { label: "Sample Rate", icon: Radio },
  { label: "Launch", icon: Play },
];

export function SessionLauncher() {
  const projects = useStudioStore((s) => s.projects);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedRate, setSelectedRate] = useState<number | null>(null);

  const artists = [...new Set(projects.map((p) => p.artistName))];
  const artistProjects = projects.filter((p) => p.artistName === selectedArtist);
  const project = projects.find((p) => p.id === selectedProject);

  const canProceed = [
    selectedArtist !== null,
    selectedProject !== null,
    selectedRate !== null,
    true,
  ];

  function reset() {
    setCurrentStep(0);
    setSelectedArtist(null);
    setSelectedProject(null);
    setSelectedRate(null);
  }

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center gap-2">
        {steps.map((step, i) => {
          const Icon = step.icon;
          const done = i < currentStep;
          const active = i === currentStep;
          return (
            <div key={step.label} className="flex items-center gap-2">
              {i > 0 && (
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
              )}
              <button
                onClick={() => i < currentStep && setCurrentStep(i)}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-1.5 text-xs transition-colors",
                  active && "bg-primary/10 text-primary",
                  done && "text-green-500 cursor-pointer hover:bg-secondary",
                  !active && !done && "text-muted-foreground"
                )}
              >
                {done ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Icon className="h-3.5 w-3.5" />
                )}
                {step.label}
              </button>
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <div className="rounded-lg border border-border bg-card p-5">
        {currentStep === 0 && (
          <div>
            <h2 className="mb-4 text-sm font-semibold">Select Artist</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {artists.map((artist) => (
                <button
                  key={artist}
                  onClick={() => {
                    setSelectedArtist(artist);
                    setSelectedProject(null);
                    setSelectedRate(null);
                  }}
                  className={cn(
                    "rounded-md border px-4 py-3 text-left text-sm transition-colors",
                    selectedArtist === artist
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/30"
                  )}
                >
                  {artist}
                </button>
              ))}
            </div>
          </div>
        )}

        {currentStep === 1 && (
          <div>
            <h2 className="mb-4 text-sm font-semibold">
              Select Project for {selectedArtist}
            </h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {artistProjects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedProject(p.id);
                    setSelectedRate(p.sampleRate);
                  }}
                  className={cn(
                    "rounded-md border px-4 py-3 text-left transition-colors",
                    selectedProject === p.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/30"
                  )}
                >
                  <p className="text-sm font-medium">{p.projectName}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {p.songCount} songs &middot; {p.bpm} BPM
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div>
            <h2 className="mb-4 text-sm font-semibold">Confirm Sample Rate</h2>
            <div className="grid grid-cols-4 gap-3">
              {sampleRates.map((rate) => (
                <button
                  key={rate}
                  onClick={() => setSelectedRate(rate)}
                  className={cn(
                    "rounded-md border px-4 py-3 text-center font-mono text-sm transition-colors",
                    selectedRate === rate
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/30 text-muted-foreground"
                  )}
                >
                  {(rate / 1000).toFixed(rate % 1000 === 0 ? 0 : 1)} kHz
                </button>
              ))}
            </div>
          </div>
        )}

        {currentStep === 3 && project && (
          <div>
            <h2 className="mb-4 text-sm font-semibold">Ready to Launch</h2>
            <div className="space-y-2 rounded-md bg-secondary/50 p-4">
              <div className="grid grid-cols-[100px_1fr] gap-2 text-xs">
                <span className="text-muted-foreground">Artist</span>
                <span className="font-medium">{selectedArtist}</span>
                <span className="text-muted-foreground">Project</span>
                <span className="font-medium">{project.projectName}</span>
                <span className="text-muted-foreground">Sample Rate</span>
                <span className="font-mono">
                  {selectedRate && (selectedRate / 1000).toFixed(selectedRate % 1000 === 0 ? 0 : 1)} kHz
                </span>
                <span className="text-muted-foreground">Path</span>
                <span className="font-mono truncate">{project.folderPath}</span>
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <Button className="gap-2">
                <Play className="h-3.5 w-3.5" />
                Launch Pro Tools Session
              </Button>
              <Button variant="outline" onClick={reset}>
                Start Over
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      {currentStep < 3 && (
        <div className="flex justify-end gap-3">
          {currentStep > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentStep(currentStep - 1)}
            >
              Back
            </Button>
          )}
          <Button
            size="sm"
            disabled={!canProceed[currentStep]}
            onClick={() => setCurrentStep(currentStep + 1)}
          >
            Continue
          </Button>
        </div>
      )}
    </div>
  );
}
