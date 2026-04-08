import type { Action } from 'svelte/action';

export const draggable: Action<HTMLElement, string> = (node, taskId) => {
  function handleDragStart(e: DragEvent) {
    if (e.dataTransfer) {
      e.dataTransfer.setData('text/plain', taskId);
      e.dataTransfer.effectAllowed = 'move';
    }
    node.classList.add('dragging');
    node.setAttribute('aria-grabbed', 'true');
  }

  function handleDragEnd() {
    node.classList.remove('dragging');
    node.setAttribute('aria-grabbed', 'false');
  }

  node.draggable = true;
  node.setAttribute('aria-grabbed', 'false');
  node.addEventListener('dragstart', handleDragStart);
  node.addEventListener('dragend', handleDragEnd);

  return {
    update(newTaskId: string) {
      taskId = newTaskId;
    },
    destroy() {
      node.removeEventListener('dragstart', handleDragStart);
      node.removeEventListener('dragend', handleDragEnd);
    },
  };
};
