// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { open } from '@tauri-apps/plugin-dialog';

vi.mock('../../packages/desktop/src/lib/catalog.js', async () => {
  const actual = await vi.importActual<
    typeof import('../../packages/desktop/src/lib/catalog.js')
  >('../../packages/desktop/src/lib/catalog.js');
  return {
    ...actual,
    validateProjectPath: vi.fn(),
  };
});

import {
  hydrateProjectPicker,
  setShowUnavailable,
  clearProjectPickerTransientState,
  getProjectPickerState,
  getVisibleProjects,
} from '../../packages/desktop/src/lib/stores/project-picker.svelte.js';
import type { ProjectCatalogRecord } from '../../packages/desktop/src/lib/catalog.js';
import { validateProjectPath } from '../../packages/desktop/src/lib/catalog.js';
import { upsertOpenedProject } from '../../packages/desktop/src/lib/stores/project-catalog.svelte.js';
import { switchProject } from '../../packages/desktop/src/lib/stores/project.svelte.js';

// Mock Tauri APIs that Board.svelte and App.svelte may import transitively
vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn().mockResolvedValue(() => {}),
  emit: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue([]),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
}));

vi.mock('../../packages/desktop/src/lib/stores/project-catalog.svelte.js', async () => {
  const actual = await vi.importActual<
    typeof import('../../packages/desktop/src/lib/stores/project-catalog.svelte.js')
  >('../../packages/desktop/src/lib/stores/project-catalog.svelte.js');
  return {
    ...actual,
    loadProjectCatalog: vi.fn().mockResolvedValue(undefined),
    upsertOpenedProject: vi.fn(),
  };
});

vi.mock('../../packages/desktop/src/lib/stores/project.svelte.js', async () => {
  const actual = await vi.importActual<
    typeof import('../../packages/desktop/src/lib/stores/project.svelte.js')
  >('../../packages/desktop/src/lib/stores/project.svelte.js');
  return {
    ...actual,
    switchProject: vi.fn(),
  };
});

// Lazy-import the component so mocks are in place before module evaluation
const { default: ProjectSidebar } = await import(
  '../../packages/desktop/src/lib/components/ProjectSidebar.svelte'
);

const mockOpen = vi.mocked(open);
const mockValidateProjectPath = vi.mocked(validateProjectPath);
const mockUpsertOpenedProject = vi.mocked(upsertOpenedProject);
const mockSwitchProject = vi.mocked(switchProject);

function seedSidebar(
  projects: ProjectCatalogRecord[],
  activeProject: string | null = null,
): void {
  hydrateProjectPicker(projects, activeProject);
  setShowUnavailable(false);
  clearProjectPickerTransientState();
}

const user = userEvent.setup();

