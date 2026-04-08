import { z } from 'zod';

export const ResourceKindSchema = z.enum(['agent', 'skill', 'mcp', 'tool']);

export const ResourceRecordSchema = z.object({
  kind: ResourceKindSchema,
  name: z.string().min(1),
  description: z.string().optional(),
  available: z.boolean(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export const ResourceAssignmentSchema = z.object({
  kind: ResourceKindSchema,
  name: z.string().min(1),
  required: z.boolean().default(true),
});
