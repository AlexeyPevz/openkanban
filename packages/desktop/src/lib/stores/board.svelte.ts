import { boardApi, taskApi, type BoardViewState } from '../rpc.js';
import { listen } from '@tauri-apps/api/event';
import type { TaskCard, CreateTaskInput, TaskPatch } from '@openkanban/core';

let boardState = $state<BoardViewState>({ state: 'loading' });
let selectedTaskId = $state<string | null>(null);

export function getBoardState(): BoardViewState {
  return boardState;
}

export function getSelectedTaskId(): string | null {
  return selectedTaskId;
}

export function selectTask(id: string | null): void {
  selectedTaskId = id;
}

export async function loadBoard(): Promise<void> {
  boardState = { state: 'loading' };
  const result = await boardApi.load();
  if (result.ok) {
    boardState = result.data;
  } else {
    boardState = { state: 'error', message: result.error.message };
  }
}

export async function moveTask(id: string, status: string): Promise<boolean> {
  const result = await taskApi.move(id, status);
  if (result.ok) {
    await loadBoard();
    return true;
  }
  return false;
}

export async function createTask(input: CreateTaskInput): Promise<boolean> {
  const result = await taskApi.create(input);
  if (result.ok) {
    await loadBoard();
    return true;
  }
  return false;
}

export async function updateTask(
  id: string,
  patch: TaskPatch,
): Promise<boolean> {
  const result = await taskApi.update(id, patch);
  if (result.ok) {
    await loadBoard();
    return true;
  }
  return false;
}

export function getSelectedTask(): TaskCard | null {
  if (!selectedTaskId || boardState.state !== 'success') return null;
  return boardState.tasks.find((t) => t.id === selectedTaskId) ?? null;
}

export function getTasksByStatus(status: string): TaskCard[] {
  if (boardState.state !== 'success') return [];
  return boardState.tasks.filter((t) => t.status === status);
}

/** Subscribe to sidecar:board.changed Tauri event. Returns unlisten cleanup function. */
export async function subscribeBoardChanged(): Promise<() => void> {
  const unlisten = await listen('sidecar:board.changed', () => {
    loadBoard();
  });
  return unlisten;
}

/** Subscribe to sidecar:task.changed Tauri event. Returns unlisten cleanup function. */
export async function subscribeTaskChanged(): Promise<() => void> {
  const unlisten = await listen<{ taskId: string; changeType: string }>(
    'sidecar:task.changed',
    async (event) => {
      const { taskId, changeType } = event.payload;

      if (changeType === 'added' || changeType === 'removed') {
        loadBoard();
        return;
      }

      // changeType === 'changed' → attempt partial refresh
      if (boardState.state !== 'success') {
        loadBoard();
        return;
      }

      const result = await taskApi.get(taskId);
      if (!result.ok) {
        loadBoard();
        return;
      }

      const idx = boardState.tasks.findIndex((t) => t.id === taskId);
      if (idx === -1) {
        loadBoard();
        return;
      }

      // Merge: replace the task in place
      const updatedTasks = [...boardState.tasks];
      updatedTasks[idx] = result.data;
      boardState = { ...boardState, tasks: updatedTasks };
    },
  );
  return unlisten;
}
