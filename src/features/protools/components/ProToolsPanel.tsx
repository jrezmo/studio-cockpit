"use client";

import { useMemo, useState } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Separator } from "@/shared/ui/separator";
import { Badge } from "@/shared/ui/badge";
import { Checkbox } from "@/shared/ui/checkbox";
import { cn } from "@/shared/utils";
import { useStudioStore } from "@/state/store";

type ToolResponse = {
  ok: boolean;
  result?: unknown;
  error?: string;
  raw?: string;
};

async function callTool(name: string, args: Record<string, unknown>) {
  const response = await fetch("/api/protools", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tool: name, args }),
  });

  return (await response.json()) as ToolResponse;
}

async function createProject(payload: Record<string, unknown>) {
  const response = await fetch("/api/protools/project", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return (await response.json()) as ToolResponse;
}

export function ProToolsPanel() {
  const setLastProToolsSessionCreated = useStudioStore(
    (s) => s.setLastProToolsSessionCreated
  );
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "ok">(
    "idle"
  );
  const [message, setMessage] = useState<string>("");
  const [sessionInfo, setSessionInfo] = useState<string | null>(null);
  const [trackList, setTrackList] = useState<string | null>(null);
  const [markers, setMarkers] = useState<string | null>(null);
  const [markerName, setMarkerName] = useState("Session Stats Test");
  const [markerTime, setMarkerTime] = useState("00:00:01:00");
  const [projectName, setProjectName] = useState("New Session");
  const [projectLocation, setProjectLocation] = useState(
    "/Users/rezmo/Documents/Pro Tools"
  );
  const [projectSampleRate, setProjectSampleRate] = useState("SRate_48000");
  const [projectBitDepth, setProjectBitDepth] = useState("BDepth_24");
  const [projectFileType, setProjectFileType] = useState("FType_WAVE");
  const [projectIoSettings, setProjectIoSettings] = useState("IOSettings_Last");
  const [projectInterleaved, setProjectInterleaved] = useState(true);
  const [trackType, setTrackType] = useState("TType_Audio");
  const [trackFormat, setTrackFormat] = useState("TFormat_Stereo");
  const [trackTimebase, setTrackTimebase] = useState("TTimebase_Samples");
  const [trackNames, setTrackNames] = useState("Lead Vocal\nGuitar\nBass\nDrums");
  const [projectResult, setProjectResult] = useState<string | null>(null);
  const [confirmProject, setConfirmProject] = useState(false);

  const parsedTrackNames = useMemo(
    () =>
      trackNames
        .split("\n")
        .map((name) => name.trim())
        .filter(Boolean),
    [trackNames]
  );

  function extractText(result: ToolResponse) {
    if (!result?.result || typeof result.result !== "object") {
      return JSON.stringify(result.result, null, 2);
    }

    const content = (result.result as { content?: Array<{ type: string; text?: string }> }).content;
    if (Array.isArray(content)) {
      return content
        .map((item) => (item.type === "text" ? item.text ?? "" : ""))
        .filter(Boolean)
        .join("\n");
    }

    return JSON.stringify(result.result, null, 2);
  }

  function setStateFromResult(result: ToolResponse) {
    if (result.ok) {
      setStatus("ok");
      setMessage("");
      return;
    }
    setStatus("error");
    setMessage(result.error || "Request failed");
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Pro Tools MCP</h2>
            <p className="text-xs text-muted-foreground font-mono">
              Uses the MCP server to call PTSL commands
            </p>
          </div>
          <Badge
            variant={status === "error" ? "destructive" : "secondary"}
            className={cn("text-[10px]", status === "ok" && "bg-green-500/15 text-green-400")}
          >
            {status === "idle" && "Idle"}
            {status === "loading" && "Working"}
            {status === "ok" && "Connected"}
            {status === "error" && "Error"}
          </Badge>
        </div>
        {message && (
          <p className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {message}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-5 space-y-4">
          <h3 className="text-sm font-semibold">Session</h3>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={async () => {
                setStatus("loading");
                const result = await callTool("get_session_info", {});
                setSessionInfo(extractText(result));
                setStateFromResult(result);
              }}
            >
              Get Session Info
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={async () => {
                setStatus("loading");
                const result = await callTool("get_track_list", {});
                setTrackList(extractText(result));
                setStateFromResult(result);
              }}
            >
              List Tracks
            </Button>
          </div>

          {sessionInfo && (
            <div className="rounded-md bg-secondary/40 p-3 text-xs font-mono">
              <pre className="whitespace-pre-wrap break-words">
                {sessionInfo}
              </pre>
            </div>
          )}

          {trackList && (
            <div className="rounded-md bg-secondary/40 p-3 text-xs font-mono">
              <pre className="whitespace-pre-wrap break-words">
                {trackList}
              </pre>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card p-5 space-y-4">
          <h3 className="text-sm font-semibold">Markers</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="marker-name" className="text-xs">
                Marker Name
              </Label>
              <Input
                id="marker-name"
                value={markerName}
                onChange={(e) => setMarkerName(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="marker-time" className="text-xs">
                Marker Time
              </Label>
              <Input
                id="marker-time"
                value={markerTime}
                onChange={(e) => setMarkerTime(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={async () => {
                setStatus("loading");
                const result = await callTool("create_marker", {
                  name: markerName,
                  start_time: markerTime,
                });
                setStateFromResult(result);
              }}
            >
              Create Marker
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={async () => {
                setStatus("loading");
                const result = await callTool("get_markers", {});
                setMarkers(extractText(result));
                setStateFromResult(result);
              }}
            >
              Get Markers
            </Button>
          </div>

          {markers && (
            <div className="rounded-md bg-secondary/40 p-3 text-xs font-mono">
              <pre className="whitespace-pre-wrap break-words">
                {markers}
              </pre>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">New Project</h3>
            <p className="text-xs text-muted-foreground">
              Creates a new Pro Tools session and optionally adds tracks.
            </p>
          </div>
          <Badge variant="secondary" className="text-[10px]">
            Requires session + track_structure
          </Badge>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="project-name" className="text-xs">
                Session Name
              </Label>
              <Input
                id="project-name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="project-location" className="text-xs">
                Session Location
              </Label>
              <Input
                id="project-location"
                value={projectLocation}
                onChange={(e) => setProjectLocation(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="project-sample-rate" className="text-xs">
                  Sample Rate
                </Label>
                <select
                  id="project-sample-rate"
                  value={projectSampleRate}
                  onChange={(e) => setProjectSampleRate(e.target.value)}
                  className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
                >
                  <option value="SRate_44100">44.1 kHz</option>
                  <option value="SRate_48000">48 kHz</option>
                  <option value="SRate_88200">88.2 kHz</option>
                  <option value="SRate_96000">96 kHz</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="project-bit-depth" className="text-xs">
                  Bit Depth
                </Label>
                <select
                  id="project-bit-depth"
                  value={projectBitDepth}
                  onChange={(e) => setProjectBitDepth(e.target.value)}
                  className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
                >
                  <option value="BDepth_16">16-bit</option>
                  <option value="BDepth_24">24-bit</option>
                  <option value="BDepth_32Float">32-bit float</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="project-file-type" className="text-xs">
                  File Type
                </Label>
                <select
                  id="project-file-type"
                  value={projectFileType}
                  onChange={(e) => setProjectFileType(e.target.value)}
                  className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
                >
                  <option value="FType_WAVE">WAV</option>
                  <option value="FType_AIFF">AIFF</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="project-io-settings" className="text-xs">
                  I/O Settings
                </Label>
                <select
                  id="project-io-settings"
                  value={projectIoSettings}
                  onChange={(e) => setProjectIoSettings(e.target.value)}
                  className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
                >
                  <option value="IOSettings_Last">Last Used</option>
                  <option value="IOSettings_StereoMix">Stereo Mix</option>
                </select>
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Checkbox
                checked={projectInterleaved}
                onCheckedChange={(value) => setProjectInterleaved(Boolean(value))}
              />
              Create interleaved session
            </label>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="track-names" className="text-xs">
                Track Names (one per line)
              </Label>
              <textarea
                id="track-names"
                value={trackNames}
                onChange={(e) => setTrackNames(e.target.value)}
                className="min-h-[140px] w-full rounded-md border border-border bg-background p-3 text-sm text-foreground font-mono"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="track-type" className="text-xs">
                  Track Type
                </Label>
                <select
                  id="track-type"
                  value={trackType}
                  onChange={(e) => setTrackType(e.target.value)}
                  className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
                >
                  <option value="TType_Audio">Audio</option>
                  <option value="TType_Aux">Aux</option>
                  <option value="TType_Midi">MIDI</option>
                  <option value="TType_Instrument">Instrument</option>
                  <option value="TType_Vca">VCA</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="track-format" className="text-xs">
                  Track Format
                </Label>
                <select
                  id="track-format"
                  value={trackFormat}
                  onChange={(e) => setTrackFormat(e.target.value)}
                  className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
                >
                  <option value="TFormat_Mono">Mono</option>
                  <option value="TFormat_Stereo">Stereo</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="track-timebase" className="text-xs">
                Track Timebase
              </Label>
              <select
                id="track-timebase"
                value={trackTimebase}
                onChange={(e) => setTrackTimebase(e.target.value)}
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
              >
                <option value="TTimebase_Samples">Samples</option>
                <option value="TTimebase_Ticks">Ticks</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Checkbox
                checked={confirmProject}
                onCheckedChange={(value) => setConfirmProject(Boolean(value))}
              />
              I understand this will create a new session and may close the current one.
            </label>
            <Button
              size="sm"
              disabled={!confirmProject || !projectName || !projectLocation}
              onClick={async () => {
                setStatus("loading");
                const result = await createProject({
                  session: {
                    name: projectName,
                    location: projectLocation,
                    fileType: projectFileType,
                    sampleRate: projectSampleRate,
                    bitDepth: projectBitDepth,
                    ioSettings: projectIoSettings,
                    interleaved: projectInterleaved,
                  },
                  tracks: {
                    names: parsedTrackNames,
                    type: trackType,
                    format: trackFormat,
                    timebase: trackTimebase,
                  },
                });
                setProjectResult(extractText(result));
                setStateFromResult(result);
                if (result.ok) {
                  setLastProToolsSessionCreated({
                    name: projectName,
                    location: projectLocation,
                    fileType: projectFileType,
                    sampleRate: projectSampleRate,
                    bitDepth: projectBitDepth,
                    ioSettings: projectIoSettings,
                    interleaved: projectInterleaved,
                    createdAt: new Date().toISOString(),
                  });
                }
              }}
            >
              Create Project ({parsedTrackNames.length} tracks)
            </Button>
          </div>
        </div>

        {projectResult && (
          <div className="rounded-md bg-secondary/40 p-3 text-xs font-mono">
            <pre className="whitespace-pre-wrap break-words">
              {projectResult}
            </pre>
          </div>
        )}
      </div>

      <Separator />
      <p className="text-xs text-muted-foreground">
        Pro Tools must be running. The MCP server is invoked per request via the
        local Node runtime.
      </p>
    </div>
  );
}
