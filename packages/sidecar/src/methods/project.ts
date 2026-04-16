import { existsSync, statSync } from 'node:fs';
import { z } from 'zod';
import type { MethodRegistry } from './index.js';
import type { ProjectRuntime } from '../runtime.js';

const ProjectCurrentParamsSchema = z.object({}).strict();

const ProjectRebindParamsSchema = z.object({
  directory: z.string().min(1),
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

function defaultValidateRoot(directory: string): void {
  if (!existsSync(directory)) {
    throw new Error(`Project root does not exist: ${directory}`);
  }
  if (!statSync(directory).isDirectory()) {
    throw new Error(`Project root is not a directory: ${directory}`);
  }
}

export interface CreateProjectMethodsDeps {
  restartWatcher: (directory: string) => Promise<void>;
  validateRoot?: (directory: string) => void;
}

export function createProjectMethods(
  runtime: ProjectRuntime,
  deps: CreateProjectMethodsDeps,
): MethodRegistry {
  const validateRoot = deps.validateRoot ?? defaultValidateRoot;

  return {
    'project.current': async (params) => {
      validate(ProjectCurrentParamsSchema, params, 'project.current');
      return { directory: runtime.current };
    },

    'project.rebind': async (params) => {
      const { directory } = validate(ProjectRebindParamsSchema, params, 'project.rebind');

      if (directory === runtime.current) {
        return { directory, rebound: false };
      }

      validateRoot(directory);
      await deps.restartWatcher(directory);
      runtime.current = directory;

      return { directory, rebound: true };
    },
  };
}
