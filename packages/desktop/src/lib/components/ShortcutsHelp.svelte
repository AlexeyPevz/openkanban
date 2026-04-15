<script lang="ts">
  import { onMount } from 'svelte';

  interface Props {
    onClose: () => void;
  }

  let { onClose }: Props = $props();

  let panelEl: HTMLDivElement;

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

  onMount(() => {
    if (!panelEl) return;

    const focusableSelector =
      'button:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const getFocusable = () =>
      Array.from(panelEl.querySelectorAll<HTMLElement>(focusableSelector));

    // Focus the Close button on mount
    const focusable = getFocusable();
    if (focusable.length > 0) {
      focusable[focusable.length - 1].focus(); // Close button is last
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

    panelEl.addEventListener('keydown', handleKeydown);
    return () => panelEl.removeEventListener('keydown', handleKeydown);
  });
</script>

<div
  class="shortcuts-overlay"
  onclick={(e) => { if (e.target === e.currentTarget) onClose(); }}
  onkeydown={(e) => e.key === 'Escape' && onClose()}
  role="dialog"
  tabindex="-1"
  aria-label="Keyboard shortcuts"
>
  <div class="shortcuts-panel" bind:this={panelEl} role="document">
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

  button:focus-visible {
    outline: 2px solid var(--kanban-accent);
    outline-offset: 2px;
  }
</style>
