"use client";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { usePathDialog } from "@/shared/hooks/usePathDialog";
import { FolderInput } from "lucide-react";

type PathPickerFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  description?: string;
  selectType: "file" | "directory";
  filters?: Array<{ name: string; extensions: string[] }>;
  browseLabel?: string;
  disabled?: boolean;
};

export function PathPickerField({
  id,
  label,
  value,
  onChange,
  placeholder,
  description,
  selectType,
  filters,
  browseLabel = "Browse",
  disabled = false,
}: PathPickerFieldProps) {
  const { supportsDialog, pickPath } = usePathDialog();

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <div className="grid gap-2 md:grid-cols-[1fr_auto] md:items-end">
        <Input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="font-mono text-sm"
          disabled={disabled}
        />
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="w-full md:w-auto"
          onClick={async () => {
            if (disabled) return;
            const selection = await pickPath({ selectType, filters });
            if (selection) {
              onChange(selection);
            }
          }}
          disabled={!supportsDialog || disabled}
        >
          <FolderInput className="mr-2 h-4 w-4" />
          {browseLabel}
        </Button>
      </div>
      {description && (
        <p className="text-[10px] text-muted-foreground">
          {supportsDialog
            ? description
            : "Manual entry required in web preview mode."}
        </p>
      )}
    </div>
  );
}
