import { z } from "zod";

export const taskStatusSchema = z.enum([
  "todo",
  "in-progress",
  "blocked",
  "done",
]);

export const taskPayloadSchema = z.object({
  clientId: z.string().min(1),
  projectId: z.string().min(1).optional(),
  title: z.string().min(1).max(200),
  status: taskStatusSchema.default("todo"),
  dueAt: z.string().min(1).optional(),
  assignee: z.string().min(1).max(120).optional(),
});
