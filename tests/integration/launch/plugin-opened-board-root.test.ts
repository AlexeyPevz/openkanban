import { describe, it, expect, vi } from 'vitest';
import { makeOpenBoardHandler, type OpenBoardDeps } from '../../../packages/plugin/src/tools/open-board.js';
import { resolveInitialProjectRoot } from '@openkanban/sidecar';

describe('plugin-opened board uses correct project root', () => {
  it('propagates OpenCode directory into sidecar initial root resolution', async () => {
    let capturedArgs: string[] | null = null;

    const deps: OpenBoardDeps = {
      directory: '/project-from-opencode',
      isLockActive: vi.fn().mockResolvedValue(false),
      resolveBinary: vi.fn().mockResolvedValue('/usr/bin/openkanban-desktop'),
      spawnDetached: vi.fn((_binary: string, args: string[]) => {
        capturedArgs = args;
      }),
    };

    const handler = makeOpenBoardHandler(deps);
    await handler();

    expect(capturedArgs).toEqual(['--directory', '/project-from-opencode']);

    const resolved = resolveInitialProjectRoot({
      env: { OPENKANBAN_PROJECT_DIR: capturedArgs![1] },
      cwd: '/different-cwd',
    });

    expect(resolved).toBe('/project-from-opencode');
  });
});
