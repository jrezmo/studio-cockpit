#!/usr/bin/env ts-node

import { readFileSync, statSync } from "fs";
import { XMLParser } from "fast-xml-parser";
import { createHash } from "crypto";
import type {
  SessionStatsSession,
  SessionStatsTrack,
  SessionStatsPluginInstance,
  SessionStatsPluginUsage,
} from "@/lib/types/session-stats";

const getFileFingerprint = (filePath: string): string => {
  const fileBuffer = readFileSync(filePath);
  const hashSum = createHash("sha256");
  hashSum.update(fileBuffer);
  return hashSum.digest("hex");
};

const extractSessionInfo = (filePath: string): SessionStatsSession => {
  const xmlData = readFileSync(filePath, "utf-8");
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });
  const sessionData = parser.parse(xmlData);

  // NOTE: This is a simplified parser based on common .ptx file structure.
  // It may need to be adjusted for different Pro Tools versions or session complexity.

  const main = sessionData["PRO_TOOLS_SESSION"];

  const tracks: SessionStatsTrack[] = (main["TRACK"] || []).map((track: any) => {
    const plugins: SessionStatsPluginInstance[] = (track["PLUGIN_LIST"]?.["PLUGIN"] || []).map((plugin: any) => ({
      pluginId: plugin["@_PLUGIN_ID"],
      name: plugin["@_PLUGIN_NAME"],
      vendor: plugin["@_VENDOR_NAME"],
      version: plugin["@_VERSION"],
      slot: plugin["@_SLOT"],
      active: plugin["@_ACTIVE"] === "Yes",
    }));

    return {
      id: track["@_TRACK_ID"],
      name: track["NAME"],
      type: track["@_TRACK_TYPE"],
      plugins,
    };
  });
  
  const allPlugins: SessionStatsPluginInstance[] = tracks.flatMap(t => t.plugins || []);

  const pluginUsage: SessionStatsPluginUsage[] = Object.values(allPlugins.reduce((acc, plugin) => {
      if (!plugin.pluginId) return acc;
      if (!acc[plugin.pluginId]) {
          acc[plugin.pluginId] = {
              pluginId: plugin.pluginId,
              name: plugin.name,
              vendor: plugin.vendor,
              version: plugin.version,
              format: plugin.format,
              count: 0,
              trackCount: 0
          };
      }
      acc[plugin.pluginId].count++;
      return acc;
  }, {} as Record<string, SessionStatsPluginUsage>));

  const stats = statSync(filePath);

  return {
    id: createHash("md5").update(filePath).digest("hex"),
    fingerprint: getFileFingerprint(filePath),
    name: main["@_SESSION_NAME"],
    path: filePath,
    sampleRate: Number(main["@_SAMPLE_RATE"]),
    bitDepth: Number(main["@_BIT_DEPTH"]),
    bpm: Number(main["master_Tempo"]?.["@_BPM"]),
    tracks,
    plugins: pluginUsage,
    createdAt: stats.birthtime.toISOString(),
    updatedAt: stats.mtime.toISOString(),
    sources: [{
      type: 'protools',
      path: filePath,
      ingestedAt: new Date().toISOString(),
      extractor: 'scripts/extract-session-info.ts'
    }]
  };
};

const main = () => {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: ts-node scripts/extract-session-info.ts <path-to-ptx-file>");
    process.exit(1);
  }

  try {
    const sessionInfo = extractSessionInfo(filePath);
    console.log(JSON.stringify(sessionInfo, null, 2));
  } catch (error) {
    console.error(`Error extracting session info from ${filePath}:`, error);
    process.exit(1);
  }
};

main();
