<script lang="ts">
  import { getSelectedTask, selectTask } from '../stores/board.svelte.js';
  import { getTaskResources } from '../task-resources.js';

  let task = $derived(getSelectedTask());
  let resources = $derived(task ? getTaskResources(task) : []);

  let closeBtn: HTMLButtonElement;

  // Auto-focus close button when task panel opens
  $effect(() => {
    if (task) closeBtn?.focus();
  });

  function close() {
    selectTask(null);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') close();
  }
</script>

{#if task}
  <aside
    class="details-panel"
    role="complementary"
    aria-label="Task details: {task.title}"
    onkeydown={handleKeydown}
  >
    <div class="details-header">
      <h2>{task.title}</h2>
      <button class="close-btn" bind:this={closeBtn} onclick={close} aria-label="Close details">×</button>
    </div>

    <div class="details-body">
      <div class="field">
        <label>Status</label>
        <span class="status-badge">{task.status}</span>
      </div>

      {#if task.priority}
        <div class="field">
          <label>Priority</label>
          <span>{task.priority}</span>
        </div>
      {/if}

      {#if task.description}
        <div class="field">
          <label>Description</label>
          <p>{task.description}</p>
        </div>
      {/if}

      {#if task.blocked_reason}
        <div class="field blocked">
          <label>Blocked</label>
          <p>{task.blocked_reason}</p>
        </div>
      {/if}

      {#if resources.length > 0}
        <div class="field">
          <label>Resources</label>
          <div class="resource-list">
            {#each resources as res}
              <span class="resource-tag">
                <span class="kind">{res.kind}</span>: {res.name}
                {#if res.required}<span class="required">*</span>{/if}
              </span>
            {/each}
          </div>
        </div>
      {/if}

      {#if task.source_file}
        <div class="field">
          <label>Source</label>
          <code>{task.source_file}</code>
        </div>
      {/if}

      {#if task.artifacts?.length}
        <div class="field">
          <label>Artifacts</label>
          <ul>
            {#each task.artifacts as artifact}
              <li>{artifact}</li>
            {/each}
          </ul>
        </div>
      {/if}
    </div>
  </aside>
{/if}

<style>
  .details-panel {
    position: fixed;
    top: 0;
    right: 0;
    width: 400px;
    height: 100vh;
    background: var(--kanban-column-bg);
    border-left: 1px solid var(--kanban-card-border);
    padding: 24px;
    overflow-y: auto;
    z-index: 100;
    box-shadow: -4px 0 16px rgba(0, 0, 0, 0.3);
  }

  .details-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
  }

  .details-header h2 {
    font-size: 1.2rem;
    color: var(--kanban-text);
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    color: var(--kanban-text-secondary);
    cursor: pointer;
  }

  .close-btn:focus-visible {
    outline: 2px solid var(--kanban-accent);
    outline-offset: 2px;
  }

  .field {
    margin-bottom: 16px;
  }

  .field label {
    display: block;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--kanban-text-secondary);
    margin-bottom: 4px;
  }

  .status-badge {
    padding: 4px 8px;
    background: var(--kanban-accent);
    color: var(--kanban-bg);
    border-radius: 4px;
    font-size: 0.8rem;
  }

  .blocked {
    color: var(--kanban-danger);
  }

  .resource-list {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .resource-tag {
    font-size: 0.8rem;
    padding: 2px 8px;
    background: var(--kanban-card-bg);
    border-radius: 4px;
  }

  .kind {
    color: var(--kanban-accent);
  }

  .required {
    color: var(--kanban-danger);
  }

  code {
    font-size: 0.8rem;
    color: var(--kanban-accent);
  }
</style>
