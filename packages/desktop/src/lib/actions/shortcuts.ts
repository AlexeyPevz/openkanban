import type { Action } from 'svelte/action';

export interface ShortcutMap {
  [key: string]: () => void;
}

export const shortcuts: Action<HTMLElement, ShortcutMap> = (node, keymap) => {
  let currentKeymap = keymap;

  function handler(e: KeyboardEvent) {
    const parts: string[] = [];
    if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
    if (e.shiftKey) parts.push('Shift');
    if (e.altKey) parts.push('Alt');
    parts.push(e.key);
    const combo = parts.join('+');

    const action = currentKeymap[combo] ?? currentKeymap[e.key];
    if (action) {
      e.preventDefault();
      action();
    }
  }

  node.addEventListener('keydown', handler);

  return {
    update(newKeymap: ShortcutMap) {
      currentKeymap = newKeymap;
    },
    destroy() {
      node.removeEventListener('keydown', handler);
    },
  };
};
