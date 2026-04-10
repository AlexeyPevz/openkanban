import { z } from 'zod';
import { createResourceRegistry, ResourceKindSchema, TaskMarkdownRepository, updateTask } from '@openkanban/core';
import type { ResourceRecord } from '@openkanban/core';
import { discoverResources } from '../discovery/discover-resources.js';
import type { MethodRegistry } from './index.js';

// --- Zod param schemas ---

const ResourcesListParamsSchema = z.object({
  kind: ResourceKindSchema.optional(),
}).strict();

const ResourcesAssignParamsSchema = z.object({
  taskId: z.string().min(1),
  kind: ResourceKindSchema,
  name: z.string().min(1),
}).strict();

function validate<T>(schema: z.ZodType<T>, params: unknown, method: string): T {
  const result = schema.safeParse(params);
  if (!result.success) {
    const err = new Error(`Invalid params for ${method}: ${result.error.issues.map((i) => i.message).join(', ')}`);
    (err as unknown as Record<string, unknown>).code = -32602;
    throw err;
  }
  return result.data;
}

export function createResourceMethods(projectDir: string): MethodRegistry {
  let records: ResourceRecord[] = [];
  const repo = new TaskMarkdownRepository(projectDir);

  return {
    'resources.discover': async () => {
      const discovered = discoverResources(projectDir);
      records = discovered;
      return discovered;
    },

    'resources.list': async (params) => {
      const { kind } = validate(ResourcesListParamsSchema, params, 'resources.list');
      const registry = createResourceRegistry(records);
      if (kind) {
        return registry.byKind(kind);
      }
      return registry.all();
    },

    'resources.assign': async (params) => {
      const { taskId, kind, name } = validate(ResourcesAssignParamsSchema, params, 'resources.assign');

      const task = await repo.loadTaskById(taskId);
      if (!task) {
        throw new Error(`Task not found: ${taskId}`);
      }

      const nextResources = [...(task.resources ?? [])];
      const existingResource = nextResources.find((resource) => resource.kind === kind && resource.name === name);

      if (existingResource) {
        existingResource.required = true;
      } else {
        nextResources.push({ kind, name, required: true });
      }

      await updateTask(repo, taskId, { resources: nextResources });

      const existing = records.find((r) => r.kind === kind && r.name === name);
      if (existing) {
        existing.available = true;
      } else {
        records.push({ kind, name, available: true });
      }
      return { ok: true, taskId, kind, name };
    },

    'resources.unassign': async (params) => {
      const { taskId, kind, name } = validate(ResourcesAssignParamsSchema, params, 'resources.unassign');

      const task = await repo.loadTaskById(taskId);
      if (!task) {
        throw new Error(`Task not found: ${taskId}`);
      }

      const nextResources = (task.resources ?? []).filter((resource) => !(resource.kind === kind && resource.name === name));
      await updateTask(repo, taskId, { resources: nextResources });

      const existing = records.find((r) => r.kind === kind && r.name === name);
      if (existing) {
        existing.available = false;
      }
      return { ok: true, taskId, kind, name };
    },
  };
}
