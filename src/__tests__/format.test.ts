import { formatBytes, formatSampleRate } from "@/lib/format";

describe("formatBytes", () => {
  it("formats zero bytes", () => {
    expect(formatBytes(0)).toBe("0 B");
  });

  it("formats kilobytes", () => {
    expect(formatBytes(1024)).toBe("1.0 KB");
  });
});

describe("formatSampleRate", () => {
  it("formats whole kHz", () => {
    expect(formatSampleRate(48000)).toBe("48 kHz");
  });

  it("formats decimal kHz", () => {
    expect(formatSampleRate(44100)).toBe("44.1 kHz");
  });
});
