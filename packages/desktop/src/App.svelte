<script lang="ts">
  import Board from './lib/components/Board.svelte';
  import ShortcutsHelp from './lib/components/ShortcutsHelp.svelte';
  import { loadPreset, getThemeName, toggleTheme } from './lib/stores/theme.svelte.js';
  import { shortcuts } from './lib/actions/shortcuts.js';
  import { onMount } from 'svelte';

  let showShortcuts = $state(false);

  onMount(() => {
    loadPreset('opencode');
  });

  const globalKeymap = {
    '?': () => { showShortcuts = !showShortcuts; },
    t: () => { toggleTheme(); },
  };
</script>

<div id="app-root" use:shortcuts={globalKeymap}>
  <Board />

  {#if showShortcuts}
    <ShortcutsHelp onClose={() => { showShortcuts = false; }} />
  {/if}
</div>

<style>
  #app-root {
    height: 100vh;
    width: 100vw;
  }
</style>
