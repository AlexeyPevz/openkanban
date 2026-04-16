<script module lang="ts">
  type DesktopStartupDeps = {
    loadCatalog: () => Promise<void>;
    initializeActiveProject: () => Promise<void>;
  };

  export async function initializeDesktopStartup({
    loadCatalog,
    initializeActiveProject,
  }: DesktopStartupDeps): Promise<void> {
    await loadCatalog();
    await initializeActiveProject();
  }
</script>

<script lang="ts">
  import Board from './lib/components/Board.svelte';
  import ProjectSidebar from './lib/components/ProjectSidebar.svelte';
  import ShortcutsHelp from './lib/components/ShortcutsHelp.svelte';
  import { listen } from '@tauri-apps/api/event';
  import { loadPreset, getThemeName, toggleTheme } from './lib/stores/theme.svelte.js';
  import { subscribeBoardChanged, subscribeTaskChanged } from './lib/stores/board.svelte.js';
  import { loadProjectCatalog } from './lib/stores/project-catalog.svelte.js';
  import { initializeActiveProject, handleLaunchDirectory } from './lib/stores/project.svelte.js';
  import { shortcuts } from './lib/actions/shortcuts.js';
  import { onMount } from 'svelte';

  let showShortcuts = $state(false);

  onMount(() => {
    loadPreset('opencode');
    void initializeDesktopStartup({
      loadCatalog: loadProjectCatalog,
      initializeActiveProject,
    });

    // Subscribe to live sync events from sidecar
    const boardUnlistenPromise = subscribeBoardChanged();
    const taskUnlistenPromise = subscribeTaskChanged();
    const launchUnlistenPromise = listen<string>('launch:directory', (event) => {
      void handleLaunchDirectory(event.payload);
    });

    return () => {
      // Cleanup: unlisten on unmount
      boardUnlistenPromise.then((unlisten) => unlisten());
      taskUnlistenPromise.then((unlisten) => unlisten());
      launchUnlistenPromise.then((unlisten) => unlisten());
    };
  });

  const globalKeymap = {
    '?': () => { showShortcuts = !showShortcuts; },
    t: () => { toggleTheme(); },
  };
</script>

<div id="app-root" use:shortcuts={globalKeymap}>
  <ProjectSidebar />
  <Board />

  {#if showShortcuts}
    <ShortcutsHelp onClose={() => { showShortcuts = false; }} />
  {/if}
</div>

<style>
  #app-root {
    height: 100vh;
    width: 100vw;
    display: flex;
  }
</style>
