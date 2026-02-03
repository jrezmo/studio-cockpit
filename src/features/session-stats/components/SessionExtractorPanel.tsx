"use client";

import { Button } from "@/shared/ui/button";
import { FolderUp } from "lucide-react";

type SessionExtractorPanelProps = {
  onExtract: () => void;
  isExtracting: boolean;
  message: string;
};

export function SessionExtractorPanel({
  onExtract,
  isExtracting,
  message,
}: SessionExtractorPanelProps) {
  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">Import from Folder</h3>
          <p className="text-sm text-muted-foreground">
            Scan a folder for .ptx files and import them automatically.
          </p>
        </div>
        <Button size="sm" onClick={onExtract} disabled={isExtracting}>
          <FolderUp className="mr-2 h-4 w-4" />
          {isExtracting ? "Scanning..." : "Select Folder"}
        </Button>
      </div>
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}
