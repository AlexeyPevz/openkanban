import { boardApi, taskApi, type BoardViewState } from '../rpc.js';
import type { TaskCard, CreateTaskInput, TaskPatch } from '@neon-tiger/core';

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
