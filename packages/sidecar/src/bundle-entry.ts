import { startServer } from './server.js';
import { createBoardMethods } from './methods/board.js';
import { createTaskMethods } from './methods/task.js';
import { createResourceMethods } from './methods/resources.js';
import { createProjectRuntime, resolveInitialProjectRoot } from './runtime.js';

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
