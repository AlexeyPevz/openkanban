import {
  TaskMarkdownRepository,
  createTask,
  updateTask,
  updateTaskStatus,
  canTransition,
} from '@neon-tiger/core';
import type { TaskStatus } from '@neon-tiger/core';
import type { MethodRegistry } from './index.js';

export function createTaskMethods(rootDir: string): MethodRegistry {
  const repo = new TaskMarkdownRepository(rootDir);

  return {
    'task.list': async () => {
      return repo.loadTasks();
    },

    'task.get': async (params) => {
      const { id } = params as { id: string };
      const task = await repo.loadTaskById(id);
      if (!task) {
        throw new Error(`Task not found: ${id}`);
      }
      return task;
    },

    'task.create': async (params) => {
      const { title, status } = params as { title: string; status?: TaskStatus };
      return createTask(repo, { title, status: status ?? 'planned' });
    },

    'task.move': async (params) => {
      const { id, status } = params as { id: string; status: TaskStatus };
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
      const { id, ...patch } = params as { id: string; title?: string; metadata?: Record<string, unknown> };
      return updateTask(repo, id, patch);
    },
  };
}
