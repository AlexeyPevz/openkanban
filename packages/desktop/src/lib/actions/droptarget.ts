import type { Action } from 'svelte/action';

export interface DropTargetOptions {
  status: string;
  onDrop: (taskId: string, status: string) => void;
}

export const droptarget: Action<HTMLElement, DropTargetOptions> = (
  node,
  opts,
) => {
  let currentOpts = opts;

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
    node.classList.add('drag-over');
  }

  function handleDragLeave() {
    node.classList.remove('drag-over');
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    node.classList.remove('drag-over');
    const taskId = e.dataTransfer?.getData('text/plain');
    if (taskId) {
      currentOpts.onDrop(taskId, currentOpts.status);
    }
  }

  node.setAttribute('aria-dropeffect', 'move');
  node.addEventListener('dragover', handleDragOver);
  node.addEventListener('dragleave', handleDragLeave);
  node.addEventListener('drop', handleDrop);

  return {
    update(newOpts: DropTargetOptions) {
      currentOpts = newOpts;
    },
    destroy() {
      node.removeEventListener('dragover', handleDragOver);
      node.removeEventListener('dragleave', handleDragLeave);
      node.removeEventListener('drop', handleDrop);
    },
  };
};
