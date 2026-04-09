import { loadBoardWithDiagnostics } from '@openkanban/core';
import type { MethodRegistry } from './index.js';

export function createBoardMethods(rootDir: string): MethodRegistry {
  return {
    'board.load': async () => {
      return loadBoardWithDiagnostics(rootDir);
    },
  };
}
