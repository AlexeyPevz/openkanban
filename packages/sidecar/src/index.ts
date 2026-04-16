export { createRpcDispatcher, startServer } from './server.js';
export type { JsonRpcRequest, JsonRpcResponse, StartServerOptions } from './server.js';
export type { RpcHandler, MethodRegistry } from './methods/index.js';
export { sendNotification } from './notifications.js';
export { createBoardMethods } from './methods/board.js';
export { createTaskMethods } from './methods/task.js';
export { createResourceMethods } from './methods/resources.js';
export { createProjectMethods } from './methods/project.js';
export type { CreateProjectMethodsDeps } from './methods/project.js';
export { discoverResources } from './discovery/discover-resources.js';
export { FileWatcher } from './watcher.js';
export type { FileWatcherOptions } from './watcher.js';
export {
  createProjectRuntime,
  getProjectRoot,
  resolveInitialProjectRoot,
} from './runtime.js';
export type {
  ProjectRuntime,
  ProjectRootInput,
  InitialProjectRootOptions,
} from './runtime.js';

// CLI entry point — run sidecar server when executed directly
import { startServer } from './server.js';
import { createBoardMethods } from './methods/board.js';
import { createTaskMethods } from './methods/task.js';
import { createResourceMethods } from './methods/resources.js';
import { createProjectRuntime, resolveInitialProjectRoot } from './runtime.js';

if (process.argv[1] === import.meta.filename) {
  const initialRoot = resolveInitialProjectRoot({
    env: process.env,
    cwd: process.cwd(),
  });
  const runtime = createProjectRuntime(initialRoot);

  const methods = {
    ...createBoardMethods(runtime),
    ...createTaskMethods(runtime),
    ...createResourceMethods(runtime),
  };

  startServer({ methods, projectDir: runtime.current, watch: true, projectRuntime: runtime });
}
