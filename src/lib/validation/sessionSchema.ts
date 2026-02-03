import { z } from "zod";

export const sessionTypeSchema = z.enum([
  "mixing",
  "recording",
  "editing",
  "production",
  "mastering",
]);

export const sessionPayloadSchema = z.object({
  clientId: z.string().min(1),
  projectId: z.string().min(1).optional(),
  type: sessionTypeSchema,
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  durationMinutes: z.coerce.number().int().positive(),
  billableRate: z.coerce.number().nonnegative().optional(),
  notes: z.string().max(5000).optional(),
});
