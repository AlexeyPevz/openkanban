import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @tauri-apps/api/core
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import { rpcCall, boardApi, taskApi, resourceApi, projectApi } from '../../packages/desktop/src/lib/rpc.js';

const mockInvoke = vi.mocked(invoke);

describe('rpcCall', () => {
  beforeEach(() => {
    mockInvoke.mockReset();
  });

  it('returns ok result on success', async () => {
    mockInvoke.mockResolvedValueOnce({ tasks: [] });
    const result = await rpcCall('board.load');
    expect(result).toEqual({ ok: true, data: { tasks: [] } });
    expect(mockInvoke).toHaveBeenCalledWith('rpc_call', {
      method: 'board.load',
      params: {},
    });
  });

  it('returns error result on failure', async () => {
    mockInvoke.mockRejectedValueOnce(new Error('connection lost'));
    const result = await rpcCall('board.load');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('connection lost');
    }
  });

  it('passes params to invoke', async () => {
    mockInvoke.mockResolvedValueOnce({});
    await rpcCall('task.get', { id: 'abc' });
    expect(mockInvoke).toHaveBeenCalledWith('rpc_call', {
      method: 'task.get',
      params: { id: 'abc' },
    });
  });
});

describe('API wrappers', () => {
  beforeEach(() => {
    mockInvoke.mockReset();
    mockInvoke.mockResolvedValue({});
  });

  it('boardApi.load calls board.load', async () => {
    await boardApi.load();
    expect(mockInvoke).toHaveBeenCalledWith('rpc_call', {
      method: 'board.load',
      params: {},
    });
  });

  it('taskApi.move calls task.move with id and status', async () => {
    await taskApi.move('t1', 'done');
    expect(mockInvoke).toHaveBeenCalledWith('rpc_call', {
      method: 'task.move',
      params: { id: 't1', status: 'done' },
    });
  });

  it('resourceApi.discover calls resources.discover', async () => {
    await resourceApi.discover();
    expect(mockInvoke).toHaveBeenCalledWith('rpc_call', {
      method: 'resources.discover',
      params: {},
    });
  });

  it('projectApi.current calls project.current', async () => {
    await projectApi.current();
    expect(mockInvoke).toHaveBeenCalledWith('rpc_call', {
      method: 'project.current',
      params: {},
    });
  });

  it('projectApi.rebind calls project.rebind with directory', async () => {
    await projectApi.rebind('/tmp/next-project');
    expect(mockInvoke).toHaveBeenCalledWith('rpc_call', {
      method: 'project.rebind',
      params: { directory: '/tmp/next-project' },
    });
  });
});
