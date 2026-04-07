// === Types & Schemas ===
export type {
  TaskCard,
  TaskStatus,
  GateResult,
  PreflightInput,
  PreflightResult,
  TransitionResult,
  ActorMode,
  ExecutionMode,
  ContractPatch,
  EnforceKanbanContractInput,
  ContractResult,
  TaskEvent,
  TaskEventInitiator,
  TaskEventPreflightResult,
  CreateTaskEventInput,
} from "./types.js"
export { TASK_STATUSES, TASK_EVENT_PREFLIGHT_RESULTS } from "./types.js"

export {
  TaskStatusSchema,
  TaskPrioritySchema,
  TaskCardSchema,
  GateResultSchema,
  PreflightInputSchema,
  PreflightResultSchema,
  TaskEventSchema,
  CreateTaskEventInputSchema,
  EnforceKanbanContractInputSchema,
  ContractPatchSchema,
  ContractResultSchema,
} from "./schemas.js"

// === Repository ===
export type {
  Board,
  BoardColumn,
  AgentRecord,
  AgentRegistry,
  StatusWriteInput,
  TaskPatch,
  CreateTaskInput,
  BoardRepository,
  TaskRepository,
} from "./repository/contracts.js"
export {
  BoardColumnSchema,
  AgentRecordSchema,
  AgentRegistrySchema,
  BoardSchema,
  StatusWriteInputSchema,
  parseTaskCard,
} from "./repository/contracts.js"

export { BoardYamlRepository } from "./repository/canonical/board-yaml-repository.js"
export {
  TaskMarkdownRepository,
  loadCanonicalTasksWithDiagnostics,
} from "./repository/canonical/task-markdown-repository.js"
export type { TaskRepositoryDiagnostic } from "./repository/canonical/task-markdown-repository.js"

export { createTask } from "./repository/write/create-task.js"
export type { CreateTaskRequest } from "./repository/write/create-task.js"
export { updateTask } from "./repository/write/update-task.js"
export { updateTaskStatus } from "./repository/write/update-task-status.js"

export { KanbanJsonRepository } from "./repository/fallback/kanban-json-repository.js"
export { MarkdownGlobRepository } from "./repository/fallback/markdown-glob-repository.js"
export { TasksYmlRepository } from "./repository/fallback/tasks-yml-repository.js"

// === Status & Transitions ===
export { canTransition } from "./status/transition.js"

// === Preflight ===
export { runPreflight } from "./preflight/run-preflight.js"

// === Events ===
export { createTaskEvent } from "./events/task-event.js"

// === Contract ===
export { enforceKanbanContract } from "./contract/enforce-kanban.js"

// === Agents ===
export { resolveAgentRegistry } from "./agents/resolve-agent-registry.js"
export { mergeAgentSources } from "./agents/merge-agent-sources.js"

// === Discovery ===
export { listSourceCandidates } from "./discovery/list-source-candidates.js"
export type { SourceCandidate } from "./discovery/list-source-candidates.js"
export { selectPrimarySource } from "./discovery/select-primary-source.js"
export { resolveSourceOverride } from "./discovery/source-override.js"
export type { SourceOverrideInput } from "./discovery/source-override.js"

// === Watch ===
export { createBoardWatcher } from "./watch/board-watcher.js"

// === Bridge ===
export type { RuntimePublisher } from "./bridge/runtime-publisher.js"
export { publishTaskEvent } from "./bridge/publish-task-event.js"

// === UI (board store — shared between plugin and desktop) ===
export {
  loadBoardWithDiagnostics,
  getTasksForColumn,
  getTaskAgents,
  hasTaskBlocker,
} from "./ui/board-store.js"
export type { BoardDiagnostic, BoardViewState } from "./ui/board-store.js"