describe('ProjectSidebar', () => {
  beforeEach(() => {
    seedSidebar([], null);
    mockOpen.mockReset();
    mockValidateProjectPath.mockReset();
    mockUpsertOpenedProject.mockReset();
    mockSwitchProject.mockReset();
    mockValidateProjectPath.mockResolvedValue(true);
    mockSwitchProject.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    cleanup();
  });

  // --- Test 1: Sidebar renders as a permanent left column alongside board ---
  it('renders as a permanent sidebar with Projects heading', () => {
    render(ProjectSidebar);

    const sidebar = screen.getByRole('complementary', { name: /projects/i });
    expect(sidebar).toBeTruthy();

    const heading = screen.getByRole('heading', { name: /projects/i });
    expect(heading).toBeTruthy();
  });

  // --- Test 2: Rows render icon + name + active/unavailable markers ---
  it('renders project rows with icon, name, and active marker', () => {
    seedSidebar(
      [
        {
          projectPath: '/alpha',
          name: 'Alpha',
          lastOpenedAt: '2026-04-13T11:00:00Z',
          source: 'opened',
          isAvailable: true,
        },
        {
          projectPath: '/beta',
          name: 'Beta',
          lastOpenedAt: '2026-04-13T10:00:00Z',
          source: 'opened',
          isAvailable: true,
        },
      ],
      '/alpha',
    );

    render(ProjectSidebar);

    // Both projects should render
    expect(screen.getByText('Alpha')).toBeTruthy();
    expect(screen.getByText('Beta')).toBeTruthy();

    // Active project should have an active marker (aria-current)
    const alphaRow = screen.getByRole('button', { name: /alpha/i });
    expect(alphaRow.getAttribute('aria-current')).toBe('true');

    // Non-active project should not have active marker
    const betaRow = screen.getByRole('button', { name: /beta/i });
    expect(betaRow.getAttribute('aria-current')).not.toBe('true');
  });

  // --- Test 3: Unavailable rows have unavailable marker ---
  it('renders unavailable marker on unavailable project rows', () => {
    seedSidebar(
      [
        {
          projectPath: '/online',
          name: 'Online',
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
      '/online',
    );

    setShowUnavailable(true);
    render(ProjectSidebar);

    const offlineRow = screen.getByRole('button', { name: /offline/i });
    expect(offlineRow.getAttribute('aria-disabled')).toBe('true');
  });

  // --- Test 4: Show unavailable toggle hides/shows unavailable rows ---
  it('shows unavailable rows only when toggle is enabled', async () => {
    seedSidebar(
      [
        {
          projectPath: '/available',
          name: 'Available',
          lastOpenedAt: '2026-04-13T11:00:00Z',
          source: 'opened',
          isAvailable: true,
        },
        {
          projectPath: '/hidden',
          name: 'Hidden',
          lastOpenedAt: '2026-04-13T10:00:00Z',
          source: 'opened',
          isAvailable: false,
        },
      ],
      '/available',
    );

    render(ProjectSidebar);

    // Unavailable project should not be visible by default
    expect(screen.queryByText('Hidden')).toBeNull();

    // Toggle Show unavailable
    const toggle = screen.getByRole('checkbox', { name: /show unavailable/i });
    await user.click(toggle);

    // Now unavailable project should be visible
    expect(screen.getByText('Hidden')).toBeTruthy();
  });

  // --- Test 5: Open/Add project action is visible and wired ---
  it('renders Open/Add project button that is clickable', async () => {
    render(ProjectSidebar);

    const addButton = screen.getByRole('button', { name: /open.*add.*project/i });
    expect(addButton).toBeTruthy();

    // Button should be interactive (not disabled)
    expect(addButton.hasAttribute('disabled')).toBe(false);
  });

  // --- Test 6: Clicking a project row dispatches to picker store ---
  it('clicking a project row enters switching state before switch promise resolves', async () => {
    seedSidebar(
      [
        {
          projectPath: '/active',
          name: 'Active',
          lastOpenedAt: '2026-04-13T11:00:00Z',
          source: 'opened',
          isAvailable: true,
        },
        {
          projectPath: '/target',
          name: 'Target',
          lastOpenedAt: '2026-04-13T10:00:00Z',
          source: 'opened',
          isAvailable: true,
        },
      ],
      '/active',
    );
    let resolveSwitch!: (value: { ok: true }) => void;
    mockSwitchProject.mockImplementationOnce(
      () => new Promise<{ ok: true }>((resolve) => { resolveSwitch = resolve; }),
    );

    render(ProjectSidebar);

    await user.click(screen.getByRole('button', { name: /target/i }));

    expect(getProjectPickerState()).toMatchObject({
      mode: 'switching',
      switchingProjectPath: '/target',
    });

    resolveSwitch({ ok: true });
  });

  it('clicking available project row performs switchProject and completes picker switch on success', async () => {
    seedSidebar(
      [
        {
          projectPath: '/active',
          name: 'Active',
          lastOpenedAt: '2026-04-13T11:00:00Z',
          source: 'opened',
          isAvailable: true,
        },
        {
          projectPath: '/target',
          name: 'Target',
          lastOpenedAt: '2026-04-13T10:00:00Z',
          source: 'opened',
          isAvailable: true,
        },
      ],
      '/active',
    );
    mockSwitchProject.mockResolvedValueOnce({ ok: true });

    render(ProjectSidebar);

    await user.click(screen.getByRole('button', { name: /target/i }));

    expect(mockSwitchProject).toHaveBeenCalledWith('/target');
    expect(getProjectPickerState()).toMatchObject({
      activeProjectPath: '/target',
      mode: 'idle',
      switchingProjectPath: null,
    });
  });

  it('clicking available project row records switch_error when switchProject fails', async () => {
    seedSidebar(
      [
        {
          projectPath: '/active',
          name: 'Active',
          lastOpenedAt: '2026-04-13T11:00:00Z',
          source: 'opened',
          isAvailable: true,
        },
        {
          projectPath: '/target',
          name: 'Target',
          lastOpenedAt: '2026-04-13T10:00:00Z',
          source: 'opened',
          isAvailable: true,
        },
      ],
      '/active',
    );
    mockSwitchProject.mockResolvedValueOnce({ ok: false, error: 'rebind failed' });

    render(ProjectSidebar);

    await user.click(screen.getByRole('button', { name: /target/i }));

    expect(getProjectPickerState()).toMatchObject({
      activeProjectPath: '/active',
      mode: 'switch_error',
      switchingProjectPath: null,
      switchError: 'rebind failed',
    });
  });

  // --- Test 7: Rows render a leading icon character (fallback) ---
  it('renders a leading icon for each project row', () => {
    seedSidebar(
      [
        {
          projectPath: '/demo',
          name: 'Demo',
          lastOpenedAt: '2026-04-13T11:00:00Z',
          source: 'opened',
          isAvailable: true,
        },
      ],
      '/demo',
    );

    render(ProjectSidebar);

    // The fallback icon should be the first letter of the project name
    const icon = screen.getByText('D', { selector: '.project-icon' });
    expect(icon).toBeTruthy();
  });

  // --- Test 8: Clicking unavailable project in sidebar sets picker to unavailable mode ---
  it('clicking unavailable project row sets picker mode to unavailable', async () => {
    seedSidebar(
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

    // Enable unavailable visibility so the row renders
    setShowUnavailable(true);
    render(ProjectSidebar);

    await user.click(screen.getByRole('button', { name: /offline/i }));

    const pickerState = getProjectPickerState();
    expect(pickerState.mode).toBe('unavailable');
    expect(pickerState.unavailableProjectPath).toBe('/offline');
    expect(pickerState.activeProjectPath).toBe('/active');
  });

  it('Open/Add project does nothing when folder picker is cancelled', async () => {
    mockOpen.mockResolvedValueOnce(null);

    render(ProjectSidebar);

    await user.click(screen.getByRole('button', { name: /open.*add.*project/i }));

    expect(mockUpsertOpenedProject).not.toHaveBeenCalled();
    expect(getProjectPickerState().mode).toBe('idle');
  });

  it('Open/Add project keeps current context when picked directory is invalid', async () => {
    seedSidebar(
      [
        {
          projectPath: '/active',
          name: 'Active',
          lastOpenedAt: '2026-04-13T11:00:00Z',
          source: 'opened',
          isAvailable: true,
        },
      ],
      '/active',
    );

    mockOpen.mockResolvedValueOnce('/workspace/invalid');
    mockValidateProjectPath.mockResolvedValueOnce(false);

    render(ProjectSidebar);

    await user.click(screen.getByRole('button', { name: /open.*add.*project/i }));

    expect(getProjectPickerState().activeProjectPath).toBe('/active');
    expect(mockUpsertOpenedProject).not.toHaveBeenCalled();
  });

  it('Open/Add project adds valid project to visible list and marks it switching', async () => {
    seedSidebar(
      [
        {
          projectPath: '/active',
          name: 'Active',
          lastOpenedAt: '2026-04-13T11:00:00Z',
          source: 'opened',
          isAvailable: true,
        },
      ],
      '/active',
    );

    mockOpen.mockResolvedValueOnce('/workspace/demo');
    mockUpsertOpenedProject.mockResolvedValueOnce({
      projectPath: '/workspace/demo',
      name: 'demo',
      lastOpenedAt: '2026-04-13T12:00:00Z',
      source: 'opened',
      isAvailable: true,
    });

    render(ProjectSidebar);

    await user.click(screen.getByRole('button', { name: /open.*add.*project/i }));

    expect(mockUpsertOpenedProject).toHaveBeenCalledWith('/workspace/demo');
    expect(getVisibleProjects().map((project) => project.projectPath)).toContain('/workspace/demo');
    expect(mockSwitchProject).toHaveBeenCalledWith('/workspace/demo');
  });

  it('Open/Add project completes picker switch after successful add and switch', async () => {
    seedSidebar(
      [
        {
          projectPath: '/active',
          name: 'Active',
          lastOpenedAt: '2026-04-13T11:00:00Z',
          source: 'opened',
          isAvailable: true,
        },
      ],
      '/active',
    );

    mockOpen.mockResolvedValueOnce('/workspace/demo');
    mockUpsertOpenedProject.mockResolvedValueOnce({
      projectPath: '/workspace/demo',
      name: 'demo',
      lastOpenedAt: '2026-04-13T12:00:00Z',
      source: 'opened',
      isAvailable: true,
    });
    mockSwitchProject.mockResolvedValueOnce({ ok: true });

    render(ProjectSidebar);

    await user.click(screen.getByRole('button', { name: /open.*add.*project/i }));

    expect(getProjectPickerState()).toMatchObject({
      activeProjectPath: '/workspace/demo',
      mode: 'idle',
      switchingProjectPath: null,
    });
  });
});
