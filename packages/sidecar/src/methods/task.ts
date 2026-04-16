import { z } from 'zod';
import {
  TaskMarkdownRepository,
  createTask,
  updateTask,
  updateTaskStatus,
  canTransition,
  TaskStatusSchema,
} from '@neon-tiger/core';
import type { MethodRegistry } from './index.js';

// --- Zod param schemas ---

const TaskListParamsSchema = z.object({}).strict();

const TaskGetParamsSchema = z.object({
  id: z.string().min(1),
}).strict();

const TaskCreateParamsSchema = z.object({
  title: z.string().min(1),
  status: TaskStatusSchema.optional(),
}).strict();

const TaskMoveParamsSchema = z.object({
  id: z.string().min(1),
  status: TaskStatusSchema,
}).strict();

const TaskUpdateParamsSchema = z.object({
  id: z.string().min(1),
  title: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).strict();

function validate<S extends { safeParse: (input: unknown) => { success: true; data: unknown } | { success: false; error: z.ZodError } }>(
  schema: S,
  params: unknown,
  method: string,
): S extends { safeParse: (input: unknown) => { success: true; data: infer T } | { success: false; error: z.ZodError } } ? T : never {
  const result = schema.safeParse(params);
  if (!result.success) {
    const err = new Error(`Invalid params for ${method}: ${result.error.issues.map((i) => i.message).join(', ')}`);
    (err as unknown as Record<string, unknown>).code = -32602;
    throw err;
  }
  return result.data as S extends { safeParse: (input: unknown) => { success: true; data: infer T } | { success: false; error: z.ZodError } } ? T : never;
}

export function createTaskMethods(rootDir: string): MethodRegistry {
  const repo = new TaskMarkdownRepository(rootDir);

  return {
    'task.list': async (params) => {
      validate(TaskListParamsSchema, params, 'task.list');
      return repo.loadTasks();
    },

    'task.get': async (params) => {
      const { id } = validate(TaskGetParamsSchema, params, 'task.get');
      const task = await repo.loadTaskById(id);
      if (!task) {
        throw new Error(`Task not found: ${id}`);
      }
      return task;
    },

    'task.create': async (params) => {
      const { title, status } = validate(TaskCreateParamsSchema, params, 'task.create');
      return createTask(repo, { title, status: status ?? 'planned' });
    },

    'task.move': async (params) => {
      const { id, status } = validate(TaskMoveParamsSchema, params, 'task.move');
      const task = await repo.loadTaskById(id);
      if (!task) {
        throw new Error(`Task not found: ${id}`);
      }
      const result = canTransition(task.status, status);
      if (!result.ok) {
        throw new Error(result.reason ?? `Cannot transition ${task.status} → ${status}`);
      }
      return updateTaskStatus(repo, id, { from: task.status, to: status });
    },

    'task.update': async (params) => {
      const { id, ...patch } = validate(TaskUpdateParamsSchema, params, 'task.update');
      return updateTask(repo, id, patch);
    },
  };
}
