<script lang="ts">
  import Card from './Card.svelte';
  import { droptarget } from '../actions/droptarget.js';
  import { moveTask } from '../stores/board.svelte.js';
  import type { TaskCard } from '@openkanban/core';

  interface Props {
    status: string;
    tasks: TaskCard[];
    onEditTask: (taskId: string) => void;
  }

  let { status, tasks, onEditTask }: Props = $props();

  async function handleDrop(taskId: string, targetStatus: string) {
    await moveTask(taskId, targetStatus);
  }
</script>

<section
  class="column"

  aria-label="{status} column"
  use:droptarget={{ status, onDrop: handleDrop }}
>
  <header class="column-header">
    <h2>{status}</h2>
    <span class="count">{tasks.length}</span>
  </header>

  <div class="card-list">
    {#if tasks.length === 0}
      <p class="empty-message">No tasks</p>
    {:else}
      {#each tasks as task (task.id)}
        <Card {task} {onEditTask} />
      {/each}
    {/if}
  </div>
</section>

<style>
  .column {
    display: flex;
    flex-direction: column;
    min-width: 280px;
    max-width: 320px;
    background: var(--kanban-column-bg);
    border-radius: var(--kanban-radius);
    padding: 12px;
    gap: 8px;
  }

  .column-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--kanban-card-border);
  }

  .column-header h2 {
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--kanban-text-secondary);
  }

  .count {
    background: var(--kanban-card-bg);
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.8rem;
    color: var(--kanban-text-secondary);
  }

  .card-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
  }

  .empty-message {
    color: var(--kanban-text-secondary);
    text-align: center;
    padding: 24px 0;
    font-size: 0.85rem;
  }

  :global(.column.drag-over) {
    outline: 2px dashed var(--kanban-accent);
    outline-offset: -2px;
  }
</style>
