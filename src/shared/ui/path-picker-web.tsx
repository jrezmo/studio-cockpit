"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { FolderInput } from "lucide-react";

const WEB_FOLDER_HINT =
  "Folder selection is only available in browser preview mode.";

function getFolderLabel(files: FileList | null) {
  if (!files || files.length === 0) return "No folder selected";
  const first = files[0];
  const path = (first as File & { webkitRelativePath?: string })
    .webkitRelativePath;
  if (!path) return `${files.length} files selected`;
  const base = path.split("/")[0];
  return `${files.length} files from ${base}`;
}

type WebFolderPickerProps = {
  id: string;
  label: string;
  description?: string;
  onFilesChange: (files: File[]) => void;
  buttonLabel?: string;
  showFilePreview?: boolean;
  previewLimit?: number;
};

export function WebFolderPicker({
  id,
  label,
  description = WEB_FOLDER_HINT,
  onFilesChange,
  buttonLabel = "Choose Folder",
  showFilePreview = false,
  previewLimit = 6,
}: WebFolderPickerProps) {
  const inputId = `${id}-webkit-folder`;
  const [summary, setSummary] = useState("No folder selected");
  const [filesPreview, setFilesPreview] = useState<File[]>([]);

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId} className="text-xs">
        {label}
      </Label>
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild size="sm" variant="secondary">
          <label htmlFor={inputId} className="cursor-pointer">
            <FolderInput className="mr-2 h-4 w-4" />
            {buttonLabel}
          </label>
        </Button>
        <span className="text-xs text-muted-foreground">{summary}</span>
      </div>
      <input
        id={inputId}
        type="file"
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore - non-standard webkitdirectory for folder selection
        webkitdirectory="true"
        multiple
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          onFilesChange(files);
          setSummary(getFolderLabel(event.target.files));
          setFilesPreview(files);
        }}
        className="sr-only"
      />
      <p className="text-[10px] text-muted-foreground">{description}</p>
      {showFilePreview && filesPreview.length > 0 && (
        <div className="space-y-1 text-[10px] text-muted-foreground">
          {filesPreview.slice(0, previewLimit).map((file) => (
            <p key={file.name + file.size} className="truncate font-mono">
              {file.webkitRelativePath || file.name}
            </p>
          ))}
          {filesPreview.length > previewLimit ? (
            <p className="text-[10px] text-muted-foreground">
              + {filesPreview.length - previewLimit} more files
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
