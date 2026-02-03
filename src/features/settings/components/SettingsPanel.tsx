"use client";

import { useStudioStore } from "@/state/store";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Separator } from "@/shared/ui/separator";
import { Download, FolderOpen, LayoutTemplate, AudioLines } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

const pathFields = [
  {
    key: "downloadsPath" as const,
    label: "Session Prep Default Folder",
    description: "Default source folder offered when prepping session files",
    icon: Download,
  },
  {
    key: "artistFoldersPath" as const,
    label: "Artist Folders Root",
    description: "Base path for all artist project folders",
    icon: FolderOpen,
  },
  {
    key: "templatesPath" as const,
    label: "Pro Tools Templates",
    description: "Session templates for new projects",
    icon: LayoutTemplate,
  },
  {
    key: "stemsOutputPath" as const,
    label: "Stems Output",
    description: "Default destination for printed stems",
    icon: AudioLines,
  },
];

export function SettingsPanel() {
  const { settings, updateSettings } = useStudioStore(
    useShallow((s) => ({
      settings: s.settings,
      updateSettings: s.updateSettings,
    }))
  );

  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-lg border border-border bg-card p-5">
        <h2 className="mb-1 text-sm font-semibold">File Paths</h2>
        <p className="mb-5 text-xs text-muted-foreground">
          Configure the folder paths Studio Cockpit uses for file operations.
        </p>

        <div className="space-y-5">
          {pathFields.map((field, i) => {
            const Icon = field.icon;
            return (
              <div key={field.key}>
                {i > 0 && <Separator className="mb-5" />}
                <div className="space-y-1.5">
                  <Label
                    htmlFor={field.key}
                    className="flex items-center gap-2 text-xs"
                  >
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    {field.label}
                  </Label>
                  <Input
                    id={field.key}
                    value={settings[field.key]}
                    onChange={(e) =>
                      updateSettings({ [field.key]: e.target.value })
                    }
                    className="font-mono text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    {field.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
