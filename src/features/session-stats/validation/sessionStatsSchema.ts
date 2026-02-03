import { z } from "zod";

export const sessionStatsPluginInstanceSchema = z.object({
  pluginId: z.string().min(1).optional(),
  name: z.string().min(1),
  vendor: z.string().min(1).optional(),
  version: z.string().min(1).optional(),
  format: z.string().min(1).optional(),
  slot: z.string().min(1).optional(),
  preset: z.string().min(1).optional(),
  active: z.boolean().optional(),
});

export const sessionStatsTrackSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.string().min(1).optional(),
  format: z.string().min(1).optional(),
  plugins: z.array(sessionStatsPluginInstanceSchema).default([]),
  notes: z.string().min(1).max(5000).optional(),
});

export const sessionStatsPluginUsageSchema = z.object({
  pluginId: z.string().min(1),
  name: z.string().min(1),
  vendor: z.string().min(1).optional(),
  version: z.string().min(1).optional(),
  format: z.string().min(1).optional(),
  count: z.coerce.number().int().nonnegative(),
  trackCount: z.coerce.number().int().nonnegative(),
});

export const sessionStatsSourceSchema = z.object({
  type: z.enum(["protools", "archive", "manual", "import"]),
  path: z.string().min(1).optional(),
  ingestedAt: z.string().min(1).optional(),
  extractor: z.string().min(1).optional(),
});

export const sessionStatsSessionSchema = z.object({
  id: z.string().min(1),
  fingerprint: z.string().min(1),
  name: z.string().min(1),
  artist: z.string().min(1).optional(),
  project: z.string().min(1).optional(),
  path: z.string().min(1).optional(),
  createdAt: z.string().min(1).optional(),
  updatedAt: z.string().min(1).optional(),
  sampleRate: z.coerce.number().int().positive().optional(),
  bitDepth: z.coerce.number().int().positive().optional(),
  bpm: z.coerce.number().positive().optional(),
  key: z.string().min(1).optional(),
  durationSeconds: z.coerce.number().int().nonnegative().optional(),
  notes: z.string().min(1).max(5000).optional(),
  tags: z.array(z.string().min(1).max(48)).default([]),
  tracks: z.array(sessionStatsTrackSchema).default([]),
  plugins: z.array(sessionStatsPluginUsageSchema).default([]),
  sources: z.array(sessionStatsSourceSchema).optional(),
});

export const sessionStatsIngestPayloadSchema = z.union([
  sessionStatsSessionSchema,
  z.array(sessionStatsSessionSchema),
  z.object({ sessions: z.array(sessionStatsSessionSchema) }),
]);

export const sessionStatsActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("ingestSessions"), payload: sessionStatsIngestPayloadSchema }),
  z.object({ action: z.literal("replaceSessions"), payload: z.array(sessionStatsSessionSchema) }),
]);
