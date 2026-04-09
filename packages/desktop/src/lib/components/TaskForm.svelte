<script lang="ts">
  import {
    createTask,
    updateTask,
    getBoardState,
  } from '../stores/board.svelte.js';
  import { getResources } from '../stores/resources.svelte.js';
  import { onMount } from 'svelte';
  import type { ResourceAssignment } from '@openkanban/core';

  interface Props {
    taskId: string | null;
    onClose: () => void;
  }

  let { taskId, onClose }: Props = $props();

  let formEl: HTMLFormElement;

  let existingTask = $derived(
    taskId && getBoardState().state === 'success'
      ? getBoardState().tasks.find((t) => t.id === taskId) ?? null
      : null,
  );

  let title = $state('');
  let description = $state('');
  let status = $state('planned');
  let priority = $state('');
  let selectedResources = $state<ResourceAssignment[]>([]);

  // Initialize form values from existing task (for edit mode)
  $effect(() => {
    if (existingTask) {
      title = existingTask.title;
      description = existingTask.description ?? '';
      status = existingTask.status;
      priority = existingTask.priority ?? '';
      selectedResources = existingTask.resources ?? [];
    }
  });

  let statuses = $derived(
    getBoardState().state === 'success' ? getBoardState().statuses : ['planned'],
  );

  let isEdit = $derived(!!taskId && !!existingTask);

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!title.trim()) return;

    if (isEdit && taskId) {
      await updateTask(taskId, {
        title,
        description: description || undefined,
        priority: (priority || undefined) as 'low' | 'medium' | 'high' | undefined,
        resources: selectedResources.length > 0 ? selectedResources : undefined,
      });
    } else {
      await createTask({
        title,
        status: status as any,
        description: description || undefined,
        priority: (priority || undefined) as 'low' | 'medium' | 'high' | undefined,
        resources: selectedResources.length > 0 ? selectedResources : undefined,
      });
    }
    onClose();
  }

  function toggleResource(kind: string, name: string) {
    const idx = selectedResources.findIndex(
      (r) => r.kind === kind && r.name === name,
    );
    if (idx >= 0) {
      selectedResources = selectedResources.filter((_, i) => i !== idx);
    } else {
      selectedResources = [
        ...selectedResources,
        { kind: kind as ResourceAssignment['kind'], name, required: true },
      ];
    }
  }

  function isResourceSelected(kind: string, name: string): boolean {
    return selectedResources.some((r) => r.kind === kind && r.name === name);
  }

  onMount(() => {
    if (!formEl) return;

    const focusableSelector =
      'input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const getFocusable = () =>
      Array.from(formEl.querySelectorAll<HTMLElement>(focusableSelector));

    // Focus first input on mount
    const focusable = getFocusable();
    if (focusable.length > 0) {
      focusable[0].focus();
    }

    function handleKeydown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;

      const items = getFocusable();
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    formEl.addEventListener('keydown', handleKeydown);
    return () => formEl.removeEventListener('keydown', handleKeydown);
  });
</script>

<div
  class="form-overlay"
  onclick={onClose}
  onkeydown={(e) => e.key === 'Escape' && onClose()}
  role="dialog"
  aria-label="{isEdit ? 'Edit' : 'Create'} task"
>
  <form class="task-form" bind:this={formEl} onclick={(e) => e.stopPropagation()} onsubmit={handleSubmit}>
    <h2>{isEdit ? 'Edit Task' : 'New Task'}</h2>

    <div class="form-field">
      <label for="title">Title</label>
      <input id="title" type="text" bind:value={title} required autofocus />
    </div>

    <div class="form-field">
      <label for="description">Description</label>
      <textarea id="description" bind:value={description} rows="3"></textarea>
    </div>

    {#if !isEdit}
      <div class="form-field">
        <label for="status">Status</label>
        <select id="status" bind:value={status}>
          {#each statuses as s}
            <option value={s}>{s}</option>
          {/each}
        </select>
      </div>
    {/if}

    <div class="form-field">
      <label for="priority">Priority</label>
      <select id="priority" bind:value={priority}>
        <option value="">None</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>
    </div>

    {#if getResources().length > 0}
      <div class="form-field">
        <label>Resources</label>
        <div class="resource-checkboxes">
          {#each getResources() as res}
            <label class="resource-check">
              <input
                type="checkbox"
                checked={isResourceSelected(res.kind, res.name)}
                onchange={() => toggleResource(res.kind, res.name)}
              />
              <span class="kind">{res.kind}</span>: {res.name}
            </label>
          {/each}
        </div>
      </div>
    {/if}

    <div class="form-actions">
      <button type="button" class="cancel-btn" onclick={onClose}>Cancel</button>
      <button type="submit" class="submit-btn">
        {isEdit ? 'Save' : 'Create'}
      </button>
    </div>
  </form>
</div>

<style>
  .form-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 200;
  }

  .task-form {
    background: var(--kanban-column-bg);
    border-radius: var(--kanban-radius);
    padding: 24px;
    width: 480px;
    max-height: 80vh;
    overflow-y: auto;
  }

  .task-form h2 {
    color: var(--kanban-text);
    margin-bottom: 16px;
  }

  .form-field {
    margin-bottom: 16px;
  }

  .form-field label {
    display: block;
    font-size: 0.8rem;
    color: var(--kanban-text-secondary);
    margin-bottom: 4px;
  }

  .form-field input,
  .form-field textarea,
  .form-field select {
    width: 100%;
    padding: 8px;
    background: var(--kanban-card-bg);
    border: 1px solid var(--kanban-card-border);
    border-radius: 4px;
    color: var(--kanban-text);
    font-size: 0.9rem;
  }

  .form-field input:focus,
  .form-field textarea:focus,
  .form-field select:focus {
    outline: 2px solid var(--kanban-accent);
    outline-offset: -1px;
  }

  .resource-checkboxes {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .resource-check {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.85rem;
    color: var(--kanban-text);
    cursor: pointer;
  }

  .kind {
    color: var(--kanban-accent);
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 24px;
  }

  .cancel-btn {
    padding: 8px 16px;
    background: transparent;
    border: 1px solid var(--kanban-card-border);
    border-radius: 4px;
    color: var(--kanban-text-secondary);
    cursor: pointer;
  }

  .submit-btn {
    padding: 8px 16px;
    background: var(--kanban-accent);
    color: var(--kanban-bg);
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 600;
  }

  .cancel-btn:focus-visible,
  .submit-btn:focus-visible {
    outline: 2px solid var(--kanban-accent);
    outline-offset: 2px;
  }
</style>
