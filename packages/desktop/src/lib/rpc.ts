import { invoke } from '@tauri-apps/api/core';
import type {
  TaskCard,
  CreateTaskInput,
  TaskPatch,
  ResourceRecord,
} from '@openkanban/core';

export interface RpcError {
  code: number;
  message: string;
}

export type RpcResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: RpcError };

export async function rpcCall<T>(
  method: string,
  params: Record<string, unknown> = {},
): Promise<RpcResult<T>> {
  try {
    const result = await invoke<T>('rpc_call', { method, params });
    return { ok: true, data: result };
  } catch (e) {
    return {
      ok: false,
      error: { code: -1, message: String(e) },
    };
  }
}

export interface BoardViewStateSuccess {
  state: 'success';
  tasks: TaskCard[];
  statuses: string[];
  diagnostics: string[];
}

export type BoardViewState =
  | { state: 'loading' }
  | { state: 'empty'; message: string }
  | { state: 'error'; message: string }
  | BoardViewStateSuccess;

export const boardApi = {
  load: () => rpcCall<BoardViewState>('board.load'),
};

export const taskApi = {
  get: (id: string) => rpcCall<TaskCard>('task.get', { id }),
  create: (input: CreateTaskInput) =>
    rpcCall<TaskCard>('task.create', input as unknown as Record<string, unknown>),
  move: (id: string, status: string) =>
    rpcCall<TaskCard>('task.move', { id, status }),
  update: (id: string, patch: TaskPatch) =>
    rpcCall<TaskCard>('task.update', { id, ...patch } as Record<string, unknown>),
  list: () => rpcCall<TaskCard[]>('task.list'),
};

export const resourceApi = {
  discover: () => rpcCall<ResourceRecord[]>('resources.discover'),
  list: () => rpcCall<ResourceRecord[]>('resources.list'),
};
