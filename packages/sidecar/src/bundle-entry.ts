import { startServer } from './server.js';
import { createBoardMethods } from './methods/board.js';
import { createTaskMethods } from './methods/task.js';
import { createResourceMethods } from './methods/resources.js';

const projectDir = process.cwd();

const methods = {
  ...createBoardMethods(projectDir),
  ...createTaskMethods(projectDir),
  ...createResourceMethods(projectDir),
};

startServer({ methods, projectDir, watch: true });
