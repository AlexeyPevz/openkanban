import { projectApi } from '../rpc.js';
import { refreshBoard } from './board.svelte.js';
import { upsertOpenedProject } from './project-catalog.svelte.js';

let activeProject = $state<string | null>(null);

export function getActiveProject(): string | null {
  return activeProject;
}

export async function initializeActiveProject(): Promise<void> {
  const result = await projectApi.current();
  if (result.ok) {
    activeProject = result.data.directory;
    await upsertOpenedProject(result.data.directory);
  }
}

export async function handleLaunchDirectory(directory: string): Promise<void> {
  const current = activeProject;
  if (current && current === directory) {
    return;
  }

  const rebind = await projectApi.rebind(directory);
  if (!rebind.ok) {
    return;
  }

  activeProject = rebind.data.directory;
  await upsertOpenedProject(rebind.data.directory);
  await refreshBoard();
}

export async function switchProject(
  directory: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const current = activeProject;
  if (current && current === directory) {
    return { ok: true };
  }

  const rebind = await projectApi.rebind(directory);
  if (!rebind.ok) {
    return { ok: false, error: rebind.error.message };
  }

  activeProject = rebind.data.directory;
  await upsertOpenedProject(rebind.data.directory);
  await refreshBoard();
  return { ok: true };
}
