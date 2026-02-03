"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { AudioLines, Copy, Printer } from "lucide-react";

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
  const [songTitle, setSongTitle] = useState("");
  const [selectedParts, setSelectedParts] = useState<string[]>(
    defaultParts.slice(0, 6)
  );
  const [sampleRate, setSampleRate] = useState("48000");
  const [bpm, setBpm] = useState("124");

  function togglePart(part: string) {
    setSelectedParts((prev) =>
      prev.includes(part) ? prev.filter((p) => p !== part) : [...prev, part]
    );
  }

  const sanitized = songTitle.replace(/\s+/g, "").replace(/[^a-zA-Z0-9]/g, "");

  function generateFilename(part: string) {
    const partClean = part.replace(/\s+/g, "");
    const parsedRate = Number.parseInt(sampleRate, 10);
    const rateKhz = Number.isFinite(parsedRate)
      ? parsedRate % 1000 === 0
        ? `${parsedRate / 1000}k`
        : `${(parsedRate / 1000).toFixed(1)}k`
      : "Rate";
    return `${sanitized || "SongTitle"}_${partClean}_${rateKhz}_${bpm || "BPM"}.wav`;
  }

  return (
    <div className="space-y-6">
      {/* Song info */}
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
            <Input
              id="stem-rate"
              value={sampleRate}
              onChange={(e) => setSampleRate(e.target.value)}
              className="font-mono text-sm"
            />
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

      {/* Parts checklist */}
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

      {/* Filename preview */}
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">
            Filename Preview ({selectedParts.length} files)
          </h2>
          <Button size="sm" variant="outline" className="gap-2 text-xs">
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
            selectedParts.map((part) => (
              <div
                key={part}
                className="flex items-center gap-2 text-xs font-mono"
              >
                <AudioLines className="h-3 w-3 text-primary shrink-0" />
                <span className="text-foreground">{generateFilename(part)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Action */}
      <div className="flex justify-end">
        <Button
          disabled={!songTitle || selectedParts.length === 0}
          className="gap-2"
        >
          <Printer className="h-3.5 w-3.5" />
          Print Stems ({selectedParts.length})
        </Button>
      </div>
    </div>
  );
}
