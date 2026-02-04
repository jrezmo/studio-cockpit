import { open } from "fs/promises";

type AudioHeaderInfo = {
  channels?: number;
};

function readFourCC(buffer: Buffer, offset: number) {
  return buffer.toString("ascii", offset, offset + 4);
}

async function readBuffer(
  fileHandle: Awaited<ReturnType<typeof open>>,
  length: number,
  position: number
) {
  const buffer = Buffer.alloc(length);
  const { bytesRead } = await fileHandle.read(buffer, 0, length, position);
  return buffer.subarray(0, bytesRead);
}

async function parseWav(filePath: string): Promise<AudioHeaderInfo | null> {
  const fileHandle = await open(filePath, "r");
  try {
    const header = await readBuffer(fileHandle, 12, 0);
    if (header.length < 12) return null;
    if (readFourCC(header, 0) !== "RIFF" || readFourCC(header, 8) !== "WAVE") {
      return null;
    }

    let offset = 12;
    // Scan chunks for "fmt "
    while (true) {
      const chunkHeader = await readBuffer(fileHandle, 8, offset);
      if (chunkHeader.length < 8) break;
      const chunkId = readFourCC(chunkHeader, 0);
      const chunkSize = chunkHeader.readUInt32LE(4);
      if (chunkId === "fmt ") {
        const fmt = await readBuffer(fileHandle, 4, offset + 8);
        if (fmt.length < 4) return null;
        const channels = fmt.readUInt16LE(2);
        return { channels };
      }
      offset += 8 + chunkSize + (chunkSize % 2);
    }

    return null;
  } finally {
    await fileHandle.close();
  }
}

async function parseAiff(filePath: string): Promise<AudioHeaderInfo | null> {
  const fileHandle = await open(filePath, "r");
  try {
    const header = await readBuffer(fileHandle, 12, 0);
    if (header.length < 12) return null;
    if (readFourCC(header, 0) !== "FORM") return null;
    const formType = readFourCC(header, 8);
    if (formType !== "AIFF" && formType !== "AIFC") return null;

    let offset = 12;
    while (true) {
      const chunkHeader = await readBuffer(fileHandle, 8, offset);
      if (chunkHeader.length < 8) break;
      const chunkId = readFourCC(chunkHeader, 0);
      const chunkSize = chunkHeader.readUInt32BE(4);
      if (chunkId === "COMM") {
        const comm = await readBuffer(fileHandle, 2, offset + 8);
        if (comm.length < 2) return null;
        const channels = comm.readUInt16BE(0);
        return { channels };
      }
      offset += 8 + chunkSize + (chunkSize % 2);
    }

    return null;
  } finally {
    await fileHandle.close();
  }
}

export async function getAudioChannelCount(filePath: string) {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".wav")) {
    const info = await parseWav(filePath);
    return info?.channels;
  }
  if (lower.endsWith(".aif") || lower.endsWith(".aiff") || lower.endsWith(".aifc")) {
    const info = await parseAiff(filePath);
    return info?.channels;
  }
  return undefined;
}

export function mapChannelsToTrackFormat(
  channels: number | undefined,
  fallback: string
) {
  if (!channels) return fallback;
  if (channels === 1) return "TFormat_Mono";
  if (channels === 2) return "TFormat_Stereo";
  if (channels === 4) return "TFormat_Quad";
  if (channels === 6) return "TFormat_5_1";
  return fallback;
}
