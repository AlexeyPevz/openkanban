import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRpcDispatcher } from '@neon-tiger/sidecar';

describe('JSON-RPC dispatcher', () => {
  it('dispatches to registered method', async () => {
    const handler = vi.fn().mockResolvedValue({ board: 'loaded' });
    const dispatcher = createRpcDispatcher({ 'board.load': handler });

    const request = {
      jsonrpc: '2.0' as const,
      id: 1,
      method: 'board.load',
      params: { dir: '/tmp' },
    };

    const response = await dispatcher(request);
    expect(response).toEqual({
      jsonrpc: '2.0',
      id: 1,
      result: { board: 'loaded' },
    });
    expect(handler).toHaveBeenCalledWith({ dir: '/tmp' });
  });

  it('returns method-not-found error for unknown method', async () => {
    const dispatcher = createRpcDispatcher({});
    const request = {
      jsonrpc: '2.0' as const,
      id: 2,
      method: 'unknown.method',
      params: {},
    };

    const response = await dispatcher(request);
    expect(response).toEqual({
      jsonrpc: '2.0',
      id: 2,
      error: { code: -32601, message: 'Method not found: unknown.method' },
    });
  });

  it('returns internal error when handler throws', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('boom'));
    const dispatcher = createRpcDispatcher({ 'task.get': handler });

    const response = await dispatcher({
      jsonrpc: '2.0' as const,
      id: 3,
      method: 'task.get',
      params: { id: 'x' },
    });

    expect(response.error?.code).toBe(-32603);
    expect(response.error?.message).toContain('boom');
  });
});
