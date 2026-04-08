<script lang="ts">
  import { draggable } from '../actions/draggable.js';
  import { selectTask } from '../stores/board.svelte.js';
  import { getTaskResources } from '@neon-tiger/core';
  import type { TaskCard } from '@neon-tiger/core';

  interface Props {
    task: TaskCard;
    onEditTask: (taskId: string) => void;
  }

  let { task, onEditTask }: Props = $props();
  let resources = $derived(getTaskResources(task));
</script>

<article
  class="card"
  class:blocked={!!task.blocked_reason}
  role="listitem"
  aria-label="Task: {task.title}"
  use:draggable={task.id}
  onclick={() => selectTask(task.id)}
  onkeydown={(e) => e.key === 'Enter' && selectTask(task.id)}
  tabindex="0"
>
  <div class="card-header">
    <h3 class="card-title">{task.title}</h3>
    {#if task.priority}
      <span class="priority priority-{task.priority}">{task.priority}</span>
    {/if}
  </div>

  {#if task.blocked_reason}
    <p class="blocked-reason">Blocked: {task.blocked_reason}</p>
  {/if}

  {#if resources.length > 0}
    <div class="resources">
      {#each resources as res}
        <span class="resource-badge resource-{res.kind}" title="{res.kind}: {res.name}">
          {res.name}
        </span>
      {/each}
    </div>
  {/if}

  <div class="card-actions">
    <button
      class="edit-btn"
      onclick={(e) => { e.stopPropagation(); onEditTask(task.id); }}
      aria-label="Edit task {task.title}"
    >
      Edit
    </button>
  </div>
</article>

<style>
  .card {
    background: var(--kanban-card-bg);
    border: 1px solid var(--kanban-card-border);
    border-radius: var(--kanban-radius);
    padding: 12px;
    cursor: grab;
    transition: box-shadow 0.15s ease;
  }

  .card:hover {
    box-shadow: var(--kanban-shadow);
  }

  .card:focus-visible {
    outline: 2px solid var(--kanban-accent);
    outline-offset: 2px;
  }

  .card.blocked {
    border-left: 3px solid var(--kanban-danger);
  }

  :global(.card.dragging) {
    opacity: 0.5;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 8px;
  }

  .card-title {
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--kanban-text);
  }

  .priority {
    font-size: 0.7rem;
    padding: 2px 6px;
    border-radius: 4px;
    text-transform: uppercase;
  }

  .priority-high {
    background: var(--kanban-danger);
    color: var(--kanban-bg);
  }

  .priority-medium {
    background: var(--kanban-accent);
    color: var(--kanban-bg);
  }

  .priority-low {
    color: var(--kanban-text-secondary);
  }

  .blocked-reason {
    font-size: 0.8rem;
    color: var(--kanban-danger);
    margin-top: 4px;
  }

  .resources {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 8px;
  }

  .resource-badge {
    font-size: 0.7rem;
    padding: 2px 6px;
    border-radius: 4px;
    background: var(--kanban-column-bg);
    color: var(--kanban-text-secondary);
  }

  .resource-agent {
    border-left: 2px solid var(--kanban-accent);
  }

  .resource-skill {
    border-left: 2px solid var(--kanban-success);
  }

  .resource-mcp {
    border-left: 2px solid #bb9af7;
  }

  .resource-tool {
    border-left: 2px solid #e0af68;
  }

  .card-actions {
    margin-top: 8px;
    display: flex;
    justify-content: flex-end;
  }

  .edit-btn {
    font-size: 0.75rem;
    padding: 4px 8px;
    background: transparent;
    border: 1px solid var(--kanban-card-border);
    border-radius: 4px;
    color: var(--kanban-text-secondary);
    cursor: pointer;
  }

  .edit-btn:hover {
    color: var(--kanban-text);
    border-color: var(--kanban-accent);
  }
</style>
