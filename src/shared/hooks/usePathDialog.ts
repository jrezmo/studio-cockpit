"use client";

import { open } from "@tauri-apps/plugin-dialog";
import { isTauri } from "@tauri-apps/api/core";

type PathDialogOptions = {
  selectType: "file" | "directory";
  filters?: Array<{ name: string; extensions: string[] }>;
};

export function usePathDialog() {
  const supportsDialog = typeof window !== "undefined" && isTauri();

  async function pickPath(options: PathDialogOptions) {
    if (!supportsDialog) return null;

    const selection = await open({
      directory: options.selectType === "directory",
      multiple: false,
      filters: options.filters,
    });

    return typeof selection === "string" ? selection : null;
  }

  return { supportsDialog, pickPath };
}
