<script lang="ts">
  import Column from './Column.svelte';
  import TaskDetails from './TaskDetails.svelte';
  import TaskForm from './TaskForm.svelte';
  import {
    getBoardState,
    loadBoard,
    getSelectedTaskId,
    getTasksByStatus,
  } from '../stores/board.svelte.js';
  import { discoverResources } from '../stores/resources.svelte.js';
  import { shortcuts } from '../actions/shortcuts.js';
  import { onMount } from 'svelte';

  let showForm = $state(false);
  let editTaskId = $state<string | null>(null);

  onMount(async () => {
    await Promise.all([loadBoard(), discoverResources()]);
  });

  function openNewTaskForm() {
    editTaskId = null;
    showForm = true;
  }

  function openEditForm(taskId: string) {
    editTaskId = taskId;
    showForm = true;
  }

  function closeForm() {
    showForm = false;
    editTaskId = null;
  }

  const keymap = {
    n: openNewTaskForm,
    Escape: closeForm,
  };
</script>

<div class="board" role="main" aria-label="Kanban Board" use:shortcuts={keymap}>
  {#if getBoardState().state === 'loading'}
    <div class="board-loading" aria-live="polite">Loading board...</div>
  {:else if getBoardState().state === 'empty'}
    <div class="board-empty" aria-live="polite">
      <p>No tasks found. Press <kbd>n</kbd> to create one.</p>
    </div>
  {:else if getBoardState().state === 'error'}
    <div class="board-error" role="alert">
      <p>Error: {getBoardState().message}</p>
      <button onclick={() => loadBoard()}>Retry</button>
    </div>
  {:else if getBoardState().state === 'success'}
    <div class="board-header">
      <h1>OpenKanban</h1>
      <button class="new-task-btn" onclick={openNewTaskForm}>+ New Task</button>
    </div>

    {#if getBoardState().diagnostics?.length}
      <div class="diagnostics" role="status">
        {#each getBoardState().diagnostics as diag}
          <p class="diagnostic">{diag}</p>
        {/each}
      </div>
    {/if}

    <div class="columns">
      {#each getBoardState().statuses as status}
        <Column
          {status}
          tasks={getTasksByStatus(status)}
          onEditTask={openEditForm}
        />
      {/each}
    </div>
  {/if}

  {#if getSelectedTaskId()}
    <TaskDetails />
  {/if}

  {#if showForm}
    <TaskForm taskId={editTaskId} onClose={closeForm} />
  {/if}
</div>

<style>
  .board {
    display: flex;
    flex-direction: column;
    height: 100vh;
    padding: 16px;
    gap: 16px;
  }

  .board-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .board-header h1 {
    font-size: 1.5rem;
    color: var(--kanban-text);
  }

  .new-task-btn {
    padding: 8px 16px;
    background: var(--kanban-accent);
    color: var(--kanban-bg);
    border: none;
    border-radius: var(--kanban-radius);
    cursor: pointer;
    font-weight: 600;
  }

  .new-task-btn:focus-visible {
    outline: 2px solid var(--kanban-accent);
    outline-offset: 2px;
  }

  .columns {
    display: flex;
    gap: 16px;
    flex: 1;
    overflow-x: auto;
  }

  .board-loading,
  .board-empty,
  .board-error {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    color: var(--kanban-text-secondary);
  }

  .board-error {
    color: var(--kanban-danger);
    flex-direction: column;
    gap: 8px;
  }

  .diagnostics {
    padding: 8px;
    background: var(--kanban-column-bg);
    border-radius: var(--kanban-radius);
  }

  .diagnostic {
    color: var(--kanban-text-secondary);
    font-size: 0.85rem;
  }
</style>
