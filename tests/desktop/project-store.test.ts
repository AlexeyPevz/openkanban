// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../packages/desktop/src/lib/rpc.js', () => ({
  projectApi: {
    current: vi.fn(),
    rebind: vi.fn(),
  },
}));

vi.mock('../../packages/desktop/src/lib/stores/board.svelte.js', () => ({
  refreshBoard: vi.fn(),
}));

import { projectApi } from '../../packages/desktop/src/lib/rpc.js';
import { refreshBoard } from '../../packages/desktop/src/lib/stores/board.svelte.js';
import {
  getActiveProject,
  initializeActiveProject,
  handleLaunchDirectory,
} from '../../packages/desktop/src/lib/stores/project.svelte.js';

const mockProjectApi = vi.mocked(projectApi);
const mockRefreshBoard = vi.mocked(refreshBoard);

describe('project store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializeActiveProject loads current project from API', async () => {
    mockProjectApi.current.mockResolvedValueOnce({
      ok: true,
      data: { directory: '/project-a' },
    });

    await initializeActiveProject();
    expect(getActiveProject()).toBe('/project-a');
  });

  it('handleLaunchDirectory does nothing for same directory', async () => {
    mockProjectApi.current.mockResolvedValueOnce({
      ok: true,
      data: { directory: '/project-a' },
    });
    await initializeActiveProject();

    await handleLaunchDirectory('/project-a');

    expect(mockProjectApi.rebind).not.toHaveBeenCalled();
    expect(mockRefreshBoard).not.toHaveBeenCalled();
    expect(getActiveProject()).toBe('/project-a');
  });

  it('handleLaunchDirectory rebinds and refreshes for changed directory', async () => {
    mockProjectApi.current.mockResolvedValueOnce({
      ok: true,
      data: { directory: '/project-a' },
    });
    await initializeActiveProject();

    mockProjectApi.rebind.mockResolvedValueOnce({
      ok: true,
      data: { directory: '/project-b', rebound: true },
    });

    await handleLaunchDirectory('/project-b');

    expect(mockProjectApi.rebind).toHaveBeenCalledWith('/project-b');
    expect(mockRefreshBoard).toHaveBeenCalledTimes(1);
    expect(getActiveProject()).toBe('/project-b');
  });

  it('handleLaunchDirectory keeps previous active project on rebind failure', async () => {
    mockProjectApi.current.mockResolvedValueOnce({
      ok: true,
      data: { directory: '/project-a' },
    });
    await initializeActiveProject();

    mockProjectApi.rebind.mockResolvedValueOnce({
      ok: false,
      error: { code: -1, message: 'rebind failed' },
    });

    await handleLaunchDirectory('/project-b');

    expect(getActiveProject()).toBe('/project-a');
    expect(mockRefreshBoard).not.toHaveBeenCalled();
  });
});
