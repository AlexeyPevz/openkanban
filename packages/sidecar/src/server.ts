import * as readline from 'node:readline';
import type { MethodRegistry } from './methods/index.js';
import { FileWatcher } from './watcher.js';
import { sendNotification } from './notifications.js';

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params: Record<string, unknown>;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number;
  result?: unknown;
  error?: { code: number; message: string };
}

export function createRpcDispatcher(
  methods: MethodRegistry,
): (request: JsonRpcRequest) => Promise<JsonRpcResponse> {
  return async (request) => {
    const handler = methods[request.method];
    if (!handler) {
      return {
        jsonrpc: '2.0',
        id: request.id,
        error: { code: -32601, message: `Method not found: ${request.method}` },
      };
    }

    try {
      const result = await handler(request.params);
      return { jsonrpc: '2.0', id: request.id, result };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        jsonrpc: '2.0',
        id: request.id,
        error: { code: -32603, message: `Internal error: ${message}` },
      };
    }
  };
}

export interface StartServerOptions {
  methods: MethodRegistry;
  projectDir?: string;
  watch?: boolean;
}

function isOptions(v: unknown): v is StartServerOptions {
  return v !== null && typeof v === 'object' && 'methods' in v
    && typeof (v as Record<string, unknown>)['methods'] === 'object'
    && (v as Record<string, unknown>)['methods'] !== null
    && !('jsonrpc' in (v as Record<string, unknown>));
}

export function startServer(input: MethodRegistry | StartServerOptions): void {
  let methods: MethodRegistry;
  let projectDir: string | undefined;
  let enableWatch: boolean | undefined;

  if (isOptions(input)) {
    methods = input.methods;
    projectDir = input.projectDir;
    enableWatch = input.watch;
  } else {
    methods = input;
  }
  const dispatch = createRpcDispatcher(methods);
  const rl = readline.createInterface({ input: process.stdin });

  // Start file watcher if projectDir is provided and watch is enabled
  let watcher: FileWatcher | undefined;
  if (projectDir && enableWatch !== false) {
    watcher = new FileWatcher({
      projectDir,
      onTaskChanged: (taskId, changeType) => {
        sendNotification('task.changed', { taskId, changeType });
      },
      onBoardChanged: () => {
        sendNotification('board.changed', {});
      },
    });
    watcher.start();
  }

  rl.on('line', async (line) => {
    try {
      const request = JSON.parse(line) as JsonRpcRequest;
      if (request.id === undefined) return; // notification, ignore
      const response = await dispatch(request);
      process.stdout.write(JSON.stringify(response) + '\n');
    } catch {
      const errorResponse: JsonRpcResponse = {
        jsonrpc: '2.0',
        id: 0,
        error: { code: -32700, message: 'Parse error' },
      };
      process.stdout.write(JSON.stringify(errorResponse) + '\n');
    }
  });

  // Graceful shutdown
  rl.on('close', async () => {
    if (watcher) {
      await watcher.stop();
    }
  });
}
