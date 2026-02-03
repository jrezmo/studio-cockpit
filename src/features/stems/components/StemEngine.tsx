"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Checkbox } from "@/shared/ui/checkbox";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Separator } from "@/shared/ui/separator";
import { PathPickerField } from "@/shared/ui/path-picker";
import { WebFolderPicker } from "@/shared/ui/path-picker-web";
import { usePathDialog } from "@/shared/hooks/usePathDialog";
import { useStudioStore } from "@/state/store";
import { AudioLines, Copy, Printer, HardDrive, Play } from "lucide-react";

type StemBounceResponse = {
  ok: boolean;
  error?: string;
  result?: unknown;
};

const defaultParts = [
  "Full Mix",
  "Inst",
  "Acapella",
  "Vox Up",
  "Vox Down",
  "TV Mix",
  "Bass Up",
  "Drums Up",
  "Clean",
  "Dirty",
];

export function StemEngine() {
  const settings = useStudioStore((s) => s.settings);
  const { supportsDialog } = usePathDialog();
  const [songTitle, setSongTitle] = useState("");
  const [selectedParts, setSelectedParts] = useState<string[]>(
    defaultParts.slice(0, 6)
  );
  const [sessionPath, setSessionPath] = useState("");
  const [outputDirectory, setOutputDirectory] = useState(
    settings.stemsOutputPath
  );
  const [sampleRate, setSampleRate] = useState("SRate_48000");
  const [bitDepth, setBitDepth] = useState("BDepth_24");
  const [exportFormat, setExportFormat] = useState("EFormat_Interleaved");
  const [fileType, setFileType] = useState("EMFType_WAV");
  const [mixSourceType, setMixSourceType] = useState("EMSType_Bus");
  const [mixSourceName, setMixSourceName] = useState("Mix Bus");
  const [stemSources, setStemSources] = useState<Record<string, string>>(() =>
    Object.fromEntries(defaultParts.slice(0, 6).map((part) => [part, part]))
  );
  const [offlineBounce, setOfflineBounce] = useState(true);
  const [bpm, setBpm] = useState("124");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "ok">(
    "idle"
  );
  const [message, setMessage] = useState<string>("");
  const [printLog, setPrintLog] = useState<string[]>([]);
  const [webSessionFiles, setWebSessionFiles] = useState<File[]>([]);
  const [webSessionName, setWebSessionName] = useState<string>("");
  const [webSessionMissing, setWebSessionMissing] = useState(false);

  function togglePart(part: string) {
    setSelectedParts((prev) =>
      prev.includes(part) ? prev.filter((p) => p !== part) : [...prev, part]
    );
  }

  const sanitized = songTitle.replace(/\s+/g, "").replace(/[^a-zA-Z0-9]/g, "");

  function sampleRateToKhzLabel(value: string) {
    const match = value.match(/\d+/);
    const parsed = match ? Number.parseInt(match[0], 10) : Number.NaN;
    if (!Number.isFinite(parsed)) return "Rate";
    return parsed % 1000 === 0
      ? `${parsed / 1000}k`
      : `${(parsed / 1000).toFixed(1)}k`;
  }

  function fileTypeExtension(value: string) {
    switch (value) {
      case "EMFType_AIFF":
        return "aif";
      case "EMFType_MP3":
        return "mp3";
      case "EMFType_WAV":
      default:
        return "wav";
    }
  }

  function generateFilename(part: string) {
    const partClean = part.replace(/\s+/g, "");
    const rateKhz = sampleRateToKhzLabel(sampleRate);
    return `${sanitized || "SongTitle"}_${partClean}_${rateKhz}_${bpm || "BPM"}.${fileTypeExtension(
      fileType
    )}`;
  }

  async function callStemBounce(payload: Record<string, unknown>) {
    const response = await fetch("/api/protools/stems", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    return (await response.json()) as StemBounceResponse;
  }

  const canOpenSession = Boolean(sessionPath.trim().length > 0);
  const canPrint = Boolean(
    songTitle.trim().length > 0 &&
      selectedParts.length > 0 &&
      outputDirectory.trim().length > 0 &&
      mixSourceName.trim().length > 0 &&
      selectedParts.every(
        (part) => (stemSources[part] ?? mixSourceName).trim().length > 0
      )
  );

  const filenamePreview = useMemo(
    () => selectedParts.map((part) => generateFilename(part)),
    [selectedParts, sampleRate, bpm, songTitle, fileType]
  );

  useEffect(() => {
    setStemSources((prev) => {
      const next = { ...prev };
      selectedParts.forEach((part) => {
        if (!next[part]) {
          next[part] = part;
        }
      });
      Object.keys(next).forEach((part) => {
        if (!selectedParts.includes(part)) {
          delete next[part];
        }
      });
      return next;
    });
  }, [selectedParts]);

  useEffect(() => {
    if (!sessionPath) return;
    if (!outputDirectory || outputDirectory === settings.stemsOutputPath) {
      const normalized = sessionPath.replace(/\\/g, "/");
      const sessionDir = normalized.slice(0, normalized.lastIndexOf("/"));
      if (sessionDir) {
        setOutputDirectory(`${sessionDir}/Stems`);
      }
    }
  }, [sessionPath, outputDirectory, settings.stemsOutputPath]);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Pro Tools Session</h2>
            <p className="text-xs text-muted-foreground">
              Choose a Pro Tools session and output folder for stem bounces.
            </p>
          </div>
          <Badge
            variant={status === "error" ? "destructive" : "secondary"}
            className={status === "ok" ? "bg-green-500/15 text-green-500" : ""}
          >
            {status === "idle" && "Idle"}
            {status === "loading" && "Working"}
            {status === "ok" && "Ready"}
            {status === "error" && "Error"}
          </Badge>
        </div>
        {message && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {message}
          </p>
        )}
        <Separator />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {supportsDialog ? (
            <PathPickerField
              id="stem-session-path"
              label="Session Path (.ptx)"
              value={sessionPath}
              placeholder="/Volumes/Studio/Sessions/Project/Song.ptx"
              description="Select the Pro Tools session to open."
              selectType="file"
              filters={[{ name: "Pro Tools Session", extensions: ["ptx"] }]}
              onChange={setSessionPath}
            />
          ) : (
            <WebFolderPicker
              id="stem-session-web"
              label="Session Folder (Browser)"
              description={
                webSessionFiles.length
                  ? `Selected ${webSessionFiles.length} file(s).`
                  : "Select the folder containing the .ptx file."
              }
              onFilesChange={(files) => {
                setWebSessionFiles(files);
                const sessionFile = files.find((file) =>
                  file.name.toLowerCase().endsWith(".ptx")
                );
                if (sessionFile) {
                  setWebSessionName(sessionFile.name);
                  setWebSessionMissing(false);
                } else {
                  setWebSessionName("");
                  setWebSessionMissing(files.length > 0);
                }
                if (sessionFile?.webkitRelativePath) {
                  const root = sessionFile.webkitRelativePath.split("/")[0];
                  setSessionPath(`${root}/${sessionFile.name}`);
                }
              }}
              showFilePreview
            />
          )}
          <PathPickerField
            id="stem-output-dir"
            label="Output Folder"
            value={outputDirectory}
            placeholder={settings.stemsOutputPath}
            description="Choose where bounced stems should land."
            selectType="directory"
            onChange={setOutputDirectory}
          />
        </div>
        {!supportsDialog && (
          <div className="text-[10px] text-muted-foreground">
            {webSessionName
              ? `Detected session: ${webSessionName}`
              : webSessionMissing
                ? "No .ptx file detected in that folder."
                : "Waiting for a folder selection."}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            className="gap-2"
            disabled={!canOpenSession}
            onClick={async () => {
              setStatus("loading");
              setMessage("");
              const result = await callStemBounce({
                action: "open",
                sessionPath,
              });
              if (result.ok) {
                setStatus("ok");
                setMessage("");
                setPrintLog((prev) => [
                  `Opened session: ${sessionPath}`,
                  ...prev,
                ]);
              } else {
                setStatus("error");
                setMessage(result.error || "Failed to open session.");
              }
            }}
          >
            <Play className="h-3.5 w-3.5" />
            Open in Pro Tools
          </Button>
          <p className="text-[10px] text-muted-foreground">
            Requires PROTOOLS_ALLOW_WRITES to include session permissions.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold">Song Information</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="song-title" className="text-xs">
              Song Title
            </Label>
            <Input
              id="song-title"
              value={songTitle}
              onChange={(e) => setSongTitle(e.target.value)}
              placeholder="Enter song title"
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="stem-rate" className="text-xs">
              Sample Rate
            </Label>
            <select
              id="stem-rate"
              value={sampleRate}
              onChange={(e) => setSampleRate(e.target.value)}
              className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
            >
              <option value="SRate_44100">44.1 kHz</option>
              <option value="SRate_48000">48 kHz</option>
              <option value="SRate_88200">88.2 kHz</option>
              <option value="SRate_96000">96 kHz</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="stem-bpm" className="text-xs">
              BPM
            </Label>
            <Input
              id="stem-bpm"
              value={bpm}
              onChange={(e) => setBpm(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold">Bounce Settings</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="stem-filetype" className="text-xs">
              File Type
            </Label>
            <select
              id="stem-filetype"
              value={fileType}
              onChange={(e) => setFileType(e.target.value)}
              className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
            >
              <option value="EMFType_WAV">WAV</option>
              <option value="EMFType_AIFF">AIFF</option>
              <option value="EMFType_MP3">MP3</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="stem-bit-depth" className="text-xs">
              Bit Depth
            </Label>
            <select
              id="stem-bit-depth"
              value={bitDepth}
              onChange={(e) => setBitDepth(e.target.value)}
              className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
            >
              <option value="BDepth_16">16-bit</option>
              <option value="BDepth_24">24-bit</option>
              <option value="BDepth_32Float">32-bit float</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="stem-export-format" className="text-xs">
              Export Format
            </Label>
            <select
              id="stem-export-format"
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
              className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
            >
              <option value="EFormat_Interleaved">Interleaved</option>
              <option value="EFormat_Mono">Mono</option>
              <option value="EFormat_MultipleMono">Multiple Mono</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="stem-mix-source-type" className="text-xs">
              Mix Source Type
            </Label>
            <select
              id="stem-mix-source-type"
              value={mixSourceType}
              onChange={(e) => setMixSourceType(e.target.value)}
              className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
            >
              <option value="EMSType_Output">Output</option>
              <option value="EMSType_Bus">Bus</option>
              <option value="EMSType_PhysicalOut">Physical Out</option>
              <option value="EMSType_Renderer">Renderer</option>
            </select>
          </div>
          <div className="space-y-1.5 lg:col-span-2">
            <Label htmlFor="stem-mix-source-name" className="text-xs">
              Default Mix Source Name
            </Label>
            <Input
              id="stem-mix-source-name"
              value={mixSourceName}
              onChange={(e) => setMixSourceName(e.target.value)}
              placeholder="Mix Bus"
              className="font-mono text-sm"
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Checkbox
            checked={offlineBounce}
            onCheckedChange={(value) => setOfflineBounce(Boolean(value))}
          />
          Offline bounce (faster than real time)
        </label>
        <p className="text-[10px] text-muted-foreground">
          Each stem uses the mix source name shown below. Default is the part
          name (ex: “Inst”).
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold">Stem Sources</h2>
          <p className="text-xs text-muted-foreground">
            Map each selected stem to a bus/output name inside the session.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {selectedParts.map((part) => (
            <div key={part} className="space-y-1.5">
              <Label htmlFor={`stem-source-${part}`} className="text-xs">
                {part}
              </Label>
              <Input
                id={`stem-source-${part}`}
                value={stemSources[part] ?? ""}
                onChange={(e) =>
                  setStemSources((prev) => ({
                    ...prev,
                    [part]: e.target.value,
                  }))
                }
                placeholder={part}
                className="font-mono text-sm"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold">Parts to Print</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {defaultParts.map((part) => (
            <label
              key={part}
              className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm transition-colors hover:border-primary/30 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
            >
              <Checkbox
                checked={selectedParts.includes(part)}
                onCheckedChange={() => togglePart(part)}
              />
              {part}
            </label>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">
            Filename Preview ({selectedParts.length} files)
          </h2>
          <Button
            size="sm"
            variant="outline"
            className="gap-2 text-xs"
            onClick={async () => {
              if (filenamePreview.length === 0) return;
              await navigator.clipboard.writeText(filenamePreview.join("\n"));
            }}
          >
            <Copy className="h-3 w-3" />
            Copy All
          </Button>
        </div>
        <div className="space-y-1.5 rounded-md bg-[#0a0a0f] p-3">
          {selectedParts.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Select at least one part to preview filenames
            </p>
          ) : (
            filenamePreview.map((fileName) => (
              <div
                key={fileName}
                className="flex items-center gap-2 text-xs font-mono"
              >
                <AudioLines className="h-3 w-3 text-primary shrink-0" />
                <span className="text-foreground">{fileName}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          disabled={!canPrint}
          className="gap-2"
          onClick={async () => {
            setStatus("loading");
            setMessage("");
            setPrintLog([]);
            const parts = selectedParts.map((part) => ({
              label: part,
              fileName: generateFilename(part),
              sourceName: stemSources[part] ?? mixSourceName,
            }));
            const result = await callStemBounce({
              action: "print",
              sessionPath,
              openSession: Boolean(sessionPath),
              outputDirectory,
              mixSource: {
                type: mixSourceType,
                name: mixSourceName,
              },
              audio: {
                fileType,
                sampleRate,
                bitDepth,
                exportFormat,
                deliveryFormat: "EMDFormat_SingleFile",
                offlineBounce,
              },
              parts,
            });
            if (result.ok) {
              setStatus("ok");
              setMessage("");
              const results = (result.result as {
                results?: Array<{ label: string; ok: boolean; error?: string }>;
              })?.results;
              if (results?.length) {
                setPrintLog(
                  results.map((item) =>
                    item.ok
                      ? `Printed ${item.label}`
                      : `Failed ${item.label}: ${item.error ?? "Unknown error"}`
                  )
                );
              } else {
                setPrintLog(["Stem printing completed."]);
              }
            } else {
              setStatus("error");
              setMessage(result.error || "Stem print failed.");
            }
          }}
        >
          <Printer className="h-3.5 w-3.5" />
          Print Stems ({selectedParts.length})
        </Button>
      </div>

      {printLog.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-3 text-sm font-semibold">
            <HardDrive className="h-4 w-4 text-muted-foreground" />
            Print Log
          </div>
          <div className="space-y-1 text-xs font-mono text-muted-foreground">
            {printLog.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
