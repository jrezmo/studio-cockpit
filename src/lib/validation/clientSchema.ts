import { z } from "zod";

export const clientStatusSchema = z.enum(["active", "at-risk", "inactive"]);
export const projectStatusSchema = z.enum([
  "active",
  "mixing",
  "review",
  "delivered",
]);
export const correspondenceChannelSchema = z.enum([
  "email",
  "sms",
  "call",
  "note",
]);
export const correspondenceDirectionSchema = z.enum(["inbound", "outbound"]);

export const clientPayloadSchema = z.object({
  name: z.string().min(1).max(120),
  status: clientStatusSchema.default("active"),
  primaryContact: z.string().min(1).max(120),
  email: z.string().email().max(254),
  phone: z.string().min(3).max(40).optional(),
  ratePerHour: z.coerce.number().nonnegative(),
  tags: z.array(z.string().min(1).max(48)).default([]),
  lastContactAt: z.string().min(1),
  nextSessionAt: z.string().min(1).optional(),
  notes: z.string().max(5000).optional(),
});

export const projectPayloadSchema = z.object({
  clientId: z.string().min(1),
  name: z.string().min(1).max(160),
  status: projectStatusSchema.default("active"),
  protoolsProjectId: z.string().max(200).optional(),
  dueDate: z.string().min(1).optional(),
  lastSessionAt: z.string().min(1).optional(),
  totalLoggedMinutes: z.coerce.number().int().nonnegative().default(0),
});

export const correspondencePayloadSchema = z.object({
  clientId: z.string().min(1),
  channel: correspondenceChannelSchema,
  direction: correspondenceDirectionSchema,
  subject: z.string().min(1).max(200),
  summary: z.string().min(1).max(2000),
  occurredAt: z.string().min(1),
  participants: z.array(z.string().min(1).max(120)).default([]),
});

// Update schemas (require id)
export const updateClientSchema = clientPayloadSchema.extend({
  id: z.string().min(1),
});

export const updateProjectSchema = projectPayloadSchema.extend({
  id: z.string().min(1),
});

export const updateCorrespondenceSchema = correspondencePayloadSchema.extend({
  id: z.string().min(1),
});

// Delete schema (just id)
export const deleteByIdSchema = z.object({
  id: z.string().min(1),
});
