// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import {
  listProjects,
  validateProjectPath,
  upsertOpenedProject as upsertOpenedProjectApi,
} from '../../packages/desktop/src/lib/catalog.js';
import {
  getProjectCatalog,
  loadProjectCatalog,
  upsertOpenedProject as upsertOpenedProjectStore,
} from '../../packages/desktop/src/lib/stores/project-catalog.svelte.js';
import { initializeDesktopStartup } from '../../packages/desktop/src/App.svelte';

const mockInvoke = vi.mocked(invoke);

describe('catalog API wrappers', () => {
  beforeEach(() => {
    mockInvoke.mockReset();
  });

  it('listProjects invokes catalog_list_projects', async () => {
    mockInvoke.mockResolvedValueOnce([]);

    await listProjects();

    expect(mockInvoke).toHaveBeenCalledWith('catalog_list_projects');
  });

  it('upsertOpenedProject invokes catalog_upsert_opened_project', async () => {
    mockInvoke.mockResolvedValueOnce({
      projectPath: '/project-a',
      name: 'Project A',
      lastOpenedAt: '2026-04-13T21:00:00.000Z',
      source: 'opened',
      isAvailable: true,
    });

    await upsertOpenedProjectApi('/project-a', 'Project A');

    expect(mockInvoke).toHaveBeenCalledWith('catalog_upsert_opened_project', {
      projectPath: '/project-a',
      name: 'Project A',
    });
  });

  it('validateProjectPath invokes catalog_validate_project_path', async () => {
    mockInvoke.mockResolvedValueOnce(true);

    await validateProjectPath('/project-a');

    expect(mockInvoke).toHaveBeenCalledWith('catalog_validate_project_path', {
      projectPath: '/project-a',
    });
  });
});

describe('project catalog store', () => {
  beforeEach(() => {
    mockInvoke.mockReset();
  });

  it('loadProjectCatalog hydrates empty list from command result', async () => {
    mockInvoke.mockResolvedValueOnce([]);

    await loadProjectCatalog();

    expect(getProjectCatalog()).toEqual([]);
  });

  it('loadProjectCatalog hydrates non-empty list from command result', async () => {
    const existing = [
      {
        projectPath: '/project-a',
        name: 'Project A',
        lastOpenedAt: '2026-04-13T20:00:00.000Z',
        source: 'opened',
        isAvailable: true,
      },
    ];
    mockInvoke.mockResolvedValueOnce(existing);

    await loadProjectCatalog();

    expect(getProjectCatalog()).toEqual(existing);
  });

  it('loadProjectCatalog falls back to empty list when command fails', async () => {
    mockInvoke.mockResolvedValueOnce([
      {
        projectPath: '/project-a',
        name: 'Project A',
        lastOpenedAt: '2026-04-13T20:00:00.000Z',
        source: 'opened',
        isAvailable: true,
      },
    ]);
    await loadProjectCatalog();

    mockInvoke.mockRejectedValueOnce(new Error('catalog unavailable'));

    await expect(loadProjectCatalog()).resolves.toBeUndefined();
    expect(getProjectCatalog()).toEqual([]);
  });

  it('store upsert updates in-memory catalog without picker UI', async () => {
    const initial = [
      {
        projectPath: '/project-a',
        name: 'Project A',
        lastOpenedAt: '2026-04-13T20:00:00.000Z',
        source: 'opened',
        isAvailable: true,
      },
    ];
    mockInvoke.mockResolvedValueOnce(initial);
    await loadProjectCatalog();

    const updated = {
      projectPath: '/project-a',
      name: 'Project A Renamed',
      lastOpenedAt: '2026-04-13T21:00:00.000Z',
      source: 'opened',
      isAvailable: true,
    };
    mockInvoke.mockResolvedValueOnce(updated);

    await upsertOpenedProjectStore('/project-a', 'Project A Renamed');

    expect(getProjectCatalog()).toEqual([updated]);
  });
});

describe('app startup orchestration', () => {
  beforeEach(() => {
    mockInvoke.mockReset();
  });

  it('initializeDesktopStartup hydrates catalog before active project init', async () => {
    const calls: string[] = [];

    const loadCatalog = vi.fn().mockImplementation(async () => {
      calls.push('catalog');
    });
    const initializeActiveProject = vi.fn().mockImplementation(async () => {
      calls.push('project');
    });

    await initializeDesktopStartup({
      loadCatalog,
      initializeActiveProject,
    });

    expect(loadCatalog).toHaveBeenCalledTimes(1);
    expect(initializeActiveProject).toHaveBeenCalledTimes(1);
    expect(calls).toEqual(['catalog', 'project']);
  });
});
