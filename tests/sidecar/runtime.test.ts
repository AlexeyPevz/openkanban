import { describe, it, expect } from 'vitest';
import { resolveInitialProjectRoot } from '@openkanban/sidecar';

describe('resolveInitialProjectRoot', () => {
  it('prefers OPENKANBAN_PROJECT_DIR over cwd', () => {
    const resolved = resolveInitialProjectRoot({
      env: { OPENKANBAN_PROJECT_DIR: '/env/project' },
      cwd: '/cwd/project',
    });

    expect(resolved).toBe('/env/project');
  });

  it('falls back to cwd when OPENKANBAN_PROJECT_DIR is missing', () => {
    const resolved = resolveInitialProjectRoot({ env: {}, cwd: '/cwd/project' });
    expect(resolved).toBe('/cwd/project');
  });

  it('falls back to cwd when OPENKANBAN_PROJECT_DIR is blank', () => {
    const resolved = resolveInitialProjectRoot({
      env: { OPENKANBAN_PROJECT_DIR: '   ' },
      cwd: '/cwd/project',
    });

    expect(resolved).toBe('/cwd/project');
  });
});
