export { createRpcDispatcher, startServer } from './server.js';
export type { JsonRpcRequest, JsonRpcResponse, StartServerOptions } from './server.js';
export type { RpcHandler, MethodRegistry } from './methods/index.js';
export { sendNotification } from './notifications.js';
export { createBoardMethods } from './methods/board.js';
export { createTaskMethods } from './methods/task.js';
export { createResourceMethods } from './methods/resources.js';
export { discoverResources } from './discovery/discover-resources.js';
export { FileWatcher } from './watcher.js';
export type { FileWatcherOptions } from './watcher.js';

// CLI entry point — run sidecar server when executed directly
import { startServer } from './server.js';
import { createBoardMethods } from './methods/board.js';
import { createTaskMethods } from './methods/task.js';
import { createResourceMethods } from './methods/resources.js';

if (process.argv[1] === import.meta.filename) {
  const projectDir = process.cwd();

  const methods = {
    ...createBoardMethods(projectDir),
    ...createTaskMethods(projectDir),
    ...createResourceMethods(projectDir),
  };

  startServer({ methods, projectDir, watch: true });
}
