// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProjectCatalogRecord } from '../../packages/desktop/src/lib/catalog.js';
import { upsertOpenedProject } from '../../packages/desktop/src/lib/stores/project-catalog.svelte.js';
import {
  clearProjectPickerTransientState,
  getProjectPickerState,
  getVisibleProjects,
  hydrateProjectPicker,
  openProjectFromSidebar,
  setShowUnavailable,
  completeSwitch,
  failSwitch,
} from '../../packages/desktop/src/lib/stores/project-picker.svelte.js';
import {
  getProjectDisplayMeta,
  openAddProjectDialog,
  type ProjectDisplayMeta,
} from '../../packages/desktop/src/lib/project-picker.js';

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
}));

vi.mock('../../packages/desktop/src/lib/stores/project-catalog.svelte.js', async () => {
  const actual = await vi.importActual<typeof import('../../packages/desktop/src/lib/stores/project-catalog.svelte.js')>(
    '../../packages/desktop/src/lib/stores/project-catalog.svelte.js',
  );

  return {
    ...actual,
    upsertOpenedProject: vi.fn(),
  };
});

import { open } from '@tauri-apps/plugin-dialog';

const mockOpen = vi.mocked(open);
const mockCatalogUpsert = vi.mocked(upsertOpenedProject);

function seedProjectPicker(
  projects: ProjectCatalogRecord[],
  activeProject: string | null,
): void {
  hydrateProjectPicker(projects, activeProject);
  setShowUnavailable(false);
  clearProjectPickerTransientState();
}

describe('project picker store', () => {
  beforeEach(() => {
    seedProjectPicker([], null);
  });

  it('default visible list hides unavailable projects', () => {
    seedProjectPicker(
      [
        {
          projectPath: '/available',
          name: 'Available',
          lastOpenedAt: '2026-04-13T11:00:00Z',
          source: 'opened',
          isAvailable: true,
        },
        {
          projectPath: '/unavailable',
          name: 'Unavailable',
          lastOpenedAt: '2026-04-13T12:00:00Z',
          source: 'opened',
          isAvailable: false,
        },
      ],
      '/available',
    );

    expect(getVisibleProjects().map((project) => project.projectPath)).toEqual([
      '/available',
    ]);
  });

  it('setShowUnavailable(true) exposes unavailable projects', () => {
    seedProjectPicker(
      [
        {
          projectPath: '/available',
          name: 'Available',
          lastOpenedAt: '2026-04-13T11:00:00Z',
          source: 'opened',
          isAvailable: true,
        },
        {
          projectPath: '/unavailable',
          name: 'Unavailable',
          lastOpenedAt: '2026-04-13T12:00:00Z',
          source: 'opened',
          isAvailable: false,
        },
      ],
      '/available',
    );

    setShowUnavailable(true);

    expect(getVisibleProjects().map((project) => project.projectPath)).toEqual([
      '/available',
      '/unavailable',
    ]);
  });

  it('fallback sorting keeps active project first then descending lastOpenedAt deterministically', () => {
    seedProjectPicker(
      [
        {
          projectPath: '/b',
          name: 'B',
          lastOpenedAt: '2026-04-13T08:00:00Z',
          source: 'opened',
          isAvailable: true,
        },
        {
          projectPath: '/a',
          name: 'A',
          lastOpenedAt: '2026-04-13T11:00:00Z',
          source: 'opened',
          isAvailable: true,
        },
        {
          projectPath: '/c',
          name: 'C',
          lastOpenedAt: '2026-04-13T10:00:00Z',
          source: 'opened',
          isAvailable: true,
        },
        {
          projectPath: '/d',
          name: 'D',
          lastOpenedAt: '2026-04-13T10:00:00Z',
          source: 'opened',
          isAvailable: true,
        },
      ],
      '/b',
    );

    expect(getVisibleProjects().map((project) => project.projectPath)).toEqual([
      '/b',
      '/a',
      '/c',
      '/d',
    ]);
  });

  it('opening unavailable project sets unavailable mode/state instead of switching', () => {
    seedProjectPicker(
      [
        {
          projectPath: '/active',
          name: 'Active',
          lastOpenedAt: '2026-04-13T11:00:00Z',
          source: 'opened',
          isAvailable: true,
        },
        {
          projectPath: '/offline',
          name: 'Offline',
          lastOpenedAt: '2026-04-13T10:00:00Z',
          source: 'opened',
          isAvailable: false,
        },
      ],
      '/active',
    );

    openProjectFromSidebar('/offline');

    expect(getProjectPickerState()).toMatchObject({
      activeProjectPath: '/active',
      mode: 'unavailable',
      unavailableProjectPath: '/offline',
      switchingProjectPath: null,
    });
  });

  it('opening available project sets switching mode/state', () => {
    seedProjectPicker(
      [
        {
          projectPath: '/active',
          name: 'Active',
          lastOpenedAt: '2026-04-13T11:00:00Z',
          source: 'opened',
          isAvailable: true,
        },
        {
          projectPath: '/next',
          name: 'Next',
          lastOpenedAt: '2026-04-13T10:00:00Z',
          source: 'opened',
          isAvailable: true,
        },
      ],
      '/active',
    );

    openProjectFromSidebar('/next');

    expect(getProjectPickerState()).toMatchObject({
      activeProjectPath: '/active',
      mode: 'switching',
      switchingProjectPath: '/next',
      unavailableProjectPath: null,
    });
  });

  it('completeSwitch transitions from switching to idle and updates active project', () => {
    seedProjectPicker(
      [
        {
          projectPath: '/active',
          name: 'Active',
          lastOpenedAt: '2026-04-13T11:00:00Z',
          source: 'opened',
          isAvailable: true,
        },
        {
          projectPath: '/next',
          name: 'Next',
          lastOpenedAt: '2026-04-13T10:00:00Z',
          source: 'opened',
          isAvailable: true,
        },
      ],
      '/active',
    );

    openProjectFromSidebar('/next');
    completeSwitch('/next');

    expect(getProjectPickerState()).toMatchObject({
      activeProjectPath: '/next',
      mode: 'idle',
      switchingProjectPath: null,
    });
  });

  it('failSwitch transitions from switching to switch_error and preserves active project', () => {
    seedProjectPicker(
      [
        {
          projectPath: '/active',
          name: 'Active',
          lastOpenedAt: '2026-04-13T11:00:00Z',
          source: 'opened',
          isAvailable: true,
        },
        {
          projectPath: '/next',
          name: 'Next',
          lastOpenedAt: '2026-04-13T10:00:00Z',
          source: 'opened',
          isAvailable: true,
        },
      ],
      '/active',
    );

    openProjectFromSidebar('/next');
    failSwitch('rebind failed');

    expect(getProjectPickerState()).toMatchObject({
      activeProjectPath: '/active',
      mode: 'switch_error',
      switchingProjectPath: null,
      switchError: 'rebind failed',
    });
  });

  it('unavailable project click does not overwrite active project path', () => {
    seedProjectPicker(
      [
        {
          projectPath: '/active',
          name: 'Active',
          lastOpenedAt: '2026-04-13T11:00:00Z',
          source: 'opened',
          isAvailable: true,
        },
        {
          projectPath: '/offline',
          name: 'Offline',
          lastOpenedAt: '2026-04-13T10:00:00Z',
          source: 'opened',
          isAvailable: false,
        },
      ],
      '/active',
    );

    openProjectFromSidebar('/offline');

    // Active project must remain unchanged
    expect(getProjectPickerState().activeProjectPath).toBe('/active');
    // Mode is unavailable, not switching
    expect(getProjectPickerState().mode).toBe('unavailable');
    // switchingProjectPath must not be set
    expect(getProjectPickerState().switchingProjectPath).toBeNull();
  });
});

