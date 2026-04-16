import type { ProjectCatalogRecord } from '../catalog.js';
import {
  listProjects,
  upsertOpenedProject as upsertOpenedProjectApi,
} from '../catalog.js';

let projectCatalog = $state<ProjectCatalogRecord[]>([]);

export function getProjectCatalog(): ProjectCatalogRecord[] {
  return projectCatalog;
}

export async function loadProjectCatalog(): Promise<void> {
  try {
    projectCatalog = await listProjects();
  } catch (error) {
    console.error('Failed to load project catalog', error);
    projectCatalog = [];
  }
}

export async function upsertOpenedProject(
  projectPath: string,
  name?: string,
): Promise<ProjectCatalogRecord> {
  const upserted = await upsertOpenedProjectApi(projectPath, name);
  const index = projectCatalog.findIndex(
    (project) => project.projectPath === upserted.projectPath,
  );

  if (index === -1) {
    projectCatalog = [...projectCatalog, upserted];
    return upserted;
  }

  projectCatalog = projectCatalog.map((project, currentIndex) =>
    currentIndex === index ? upserted : project,
  );

  return upserted;
}
