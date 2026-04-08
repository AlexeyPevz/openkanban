<script lang="ts">
  interface Props {
    onClose: () => void;
  }

  let { onClose }: Props = $props();

  const shortcutsList = [
    { key: 'n', description: 'New task' },
    { key: 'e', description: 'Edit selected task' },
    { key: 'Escape', description: 'Close panel / form' },
    { key: '?', description: 'Toggle shortcuts help' },
    { key: '/', description: 'Search tasks' },
    { key: 'j', description: 'Next card' },
    { key: 'k', description: 'Previous card' },
    { key: 'Ctrl+z', description: 'Undo last action' },
  ];
</script>

<div
  class="shortcuts-overlay"
  onclick={onClose}
  onkeydown={(e) => e.key === 'Escape' && onClose()}
  role="dialog"
  aria-label="Keyboard shortcuts"
>
  <div class="shortcuts-panel" onclick={(e) => e.stopPropagation()}>
    <h2>Keyboard Shortcuts</h2>
    <div class="shortcuts-list">
      {#each shortcutsList as shortcut}
        <div class="shortcut-row">
          <kbd>{shortcut.key}</kbd>
          <span>{shortcut.description}</span>
        </div>
      {/each}
    </div>
    <button onclick={onClose}>Close</button>
  </div>
</div>

<style>
  .shortcuts-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 300;
  }

  .shortcuts-panel {
    background: var(--kanban-column-bg);
    border-radius: var(--kanban-radius);
    padding: 24px;
    min-width: 320px;
  }

  .shortcuts-panel h2 {
    margin-bottom: 16px;
    color: var(--kanban-text);
  }

  .shortcuts-list {
    display: flex;
    flex-direction: column;
  }

  .shortcut-row {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid var(--kanban-card-border);
    color: var(--kanban-text);
  }

  kbd {
    background: var(--kanban-card-bg);
    padding: 2px 8px;
    border-radius: 4px;
    font-family: monospace;
    font-size: 0.85rem;
    color: var(--kanban-accent);
  }

  button {
    margin-top: 16px;
    padding: 8px 16px;
    background: var(--kanban-accent);
    color: var(--kanban-bg);
    border: none;
    border-radius: var(--kanban-radius);
    cursor: pointer;
    width: 100%;
  }
</style>
