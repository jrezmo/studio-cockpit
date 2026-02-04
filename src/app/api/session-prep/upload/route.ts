import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { getUploadRoot } from "@/server/session-prep/config";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid form data." }, { status: 400 });
  }

  const files = formData.getAll("files").filter((item) => item instanceof File) as File[];
  if (!files.length) {
    return NextResponse.json({ ok: false, error: "No files uploaded." }, { status: 400 });
  }

  const uploadRoot = getUploadRoot();
  const batchId = `prep-${Date.now()}`;
  const batchDir = path.join(uploadRoot, batchId);

  try {
    await mkdir(batchDir, { recursive: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? `Unable to create upload folder: ${error.message}`
            : "Unable to create upload folder.",
      },
      { status: 500 }
    );
  }

  const savedFiles: Array<{ name: string; originalName: string; path: string }> = [];

  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const safeName =
      file.name
        .replace(/[^\w.\- ]+/g, "_")
        .replace(/\s+/g, " ")
        .trim() || `file-${Date.now()}`;
    const targetPath = path.join(batchDir, safeName);
    await writeFile(targetPath, buffer);
    savedFiles.push({ name: safeName, originalName: file.name, path: targetPath });
  }

  return NextResponse.json({ ok: true, files: savedFiles }, { status: 200 });
}
