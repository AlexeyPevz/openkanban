/**
 * Browser-safe entrypoint for @openkanban/core.
 *
 * This module re-exports ONLY types, schemas, and pure functions that have
 * zero Node.js built-in dependencies (no fs, path, child_process, etc.).
 *
 * Desktop WebView and any other browser runtime should import from
 * `@openkanban/core/browser` instead of the barrel `@openkanban/core`
 * to avoid pulling Node-only repository/watcher modules into the bundle.
 */

// === Types (compile-time only, always safe) ===
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

export type { ResourceKind, ResourceRecord, ResourceAssignment } from './resources/types.js';

// === Schemas (pure zod, no Node deps) ===
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

export {
  BoardColumnSchema,
  AgentRecordSchema,
  AgentRegistrySchema,
  BoardSchema,
  StatusWriteInputSchema,
  parseTaskCard,
} from "./repository/contracts.js"

export { ResourceKindSchema, ResourceRecordSchema, ResourceAssignmentSchema } from './resources/schemas.js';

// === Pure functions (no Node deps) ===
export { normalizeResources } from './resources/normalize.js';
export { createResourceRegistry, type ResourceRegistry } from './resources/registry.js';
export { canTransition } from "./status/transition.js"

// === UI helpers (browser-safe, from task-helpers — NOT board-store) ===
export { getTasksForColumn, getTaskAgents, hasTaskBlocker, getTaskResources } from "./ui/task-helpers.js"
