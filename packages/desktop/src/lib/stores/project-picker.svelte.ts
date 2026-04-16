import type { ProjectCatalogRecord } from '../catalog.js';

export type ProjectPickerMode = 'idle' | 'switching' | 'unavailable' | 'switch_error';

export interface ProjectPickerState {
  projects: ProjectCatalogRecord[];
  activeProjectPath: string | null;
  showUnavailable: boolean;
  mode: ProjectPickerMode;
  switchingProjectPath: string | null;
  unavailableProjectPath: string | null;
  switchError: string | null;
}

let state = $state<ProjectPickerState>({
  projects: [],
  activeProjectPath: null,
  showUnavailable: false,
  mode: 'idle',
  switchingProjectPath: null,
  unavailableProjectPath: null,
  switchError: null,
});

export function hydrateProjectPicker(
  projects: ProjectCatalogRecord[],
  activeProject: string | null,
): void {
  state = {
    ...state,
    projects: [...projects],
    activeProjectPath: activeProject,
  };
}

export function getProjectPickerState(): ProjectPickerState {
  return state;
}

export function setShowUnavailable(show: boolean): void {
  state = {
    ...state,
    showUnavailable: show,
  };
}

export function clearProjectPickerTransientState(): void {
  state = {
    ...state,
    mode: 'idle',
    switchingProjectPath: null,
    unavailableProjectPath: null,
    switchError: null,
  };
}

export function getVisibleProjects(): ProjectCatalogRecord[] {
  const visible = state.showUnavailable
    ? state.projects
    : state.projects.filter((project) => project.isAvailable);

  return [...visible].sort((left, right) => compareProjects(left, right, state.activeProjectPath));
}

export function openProjectFromSidebar(projectPath: string): void {
  const project = state.projects.find((candidate) => candidate.projectPath === projectPath);
  if (!project) {
    return;
  }

  if (!project.isAvailable) {
    state = {
      ...state,
      mode: 'unavailable',
      unavailableProjectPath: projectPath,
      switchingProjectPath: null,
    };
    return;
  }

  state = {
    ...state,
    mode: 'switching',
    switchingProjectPath: projectPath,
    unavailableProjectPath: null,
    switchError: null,
  };
}

export function addProjectToPicker(project: ProjectCatalogRecord): void {
  const existingIndex = state.projects.findIndex(
    (candidate) => candidate.projectPath === project.projectPath,
  );

  const nextProjects =
    existingIndex === -1
      ? [...state.projects, project]
      : state.projects.map((candidate, index) =>
          index === existingIndex ? project : candidate,
        );

  state = {
    ...state,
    projects: nextProjects,
  };
}

export function completeSwitch(projectPath: string): void {
  state = {
    ...state,
    activeProjectPath: projectPath,
    mode: 'idle',
    switchingProjectPath: null,
    unavailableProjectPath: null,
    switchError: null,
  };
}

export function failSwitch(error: string): void {
  state = {
    ...state,
    mode: 'switch_error',
    switchingProjectPath: null,
    switchError: error,
  };
}

function compareProjects(
  left: ProjectCatalogRecord,
  right: ProjectCatalogRecord,
  activeProjectPath: string | null,
): number {
  if (left.projectPath === activeProjectPath && right.projectPath !== activeProjectPath) {
    return -1;
  }

  if (right.projectPath === activeProjectPath && left.projectPath !== activeProjectPath) {
    return 1;
  }

  const leftTime = Date.parse(left.lastOpenedAt ?? '');
  const rightTime = Date.parse(right.lastOpenedAt ?? '');

  if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) {
    return rightTime - leftTime;
  }

  if (Number.isFinite(leftTime) && !Number.isFinite(rightTime)) {
    return -1;
  }

  if (!Number.isFinite(leftTime) && Number.isFinite(rightTime)) {
    return 1;
  }

  return left.projectPath.localeCompare(right.projectPath);
}