describe('project picker desktop bridge', () => {
  beforeEach(() => {
    mockOpen.mockReset();
    mockCatalogUpsert.mockReset();
  });

  it('openAddProjectDialog returns no-op result when folder picker is cancelled', async () => {
    mockOpen.mockResolvedValueOnce(null);

    const result = await openAddProjectDialog();

    expect(result).toEqual({ kind: 'cancelled' });
  });

  it('openAddProjectDialog rejects invalid directory result', async () => {
    mockOpen.mockResolvedValueOnce('/workspace/invalid');

    const result = await openAddProjectDialog({
      validateProject: async () => false,
    });

    expect(result).toEqual({
      kind: 'invalid',
      projectPath: '/workspace/invalid',
    });
    expect(mockCatalogUpsert).not.toHaveBeenCalled();
  });

  it('openAddProjectDialog validates and upserts valid directory result', async () => {
    mockOpen.mockResolvedValueOnce('/workspace/demo');
    mockCatalogUpsert.mockResolvedValueOnce({
      projectPath: '/workspace/demo',
      name: 'demo',
      lastOpenedAt: '2026-04-13T12:00:00Z',
      source: 'opened',
      isAvailable: true,
    });

    const result = await openAddProjectDialog({
      validateProject: async () => true,
    });

    expect(mockCatalogUpsert).toHaveBeenCalledWith('/workspace/demo');
    expect(result).toEqual({
      kind: 'added',
      projectPath: '/workspace/demo',
    });
  });

  it('returns host icon metadata when host icon lookup succeeds', async () => {
    const meta = await getProjectDisplayMeta('/workspace/demo', {
      resolveHostMeta: async () => ({
        label: 'Demo',
        icon: { kind: 'host', value: 'opencode-icon' },
      }),
    });

    expect(meta).toEqual<ProjectDisplayMeta>({
      label: 'Demo',
      icon: { kind: 'host', value: 'opencode-icon' },
    });
  });

  it('returns fallback icon metadata when host icon is unavailable', async () => {
    const meta = await getProjectDisplayMeta('/workspace/demo', {
      resolveHostMeta: async () => null,
    });

    expect(meta.icon.kind).toBe('fallback');
    expect(meta.icon.temporary).toBe(true);
    expect(meta.label).toBe('demo');
  });
});
