import { invoke } from '@tauri-apps/api/core';

export type ProjectCatalogSource = 'opened' | 'discovered';

export interface ProjectCatalogRecord {
  projectPath: string;
  name: string;
  lastOpenedAt: string | null;
  source: ProjectCatalogSource;
  isAvailable: boolean;
}

/**
 * Catalog commands target desktop-local Tauri state (app-data registry),
 * so they use direct invoke() and are intentionally separate from sidecar rpc.ts.
 */
export async function listProjects(): Promise<ProjectCatalogRecord[]> {
  return invoke<ProjectCatalogRecord[]>('catalog_list_projects');
}

export async function validateProjectPath(projectPath: string): Promise<boolean> {
  return invoke<boolean>('catalog_validate_project_path', {
    projectPath,
  });
}

export async function upsertOpenedProject(
  projectPath: string,
  name?: string,
): Promise<ProjectCatalogRecord> {
  return invoke<ProjectCatalogRecord>('catalog_upsert_opened_project', {
    projectPath,
    name,
  });
}
