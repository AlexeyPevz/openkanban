<script lang="ts">
  import { openAddProjectDialog } from '../project-picker.js';
  import { validateProjectPath } from '../catalog.js';
  import { switchProject } from '../stores/project.svelte.js';
  import {
    addProjectToPicker,
    completeSwitch,
    failSwitch,
    getVisibleProjects,
    getProjectPickerState,
    setShowUnavailable,
    openProjectFromSidebar,
  } from '../stores/project-picker.svelte.js';

  async function performSwitch(projectPath: string): Promise<void> {
    openProjectFromSidebar(projectPath);

    if (getProjectPickerState().mode !== 'switching') {
      return;
    }

    const result = await switchProject(projectPath);
    if (result.ok) {
      completeSwitch(projectPath);
      return;
    }

    failSwitch(result.error);
  }

  function handleProjectClick(projectPath: string): void {
    void performSwitch(projectPath);
  }

  function handleToggleUnavailable(event: Event): void {
    const target = event.target as HTMLInputElement;
    setShowUnavailable(target.checked);
  }

  async function handleOpenAddProject(): Promise<void> {
    const result = await openAddProjectDialog({
      validateProject: validateProjectPath,
    });

    if (result.kind !== 'added') {
      return;
    }

    addProjectToPicker({
      projectPath: result.projectPath,
      name: result.projectPath.replace(/\\/g, '/').split('/').filter(Boolean).pop() ?? result.projectPath,
      lastOpenedAt: null,
      source: 'opened',
      isAvailable: true,
    });
    await performSwitch(result.projectPath);
  }
</script>

<aside class="project-sidebar" aria-label="Projects">
  <h2 class="sidebar-heading">Projects</h2>

  <button class="add-project-btn" type="button" onclick={handleOpenAddProject}>
    Open/Add project...
  </button>

  <label class="toggle-unavailable">
    <input
      type="checkbox"
      checked={getProjectPickerState().showUnavailable}
      onchange={handleToggleUnavailable}
    />
    Show unavailable
  </label>

  <div class="project-list" role="list">
    {#each getVisibleProjects() as project (project.projectPath)}
      {@const isActive = project.projectPath === getProjectPickerState().activeProjectPath}
      <div class="project-list-item" role="listitem">
        <button
          class="project-row"
          class:active={isActive}
          class:unavailable={!project.isAvailable}
          type="button"
          aria-current={isActive ? 'true' : undefined}
          aria-disabled={!project.isAvailable ? 'true' : undefined}
          aria-label={project.name}
          onclick={() => handleProjectClick(project.projectPath)}
        >
          <span class="project-icon">{project.name.charAt(0).toUpperCase()}</span>
          <span class="project-name">{project.name}</span>
        </button>
      </div>
    {/each}
  </div>
</aside>

<style>
  .project-sidebar {
    display: flex;
    flex-direction: column;
    width: 220px;
    min-width: 220px;
    height: 100%;
    border-right: 1px solid var(--kanban-border, #e0e0e0);
    background: var(--kanban-column-bg, #f5f5f5);
    padding: 12px;
    gap: 8px;
    overflow-y: auto;
  }

  .sidebar-heading {
    font-size: 1rem;
    font-weight: 600;
    color: var(--kanban-text, #333);
    margin: 0;
  }

  .add-project-btn {
    padding: 6px 10px;
    background: var(--kanban-accent, #4a90d9);
    color: var(--kanban-bg, #fff);
    border: none;
    border-radius: var(--kanban-radius, 4px);
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 500;
    text-align: left;
  }

  .add-project-btn:focus-visible {
    outline: 2px solid var(--kanban-accent, #4a90d9);
    outline-offset: 2px;
  }

  .toggle-unavailable {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.8rem;
    color: var(--kanban-text-secondary, #666);
    cursor: pointer;
  }

  .project-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .project-list-item {
    display: flex;
  }

  .project-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border: none;
    border-radius: var(--kanban-radius, 4px);
    background: transparent;
    cursor: pointer;
    text-align: left;
    color: var(--kanban-text, #333);
    font-size: 0.85rem;
  }

  .project-row:hover {
    background: var(--kanban-card-bg, #e8e8e8);
  }

  .project-row:focus-visible {
    outline: 2px solid var(--kanban-accent, #4a90d9);
    outline-offset: -2px;
  }

  .project-row.active {
    background: var(--kanban-accent, #4a90d9);
    color: var(--kanban-bg, #fff);
  }

  .project-row.unavailable {
    opacity: 0.6;
  }

  .project-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 4px;
    background: var(--kanban-border, #ccc);
    font-weight: 600;
    font-size: 0.75rem;
    flex-shrink: 0;
  }

  .project-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
