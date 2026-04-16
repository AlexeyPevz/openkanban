import { open } from '@tauri-apps/plugin-dialog';

import { upsertOpenedProject } from './stores/project-catalog.svelte.js';

export type ProjectIconMeta =
  | { kind: 'host'; value: string }
  | { kind: 'fallback'; value: string; temporary: true };

export interface ProjectDisplayMeta {
  label: string;
  icon: ProjectIconMeta;
}

export interface ProjectPickerBridgeDeps {
  validateProject?: (projectPath: string) => Promise<boolean>;
  resolveHostMeta?: (projectPath: string) => Promise<ProjectDisplayMeta | null>;
}

export type OpenAddProjectResult =
  | { kind: 'cancelled' }
  | { kind: 'invalid'; projectPath: string }
  | { kind: 'added'; projectPath: string };

export async function openAddProjectDialog(
  deps: ProjectPickerBridgeDeps = {},
): Promise<OpenAddProjectResult> {
  const selected = await open({
    directory: true,
    multiple: false,
  });

  if (selected === null || Array.isArray(selected)) {
    return { kind: 'cancelled' };
  }

  const isValid = deps.validateProject
    ? await deps.validateProject(selected)
    : true;

  if (!isValid) {
    return {
      kind: 'invalid',
      projectPath: selected,
    };
  }

  await upsertOpenedProject(selected);
  return {
    kind: 'added',
    projectPath: selected,
  };
}

export async function getProjectDisplayMeta(
  projectPath: string,
  deps: ProjectPickerBridgeDeps = {},
): Promise<ProjectDisplayMeta> {
  const hostMeta = deps.resolveHostMeta
    ? await deps.resolveHostMeta(projectPath)
    : null;

  if (hostMeta) {
    return hostMeta;
  }

  return {
    label: basename(projectPath),
    icon: {
      kind: 'fallback',
      value: fallbackLetter(projectPath),
      temporary: true,
    },
  };
}

function basename(projectPath: string): string {
  const normalized = projectPath.replace(/\\/g, '/');
  const parts = normalized.split('/').filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : projectPath;
}

function fallbackLetter(projectPath: string): string {
  const label = basename(projectPath).trim();
  return label.charAt(0).toUpperCase() || '?';
}
