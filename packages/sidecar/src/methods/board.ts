import { loadBoardWithDiagnostics } from '@openkanban/core';
import type { MethodRegistry } from './index.js';
import type { ProjectRootInput } from '../runtime.js';
import { getProjectRoot } from '../runtime.js';

export function createBoardMethods(root: ProjectRootInput): MethodRegistry {
  return {
    'board.load': async () => {
      return loadBoardWithDiagnostics(getProjectRoot(root));
    },
  };
}
