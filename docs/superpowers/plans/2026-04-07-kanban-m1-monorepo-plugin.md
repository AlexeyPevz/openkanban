# M1: Monorepo + Plugin Production — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the flat `src/` codebase into an npm workspaces monorepo (`packages/core` + `packages/plugin`), add new kanban tools, delete dead code, and produce a publishable OpenCode plugin package.

**Architecture:** Two internal packages sharing types via workspace dependency. `@neon-tiger/core` owns domain logic (types, schemas, transitions, repository, discovery, watch, bridge). `@neon-tiger/plugin` owns the OpenCode plugin entry, tool registration, host adapter, and desktop launcher stub. Communication between packages uses the barrel export from core's `index.ts`.

**Tech Stack:** TypeScript 6, Node 22, Vitest 4, npm workspaces, @opencode-ai/plugin ^1.3.2, chokidar, yaml, zod

---

## File Map

### Root (modify)
- `package.json` — convert to workspace root
- `tsconfig.json` — convert to solution-style with references
- `vitest.config.ts` — update paths for monorepo

### packages/core/ (create)
- `packages/core/package.json`
- `packages/core/tsconfig.json`
- `packages/core/src/index.ts` — barrel export

Files **moved** from `src/` → `packages/core/src/`:
- `src/core/types.ts` → `packages/core/src/types.ts`
- `src/core/schemas.ts` → `packages/core/src/schemas.ts`
- `src/core/status/transition.ts` → `packages/core/src/status/transition.ts`
- `src/core/preflight/run-preflight.ts` → `packages/core/src/preflight/run-preflight.ts`
- `src/core/events/task-event.ts` → `packages/core/src/events/task-event.ts`
- `src/core/contract/enforce-kanban.ts` → `packages/core/src/contract/enforce-kanban.ts`
- `src/core/agents/resolve-agent-registry.ts` → `packages/core/src/agents/resolve-agent-registry.ts`
- `src/core/agents/merge-agent-sources.ts` → `packages/core/src/agents/merge-agent-sources.ts`
- `src/discovery/list-source-candidates.ts` → `packages/core/src/discovery/list-source-candidates.ts`
- `src/discovery/select-primary-source.ts` → `packages/core/src/discovery/select-primary-source.ts`
- `src/discovery/source-override.ts` → `packages/core/src/discovery/source-override.ts`
- `src/repository/contracts.ts` → `packages/core/src/repository/contracts.ts`
- `src/repository/canonical/board-yaml-repository.ts` → `packages/core/src/repository/canonical/board-yaml-repository.ts`
- `src/repository/canonical/task-markdown-repository.ts` → `packages/core/src/repository/canonical/task-markdown-repository.ts`
- `src/repository/write/atomic-write.ts` → `packages/core/src/repository/write/atomic-write.ts`
- `src/repository/write/create-task.ts` → `packages/core/src/repository/write/create-task.ts`
- `src/repository/write/update-task.ts` → `packages/core/src/repository/write/update-task.ts`
- `src/repository/write/update-task-status.ts` → `packages/core/src/repository/write/update-task-status.ts`
- `src/repository/fallback/kanban-json-repository.ts` → `packages/core/src/repository/fallback/kanban-json-repository.ts`
- `src/repository/fallback/markdown-glob-repository.ts` → `packages/core/src/repository/fallback/markdown-glob-repository.ts`
- `src/repository/fallback/tasks-yml-repository.ts` → `packages/core/src/repository/fallback/tasks-yml-repository.ts`
- `src/watch/board-watcher.ts` → `packages/core/src/watch/board-watcher.ts`
- `src/bridge/orchestrator/runtime-publisher.ts` → `packages/core/src/bridge/runtime-publisher.ts`
- `src/bridge/orchestrator/publish-task-event.ts` → `packages/core/src/bridge/publish-task-event.ts`
- `src/ui/state/board-store.ts` → `packages/core/src/ui/board-store.ts`

### packages/plugin/ (create)
- `packages/plugin/package.json`
- `packages/plugin/tsconfig.json`
- `packages/plugin/src/plugin.ts` — refactored entry point
- `packages/plugin/src/host/adapter.ts` — moved from `src/host/opencode/adapter.ts`
- `packages/plugin/src/host/probe-capabilities.ts` — moved from `src/host/opencode/probe-capabilities.ts`
- `packages/plugin/src/host/runtime-context.ts` — moved from `src/host/opencode/runtime-context.ts`
- `packages/plugin/src/tools/load-board.ts` — NEW: extracted tool
- `packages/plugin/src/tools/move-task.ts` — NEW: extracted tool
- `packages/plugin/src/tools/create-task.ts` — NEW tool
- `packages/plugin/src/tools/get-task.ts` — NEW tool
- `packages/plugin/src/tools/list-tasks.ts` — NEW tool
- `packages/plugin/src/tools/open-board.ts` — NEW tool (desktop launcher stub)

### Files to DELETE (dead code)
- `src/host/opencode/register-hotkeys.ts`
- `src/host/opencode/register-commands.ts`
- `src/host/opencode/emit-capability-matrix.ts`
- `tests/unit/host/opencode/register-hotkeys.test.ts`
- `tests/unit/host/opencode/register-commands.test.ts`

### Tests (move + new)
All test files move from `tests/` → `tests/` (tests stay at repo root, paths updated)
- Existing test imports updated to point to new package locations
- New tool tests added under `tests/unit/plugin/tools/`

---

## Task 1: Create workspace root scaffold

**Files:**
- Modify: `package.json`
- Modify: `tsconfig.json`

- [ ] **Step 1: Convert root package.json to workspace host**

Replace `package.json` content:

```json
{
  "name": "neon-tiger",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "workspaces": [
    "packages/core",
    "packages/plugin"
  ],
  "scripts": {
    "build": "npm run build:core && npm run build:plugin",
    "build:core": "npm run build -w @neon-tiger/core",
    "build:plugin": "npm run build -w @neon-tiger/plugin",
    "test": "vitest run",
    "typecheck": "tsc -b"
  },
  "devDependencies": {
    "@types/node": "^25.5.0",
    "happy-dom": "^20.8.8",
    "typescript": "^6.0.2",
    "vitest": "^4.1.1"
  }
}
```

- [ ] **Step 2: Convert root tsconfig.json to solution-style**

Replace `tsconfig.json` content:

```json
{
  "files": [],
  "references": [
    { "path": "packages/core" },
    { "path": "packages/plugin" }
  ]
}
```

- [ ] **Step 3: Run npm install to validate workspace setup**

Run: `npm install`
Expected: Exits 0, creates/updates `node_modules` with workspace symlinks

- [ ] **Step 4: Commit**

```bash
git add package.json tsconfig.json package-lock.json
git commit -m "refactor: convert to npm workspaces monorepo root"
```

---

## Task 2: Create @neon-tiger/core package scaffold

**Files:**
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/src/index.ts` (minimal placeholder)

- [ ] **Step 1: Create packages/core directory**

```bash
mkdir -p packages/core/src
```

- [ ] **Step 2: Create packages/core/package.json**

```json
{
  "name": "@neon-tiger/core",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsc -p tsconfig.json"
  },
  "dependencies": {
    "chokidar": "^5.0.0",
    "fast-glob": "^3.3.3",
    "gray-matter": "^4.0.3",
    "yaml": "^2.8.3",
    "zod": "^4.3.6"
  }
}
```

- [ ] **Step 3: Create packages/core/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "composite": true,
    "outDir": "dist",
    "rootDir": "src",
    "types": ["node"]
  },
  "include": ["src/**/*.ts"],
  "exclude": ["dist", "node_modules"]
}
```

- [ ] **Step 4: Create minimal barrel index.ts**

Create `packages/core/src/index.ts`:

```ts
// @neon-tiger/core — barrel export
// Will be populated as files are moved in Task 3
export {}
```

- [ ] **Step 5: Run npm install and verify workspace link**

Run: `npm install`
Expected: Exits 0. `node_modules/@neon-tiger/core` symlinks to `packages/core`

- [ ] **Step 6: Verify core builds**

Run: `npm run build -w @neon-tiger/core`
Expected: Exits 0, creates `packages/core/dist/index.js` and `packages/core/dist/index.d.ts`

- [ ] **Step 7: Commit**

```bash
git add packages/core/
git commit -m "feat(core): scaffold @neon-tiger/core package"
```

---

## Task 3: Move domain source files to packages/core

This is the largest task. All files from `src/core/`, `src/discovery/`, `src/repository/`, `src/watch/`, `src/bridge/`, and `src/ui/state/board-store.ts` move into `packages/core/src/`.

**Files:**
- Move: 25 source files (see file map above)
- Modify: all moved files (update relative imports)
- Modify: `packages/core/src/index.ts` (full barrel export)

### Import Rewrite Rules

The key change is that `src/core/types.ts` becomes `packages/core/src/types.ts` (moved up one level from `core/` subdirectory). All internal imports within core files need path adjustments.

Internal import mapping (old → new relative path from file's new location):

| Old import (from any core file) | New import |
|---|---|
| `../../core/types.js` | `../types.js` or `../../types.js` (depends on depth) |
| `../core/types.js` | `../types.js` or `./types.js` |
| `../core/schemas.js` | `../schemas.js` or `./schemas.js` |
| `../contracts.js` | `../contracts.js` (stays same within repository/) |

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p packages/core/src/status
mkdir -p packages/core/src/preflight
mkdir -p packages/core/src/events
mkdir -p packages/core/src/contract
mkdir -p packages/core/src/agents
mkdir -p packages/core/src/discovery
mkdir -p packages/core/src/repository/canonical
mkdir -p packages/core/src/repository/write
mkdir -p packages/core/src/repository/fallback
mkdir -p packages/core/src/watch
mkdir -p packages/core/src/bridge
mkdir -p packages/core/src/ui
```

- [ ] **Step 2: Move top-level core files (types, schemas)**

```bash
cp src/core/types.ts packages/core/src/types.ts
cp src/core/schemas.ts packages/core/src/schemas.ts
```

Update `packages/core/src/schemas.ts` — imports stay the same (both files are in the same directory):
```ts
import { z } from "zod"
import { TASK_EVENT_PREFLIGHT_RESULTS, TASK_STATUSES } from "./types.js"
```
(No change needed — already uses `./types.js` relative to `core/`)

- [ ] **Step 3: Move status/transition.ts**

```bash
cp src/core/status/transition.ts packages/core/src/status/transition.ts
```

Update imports in `packages/core/src/status/transition.ts`:
- `../../core/types.js` → `../types.js` (if present)
- Verify: the file imports from `../types.js` already (one level up from `status/`)

- [ ] **Step 4: Move preflight/run-preflight.ts**

```bash
cp src/core/preflight/run-preflight.ts packages/core/src/preflight/run-preflight.ts
```

Update imports — the file references `../types.js` which now resolves correctly.

- [ ] **Step 5: Move events/task-event.ts**

```bash
cp src/core/events/task-event.ts packages/core/src/events/task-event.ts
```

Update imports — same pattern: `../types.js` stays correct.

- [ ] **Step 6: Move contract/enforce-kanban.ts**

```bash
cp src/core/contract/enforce-kanban.ts packages/core/src/contract/enforce-kanban.ts
```

Update imports as needed — verify `../types.js` resolves.

- [ ] **Step 7: Move agents/ files**

```bash
cp src/core/agents/resolve-agent-registry.ts packages/core/src/agents/resolve-agent-registry.ts
cp src/core/agents/merge-agent-sources.ts packages/core/src/agents/merge-agent-sources.ts
```

- [ ] **Step 8: Move discovery/ files**

```bash
cp src/discovery/list-source-candidates.ts packages/core/src/discovery/list-source-candidates.ts
cp src/discovery/select-primary-source.ts packages/core/src/discovery/select-primary-source.ts
cp src/discovery/source-override.ts packages/core/src/discovery/source-override.ts
```

Update imports: discovery files that import from `../core/types.js` → change to `../types.js`.

- [ ] **Step 9: Move repository/ files**

```bash
cp src/repository/contracts.ts packages/core/src/repository/contracts.ts
cp src/repository/canonical/board-yaml-repository.ts packages/core/src/repository/canonical/board-yaml-repository.ts
cp src/repository/canonical/task-markdown-repository.ts packages/core/src/repository/canonical/task-markdown-repository.ts
cp src/repository/write/atomic-write.ts packages/core/src/repository/write/atomic-write.ts
cp src/repository/write/create-task.ts packages/core/src/repository/write/create-task.ts
cp src/repository/write/update-task.ts packages/core/src/repository/write/update-task.ts
cp src/repository/write/update-task-status.ts packages/core/src/repository/write/update-task-status.ts
cp src/repository/fallback/kanban-json-repository.ts packages/core/src/repository/fallback/kanban-json-repository.ts
cp src/repository/fallback/markdown-glob-repository.ts packages/core/src/repository/fallback/markdown-glob-repository.ts
cp src/repository/fallback/tasks-yml-repository.ts packages/core/src/repository/fallback/tasks-yml-repository.ts
```

Update imports in repository files:
- `contracts.ts`: `../core/schemas.js` → `../schemas.js`; `../core/types.js` → `../types.js`
- `canonical/*.ts`: `../../core/types.js` → `../../types.js`; `../../core/schemas.js` → `../../schemas.js`
- `write/*.ts`: `../../core/types.js` → `../../types.js`
- `fallback/*.ts`: `../../core/types.js` → `../../types.js`; `../../core/schemas.js` → `../../schemas.js`

- [ ] **Step 10: Move watch/board-watcher.ts**

```bash
cp src/watch/board-watcher.ts packages/core/src/watch/board-watcher.ts
```

Update imports: `../core/types.js` → `../types.js` (etc.)

- [ ] **Step 11: Move bridge/ files**

```bash
cp src/bridge/orchestrator/runtime-publisher.ts packages/core/src/bridge/runtime-publisher.ts
cp src/bridge/orchestrator/publish-task-event.ts packages/core/src/bridge/publish-task-event.ts
```

Note: flatten from `bridge/orchestrator/` to `bridge/`. Update imports:
- `publish-task-event.ts`: `./runtime-publisher.js` stays same; `../../core/types.js` → `../types.js`
- `runtime-publisher.ts`: `../../core/types.js` → `../types.js`

- [ ] **Step 12: Move ui/state/board-store.ts**

```bash
cp src/ui/state/board-store.ts packages/core/src/ui/board-store.ts
```

Update imports:
- `../../core/types.js` → `../types.js`
- `../../repository/contracts.js` → `../repository/contracts.js`
- `../../repository/canonical/board-yaml-repository.js` → `../repository/canonical/board-yaml-repository.js`
- `../../repository/canonical/task-markdown-repository.js` → `../repository/canonical/task-markdown-repository.js`

- [ ] **Step 13: Write full barrel index.ts**

Replace `packages/core/src/index.ts`:

```ts
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

// === Status & Transitions ===
export { tryTransition } from "./status/transition.js"

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
```

- [ ] **Step 14: Verify core builds**

Run: `npm run build -w @neon-tiger/core`
Expected: Exits 0 with no errors. All `.js` and `.d.ts` files generated in `packages/core/dist/`.

- [ ] **Step 15: Commit**

```bash
git add packages/core/
git commit -m "feat(core): move domain files into @neon-tiger/core package"
```

**Important implementation note:** After copying files, the implementer MUST read each file's actual imports and fix them based on the new relative paths. The mapping table above covers the common patterns, but each file should be individually checked. The guiding principle: `src/core/X.ts` content is now at `packages/core/src/X.ts` (one level shallower), so any import that started with `../core/` loses that segment.

---

## Task 4: Create @neon-tiger/plugin package scaffold + move host files

**Files:**
- Create: `packages/plugin/package.json`
- Create: `packages/plugin/tsconfig.json`
- Move: `src/host/opencode/adapter.ts` → `packages/plugin/src/host/adapter.ts`
- Move: `src/host/opencode/probe-capabilities.ts` → `packages/plugin/src/host/probe-capabilities.ts`
- Move: `src/host/opencode/runtime-context.ts` → `packages/plugin/src/host/runtime-context.ts`

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p packages/plugin/src/host
mkdir -p packages/plugin/src/tools
```

- [ ] **Step 2: Create packages/plugin/package.json**

```json
{
  "name": "@neon-tiger/plugin",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/plugin.js",
  "types": "./dist/plugin.d.ts",
  "exports": {
    ".": {
      "types": "./dist/plugin.d.ts",
      "default": "./dist/plugin.js"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsc -p tsconfig.json"
  },
  "dependencies": {
    "@neon-tiger/core": "workspace:*",
    "@opencode-ai/plugin": "^1.3.2"
  }
}
```

- [ ] **Step 3: Create packages/plugin/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "composite": true,
    "outDir": "dist",
    "rootDir": "src",
    "types": ["node"]
  },
  "references": [
    { "path": "../core" }
  ],
  "include": ["src/**/*.ts"],
  "exclude": ["dist", "node_modules"]
}
```

- [ ] **Step 4: Copy and update host files**

```bash
cp src/host/opencode/adapter.ts packages/plugin/src/host/adapter.ts
cp src/host/opencode/probe-capabilities.ts packages/plugin/src/host/probe-capabilities.ts
cp src/host/opencode/runtime-context.ts packages/plugin/src/host/runtime-context.ts
```

Update imports in `packages/plugin/src/host/adapter.ts`:
- `./probe-capabilities.js` → stays `./probe-capabilities.js` (same relative dir)

Update imports in `packages/plugin/src/host/probe-capabilities.ts`:
- No changes needed (self-contained)

Update imports in `packages/plugin/src/host/runtime-context.ts`:
- Check for any imports from `../../../core/types.js` and change to `@neon-tiger/core`

- [ ] **Step 5: Verify plugin package builds**

Run: `npm run build -w @neon-tiger/plugin`
Expected: May fail (no plugin.ts yet). That's OK — we just verify the host files have no import errors by checking typecheck output.

- [ ] **Step 6: Commit**

```bash
git add packages/plugin/
git commit -m "feat(plugin): scaffold @neon-tiger/plugin package with host adapter"
```

---

## Task 5: Extract existing tools + write new tools

**Files:**
- Create: `packages/plugin/src/tools/load-board.ts`
- Create: `packages/plugin/src/tools/move-task.ts`
- Create: `packages/plugin/src/tools/create-task.ts`
- Create: `packages/plugin/src/tools/get-task.ts`
- Create: `packages/plugin/src/tools/list-tasks.ts`
- Create: `packages/plugin/src/tools/open-board.ts`
- Test: `tests/unit/plugin/tools/create-task-tool.test.ts`
- Test: `tests/unit/plugin/tools/get-task-tool.test.ts`
- Test: `tests/unit/plugin/tools/list-tasks-tool.test.ts`
- Test: `tests/unit/plugin/tools/open-board-tool.test.ts`

- [ ] **Step 1: Write tests for create-task tool**

Create `tests/unit/plugin/tools/create-task-tool.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest"

// Test the create-task handler logic (not the plugin tool wrapper)
import { makeCreateTaskHandler } from "../../../../packages/plugin/src/tools/create-task.js"

describe("kanban_create_task handler", () => {
  it("creates a task with title and defaults", async () => {
    const mockRepo = {
      createTask: vi.fn().mockResolvedValue({
        id: "fix-login-bug",
        title: "Fix login bug",
        status: "planned",
        source_file: ".tasks/tasks/fix-login-bug.md",
        updated_at: "2026-04-07T00:00:00.000Z",
      }),
    }

    const handler = makeCreateTaskHandler(mockRepo as never)
    const result = await handler({ title: "Fix login bug" })

    expect(result).toContain("fix-login-bug")
    expect(mockRepo.createTask).toHaveBeenCalledOnce()
  })

  it("creates a task with explicit status and priority", async () => {
    const mockRepo = {
      createTask: vi.fn().mockResolvedValue({
        id: "add-tests",
        title: "Add tests",
        status: "active",
        source_file: ".tasks/tasks/add-tests.md",
        updated_at: "2026-04-07T00:00:00.000Z",
        priority: "high",
      }),
    }

    const handler = makeCreateTaskHandler(mockRepo as never)
    const result = await handler({ title: "Add tests", status: "active", priority: "high" })

    expect(result).toContain("add-tests")
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

Run: `npx vitest run tests/unit/plugin/tools/create-task-tool.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement create-task tool**

Create `packages/plugin/src/tools/create-task.ts`:

```ts
import { tool } from "@opencode-ai/plugin"
import type { TaskRepository } from "@neon-tiger/core"
import { createTask as coreCreateTask } from "@neon-tiger/core"
import type { TaskStatus } from "@neon-tiger/core"

export interface CreateTaskArgs {
  title: string
  status?: TaskStatus
  priority?: "low" | "medium" | "high"
  assignee?: string
}

export function makeCreateTaskHandler(taskRepository: TaskRepository) {
  return async (args: CreateTaskArgs): Promise<string> => {
    const task = await coreCreateTask(taskRepository, {
      title: args.title,
      status: args.status ?? "planned",
    })

    if (args.priority || args.assignee) {
      await taskRepository.writeTaskMetadata(task.id, {
        metadata: {
          ...(args.priority ? { priority: args.priority } : {}),
          ...(args.assignee ? { assignee: args.assignee } : {}),
        },
      })
    }

    return JSON.stringify(task, null, 2)
  }
}

export function createTaskTool(taskRepository: TaskRepository) {
  return tool({
    description: "Create a new kanban task",
    args: {
      title: tool.schema.string().min(1).describe("Task title"),
      status: tool.schema
        .enum(["planned", "active", "review", "done", "blocked", "parked", "cancelled"])
        .optional()
        .describe("Initial status (default: planned)"),
      priority: tool.schema.enum(["low", "medium", "high"]).optional().describe("Task priority"),
      assignee: tool.schema.string().optional().describe("Assignee"),
    },
    async execute(args, context) {
      const handler = makeCreateTaskHandler(taskRepository)
      const result = await handler(args)
      context.metadata({ title: "Task created" })
      return result
    },
  })
}
```

- [ ] **Step 4: Run test — verify it passes**

Run: `npx vitest run tests/unit/plugin/tools/create-task-tool.test.ts`
Expected: PASS

- [ ] **Step 5: Write tests for get-task tool**

Create `tests/unit/plugin/tools/get-task-tool.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest"
import { makeGetTaskHandler } from "../../../../packages/plugin/src/tools/get-task.js"

describe("kanban_get_task handler", () => {
  it("returns task by id", async () => {
    const task = {
      id: "task-001",
      title: "Test task",
      status: "active",
      source_file: ".tasks/tasks/task-001.md",
      updated_at: "2026-04-07T00:00:00.000Z",
    }
    const mockRepo = { loadTaskById: vi.fn().mockResolvedValue(task) }
    const handler = makeGetTaskHandler(mockRepo as never)
    const result = await handler({ taskId: "task-001" })
    expect(JSON.parse(result)).toMatchObject({ id: "task-001" })
  })

  it("throws when task not found", async () => {
    const mockRepo = { loadTaskById: vi.fn().mockResolvedValue(null) }
    const handler = makeGetTaskHandler(mockRepo as never)
    await expect(handler({ taskId: "nope" })).rejects.toThrow("Task not found: nope")
  })
})
```

- [ ] **Step 6: Run test — verify fail**

Run: `npx vitest run tests/unit/plugin/tools/get-task-tool.test.ts`
Expected: FAIL

- [ ] **Step 7: Implement get-task tool**

Create `packages/plugin/src/tools/get-task.ts`:

```ts
import { tool } from "@opencode-ai/plugin"
import type { TaskRepository } from "@neon-tiger/core"

export function makeGetTaskHandler(taskRepository: TaskRepository) {
  return async (args: { taskId: string }): Promise<string> => {
    const task = await taskRepository.loadTaskById(args.taskId)
    if (!task) {
      throw new Error(`Task not found: ${args.taskId}`)
    }
    return JSON.stringify(task, null, 2)
  }
}

export function getTaskTool(taskRepository: TaskRepository) {
  return tool({
    description: "Get detailed information about a kanban task",
    args: {
      taskId: tool.schema.string().min(1).describe("Task ID"),
    },
    async execute(args, context) {
      const handler = makeGetTaskHandler(taskRepository)
      const result = await handler(args)
      context.metadata({ title: `Task ${args.taskId} loaded` })
      return result
    },
  })
}
```

- [ ] **Step 8: Run test — verify pass**

Run: `npx vitest run tests/unit/plugin/tools/get-task-tool.test.ts`
Expected: PASS

- [ ] **Step 9: Write tests for list-tasks tool**

Create `tests/unit/plugin/tools/list-tasks-tool.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest"
import { makeListTasksHandler } from "../../../../packages/plugin/src/tools/list-tasks.js"

const tasks = [
  { id: "t1", title: "A", status: "active", priority: "high", assignees: ["alice"], source_file: "f", updated_at: "t" },
  { id: "t2", title: "B", status: "done", priority: "low", assignees: ["bob"], source_file: "f", updated_at: "t" },
  { id: "t3", title: "C", status: "active", priority: "medium", assignees: [], source_file: "f", updated_at: "t" },
]

describe("kanban_list_tasks handler", () => {
  it("returns all tasks when no filters", async () => {
    const mockRepo = { loadTasks: vi.fn().mockResolvedValue(tasks) }
    const handler = makeListTasksHandler(mockRepo as never)
    const result = JSON.parse(await handler({}))
    expect(result).toHaveLength(3)
  })

  it("filters by status", async () => {
    const mockRepo = { loadTasks: vi.fn().mockResolvedValue(tasks) }
    const handler = makeListTasksHandler(mockRepo as never)
    const result = JSON.parse(await handler({ status: "active" }))
    expect(result).toHaveLength(2)
    expect(result.every((t: { status: string }) => t.status === "active")).toBe(true)
  })

  it("filters by priority", async () => {
    const mockRepo = { loadTasks: vi.fn().mockResolvedValue(tasks) }
    const handler = makeListTasksHandler(mockRepo as never)
    const result = JSON.parse(await handler({ priority: "high" }))
    expect(result).toHaveLength(1)
  })
})
```

- [ ] **Step 10: Run test — verify fail**

Run: `npx vitest run tests/unit/plugin/tools/list-tasks-tool.test.ts`
Expected: FAIL

- [ ] **Step 11: Implement list-tasks tool**

Create `packages/plugin/src/tools/list-tasks.ts`:

```ts
import { tool } from "@opencode-ai/plugin"
import type { TaskRepository, TaskStatus, TaskCard } from "@neon-tiger/core"

export interface ListTasksFilter {
  status?: TaskStatus
  priority?: "low" | "medium" | "high"
  assignee?: string
}

export function makeListTasksHandler(taskRepository: TaskRepository) {
  return async (filter: ListTasksFilter): Promise<string> => {
    let tasks = await taskRepository.loadTasks()

    if (filter.status) {
      tasks = tasks.filter((t) => t.status === filter.status)
    }
    if (filter.priority) {
      tasks = tasks.filter((t) => t.priority === filter.priority)
    }
    if (filter.assignee) {
      tasks = tasks.filter((t) => t.assignees?.includes(filter.assignee!))
    }

    return JSON.stringify(tasks, null, 2)
  }
}

export function listTasksTool(taskRepository: TaskRepository) {
  return tool({
    description: "List kanban tasks with optional filters",
    args: {
      status: tool.schema
        .enum(["planned", "active", "review", "done", "blocked", "parked", "cancelled"])
        .optional()
        .describe("Filter by status"),
      priority: tool.schema.enum(["low", "medium", "high"]).optional().describe("Filter by priority"),
      assignee: tool.schema.string().optional().describe("Filter by assignee"),
    },
    async execute(args, context) {
      const handler = makeListTasksHandler(taskRepository)
      const result = await handler(args)
      const parsed = JSON.parse(result)
      context.metadata({ title: `Listed ${parsed.length} tasks` })
      return result
    },
  })
}
```

- [ ] **Step 12: Run test — verify pass**

Run: `npx vitest run tests/unit/plugin/tools/list-tasks-tool.test.ts`
Expected: PASS

- [ ] **Step 13: Write tests for open-board tool**

Create `tests/unit/plugin/tools/open-board-tool.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest"
import { makeOpenBoardHandler, type OpenBoardDeps } from "../../../../packages/plugin/src/tools/open-board.js"

describe("kanban_open_board handler", () => {
  it("returns already-running message when lock exists", async () => {
    const deps: OpenBoardDeps = {
      directory: "/project",
      isLockActive: vi.fn().mockResolvedValue(true),
      resolveBinary: vi.fn(),
      spawnDetached: vi.fn(),
    }
    const handler = makeOpenBoardHandler(deps)
    const result = await handler()
    expect(result).toContain("already running")
    expect(deps.spawnDetached).not.toHaveBeenCalled()
  })

  it("spawns binary when no lock", async () => {
    const deps: OpenBoardDeps = {
      directory: "/project",
      isLockActive: vi.fn().mockResolvedValue(false),
      resolveBinary: vi.fn().mockResolvedValue("/usr/bin/neon-tiger-desktop"),
      spawnDetached: vi.fn(),
    }
    const handler = makeOpenBoardHandler(deps)
    const result = await handler()
    expect(result).toContain("opened")
    expect(deps.spawnDetached).toHaveBeenCalledWith(
      "/usr/bin/neon-tiger-desktop",
      ["--directory", "/project"],
    )
  })

  it("returns error when binary not found", async () => {
    const deps: OpenBoardDeps = {
      directory: "/project",
      isLockActive: vi.fn().mockResolvedValue(false),
      resolveBinary: vi.fn().mockResolvedValue(null),
      spawnDetached: vi.fn(),
    }
    const handler = makeOpenBoardHandler(deps)
    const result = await handler()
    expect(result).toContain("not found")
    expect(deps.spawnDetached).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 14: Run test — verify fail**

Run: `npx vitest run tests/unit/plugin/tools/open-board-tool.test.ts`
Expected: FAIL

- [ ] **Step 15: Implement open-board tool**

Create `packages/plugin/src/tools/open-board.ts`:

```ts
import { tool } from "@opencode-ai/plugin"

export interface OpenBoardDeps {
  directory: string
  isLockActive: () => Promise<boolean>
  resolveBinary: () => Promise<string | null>
  spawnDetached: (binary: string, args: string[]) => void
}

export function makeOpenBoardHandler(deps: OpenBoardDeps) {
  return async (): Promise<string> => {
    const running = await deps.isLockActive()
    if (running) {
      return "Kanban board is already running for this project."
    }

    const binary = await deps.resolveBinary()
    if (!binary) {
      return "neon-tiger-desktop binary not found. Install it from GitHub Releases or set desktopBinaryPath in plugin config."
    }

    deps.spawnDetached(binary, ["--directory", deps.directory])
    return "Kanban board opened in desktop app."
  }
}

export function openBoardTool(deps: OpenBoardDeps) {
  return tool({
    description: "Open the visual kanban board in the desktop app",
    args: {},
    async execute(_args, context) {
      const handler = makeOpenBoardHandler(deps)
      const result = await handler()
      context.metadata({ title: "Open board" })
      return result
    },
  })
}
```

- [ ] **Step 16: Run test — verify pass**

Run: `npx vitest run tests/unit/plugin/tools/open-board-tool.test.ts`
Expected: PASS

- [ ] **Step 17: Create load-board and move-task tool wrappers**

Create `packages/plugin/src/tools/load-board.ts`:

```ts
import { tool } from "@opencode-ai/plugin"
import { loadBoardWithDiagnostics } from "@neon-tiger/core"

export function loadBoardTool(directory: string) {
  return tool({
    description: "Load current kanban board state from canonical task files",
    args: {},
    async execute(_args, context) {
      const boardState = await loadBoardWithDiagnostics(directory)
      context.metadata({
        title: "Kanban board loaded",
        metadata: {
          state: boardState.state,
          taskCount: boardState.state === "success" ? boardState.tasks.length : 0,
        },
      })
      return JSON.stringify(boardState, null, 2)
    },
  })
}
```

Create `packages/plugin/src/tools/move-task.ts`:

```ts
import { tool } from "@opencode-ai/plugin"
import type { TaskRepository, TaskStatus, RuntimePublisher } from "@neon-tiger/core"
import {
  loadBoardWithDiagnostics,
  createTaskEvent,
  publishTaskEvent,
  updateTaskStatus,
} from "@neon-tiger/core"

export interface MoveTaskDeps {
  directory: string
  taskRepository: TaskRepository
  runtimePublisher: RuntimePublisher
  publishedEventIds: Set<string>
}

export function moveTaskTool(deps: MoveTaskDeps) {
  return tool({
    description: "Move a kanban task to a new status using project task files",
    args: {
      taskId: tool.schema.string().min(1),
      targetStatus: tool.schema.enum([
        "planned", "active", "review", "done", "blocked", "parked", "cancelled",
      ]),
    },
    async execute(args, context) {
      const task = await deps.taskRepository.loadTaskById(args.taskId)
      if (!task) {
        throw new Error(`Task not found: ${args.taskId}`)
      }

      const updatedTask = await updateTaskStatus(deps.taskRepository, args.taskId, {
        from: task.status,
        to: args.targetStatus as TaskStatus,
      })

      const event = createTaskEvent({
        task: updatedTask,
        from: task.status,
        to: updatedTask.status,
        initiator: "agent",
        correlationId: `${updatedTask.id}:${Date.now()}`,
        preflightResult: updatedTask.status === "blocked" ? "failed" : "passed",
      })

      await publishTaskEvent({
        runtimePublisher: deps.runtimePublisher,
        event,
        publishedEventIds: deps.publishedEventIds,
      })

      context.metadata({
        title: `Kanban task moved to ${updatedTask.status}`,
        metadata: { taskId: updatedTask.id, status: updatedTask.status },
      })

      return JSON.stringify(updatedTask, null, 2)
    },
  })
}
```

- [ ] **Step 18: Commit**

```bash
git add packages/plugin/src/tools/ tests/unit/plugin/
git commit -m "feat(plugin): add kanban tools (create, get, list, open-board, load, move)"
```

---

## Task 6: Rewrite plugin.ts entry point

**Files:**
- Create: `packages/plugin/src/plugin.ts`

- [ ] **Step 1: Write the new plugin entry point**

Create `packages/plugin/src/plugin.ts`:

```ts
import { type Plugin } from "@opencode-ai/plugin"
import {
  BoardYamlRepository,
  TaskMarkdownRepository,
  type RuntimePublisher,
} from "@neon-tiger/core"

import { createOpenCodeAdapter } from "./host/adapter.js"
import { probeCapabilities } from "./host/probe-capabilities.js"

import { loadBoardTool } from "./tools/load-board.js"
import { moveTaskTool } from "./tools/move-task.js"
import { createTaskTool } from "./tools/create-task.js"
import { getTaskTool } from "./tools/get-task.js"
import { listTasksTool } from "./tools/list-tasks.js"
import { openBoardTool, type OpenBoardDeps } from "./tools/open-board.js"

import { existsSync, readFileSync } from "node:fs"
import { spawn } from "node:child_process"
import { join, resolve } from "node:path"
import { homedir } from "node:os"

function resolveBinaryPath(): string | null {
  // 1. Check PATH (platform-dependent)
  // For now, check well-known locations
  const home = homedir()
  const candidates = [
    join(home, ".neon-tiger", "bin", "neon-tiger-desktop"),
    join(home, ".neon-tiger", "bin", "neon-tiger-desktop.exe"),
  ]
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate
  }
  return null
}

function isLockActive(directory: string): boolean {
  const lockPath = join(directory, ".tasks", ".board-ui.lock")
  if (!existsSync(lockPath)) return false
  try {
    const content = readFileSync(lockPath, "utf-8").trim()
    const pid = parseInt(content, 10)
    if (isNaN(pid)) return false
    // Check if process is still running
    try {
      process.kill(pid, 0)
      return true
    } catch {
      return false
    }
  } catch {
    return false
  }
}

export const plugin: Plugin = async (input) => {
  const directory = input.directory
  const taskRepository = new TaskMarkdownRepository(directory)
  const publishedEventIds = new Set<string>()
  const runtimePublisher: RuntimePublisher = {
    publish: async () => {
      // Current execution environment has no verified live runtime bridge.
    },
  }

  const matrix = await probeCapabilities({
    pluginExports: Object.keys(await import("@opencode-ai/plugin")).sort(),
    liveHostAvailable: false,
  })

  const openBoardDeps: OpenBoardDeps = {
    directory,
    isLockActive: async () => isLockActive(directory),
    resolveBinary: async () => resolveBinaryPath(),
    spawnDetached: (binary, args) => {
      const child = spawn(binary, args, { detached: true, stdio: "ignore" })
      child.unref()
    },
  }

  return {
    event: async () => {},
    tool: {
      kanban_load_board: loadBoardTool(directory),
      kanban_move_task: moveTaskTool({ directory, taskRepository, runtimePublisher, publishedEventIds }),
      kanban_create_task: createTaskTool(taskRepository),
      kanban_get_task: getTaskTool(taskRepository),
      kanban_list_tasks: listTasksTool(taskRepository),
      kanban_open_board: openBoardTool(openBoardDeps),
    },
  }
}
```

- [ ] **Step 2: Verify full build**

Run: `npm run build`
Expected: Exits 0. Both packages compile successfully.

- [ ] **Step 3: Commit**

```bash
git add packages/plugin/src/plugin.ts
git commit -m "feat(plugin): rewrite plugin entry point with all 6 tools"
```

---

## Task 7: Delete dead code and old src/

**Files:**
- Delete: `src/host/opencode/register-hotkeys.ts`
- Delete: `src/host/opencode/register-commands.ts`
- Delete: `src/host/opencode/emit-capability-matrix.ts`
- Delete: `tests/unit/host/opencode/register-hotkeys.test.ts`
- Delete: `tests/unit/host/opencode/register-commands.test.ts`
- Delete: entire `src/` directory

- [ ] **Step 1: Delete dead code files**

```bash
rm src/host/opencode/register-hotkeys.ts
rm src/host/opencode/register-commands.ts
rm src/host/opencode/emit-capability-matrix.ts
rm tests/unit/host/opencode/register-hotkeys.test.ts
rm tests/unit/host/opencode/register-commands.test.ts
```

- [ ] **Step 2: Delete entire src/ directory**

All files have been moved to `packages/core/src/` or `packages/plugin/src/`. The old `src/` is no longer needed.

```bash
rm -rf src/
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor: remove dead code and old src/ directory"
```

---

## Task 8: Update all tests for new import paths

**Files:**
- Modify: all 19 test files in `tests/`
- Delete: 2 dead code test files (done in Task 7)

The key change: all test imports that pointed to `../../src/X` now point to the package. For domain code, import from `@neon-tiger/core`. For plugin code, import from `../../packages/plugin/src/X` (or from `@neon-tiger/plugin` if barrel exists).

### Import rewrite strategy

| Test file | Old import pattern | New import |
|---|---|---|
| `tests/unit/core/*.test.ts` | `../../../src/core/X` | `@neon-tiger/core` |
| `tests/unit/discovery/*.test.ts` | `../../../src/discovery/X` | `@neon-tiger/core` |
| `tests/unit/repository/*.test.ts` | `../../../src/repository/X` | `@neon-tiger/core` |
| `tests/unit/host/opencode/*.test.ts` | `../../../../src/host/opencode/X` | `../../../../packages/plugin/src/host/X` |
| `tests/integration/*.test.ts` | `../../../src/X` | `@neon-tiger/core` |
| `tests/ui/*.test.ts` | `../../src/ui/X` | `../../packages/core/src/ui/X` (for board-store) or keep relative for UI view files |
| `tests/smoke/plugin-entry.test.ts` | `../../src/plugin` | `../../packages/plugin/src/plugin` |
| `tests/e2e/plugin-mvp-flow.test.ts` | `../../src/plugin` | `../../packages/plugin/src/plugin` |

- [ ] **Step 1: Update vitest.config.ts for workspace resolution**

Modify `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config"
import { resolve } from "node:path"

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    environmentMatchGlobs: [["tests/ui/**/*.test.ts", "happy-dom"]],
  },
  resolve: {
    alias: {
      "@neon-tiger/core": resolve(__dirname, "packages/core/src/index.ts"),
      "@neon-tiger/plugin": resolve(__dirname, "packages/plugin/src/plugin.ts"),
    },
  },
})
```

- [ ] **Step 2: Update unit/core/ test imports**

For each file in `tests/unit/core/`:
- `transition.test.ts`: change `../../../src/core/status/transition` → `@neon-tiger/core` (import `tryTransition`)
- `task-event.test.ts`: change `../../../src/core/events/task-event` → `@neon-tiger/core` (import `createTaskEvent`)
- `preflight.test.ts`: change `../../../src/core/preflight/run-preflight` → `@neon-tiger/core` (import `runPreflight`)
- `agent-registry-sync.test.ts`: change imports → `@neon-tiger/core`

Also update any type imports from `../../../src/core/types` → `@neon-tiger/core`.

- [ ] **Step 3: Update unit/discovery/ test imports**

For each file in `tests/unit/discovery/`:
- Change `../../../src/discovery/X` → `@neon-tiger/core`

- [ ] **Step 4: Update unit/repository/ test imports**

`fallback-normalization.test.ts`: Change `../../../src/repository/X` → `@neon-tiger/core`

- [ ] **Step 5: Update unit/host/ test imports**

`probe-capabilities.test.ts`: Change `../../../../src/host/opencode/probe-capabilities` → `../../../../packages/plugin/src/host/probe-capabilities`

- [ ] **Step 6: Update integration/ test imports**

All integration tests: Change `../../../src/X` → `@neon-tiger/core`

- [ ] **Step 7: Update ui/ test imports**

UI tests import from `../../src/ui/` and `../../src/core/`. Change:
- `../../src/ui/view/render-board` → `../../packages/core/src/ui/board-store` (for board-store only)
- UI view and interaction files will stay in `src/ui/` for now (they move to desktop in M2). **Alternative:** keep UI test imports pointing to packages/core only for board-store, and mark UI view tests as skipped (they depend on files that will move in M2).

**Decision:** Since UI view files (`render-board.ts`, `render-card.ts`, etc.) are NOT part of core or plugin in M1, and they will move to `packages/desktop/` in M2, we have two options:
1. Move them to `packages/core/src/ui/` temporarily (adds unnecessary files to core)
2. Leave them in a `shared/ui/` directory at root level temporarily
3. Skip UI view tests in M1 and restore them in M2

**Chosen approach: Option 3** — skip UI view/interaction tests in M1. Board-store is in core and its functionality is tested through integration tests. UI view tests will be restored in M2 when files move to desktop.

For `tests/ui/*.test.ts`: Add `describe.skip(` wrapper with comment `// UI view tests — restored in M2 when files move to packages/desktop`

- [ ] **Step 8: Update smoke and e2e test imports**

- `tests/smoke/plugin-entry.test.ts`: Change `../../src/plugin` → `@neon-tiger/plugin`
- `tests/e2e/plugin-mvp-flow.test.ts`: Change `../../src/plugin` → `@neon-tiger/plugin`

- [ ] **Step 9: Run full test suite**

Run: `npx vitest run`
Expected: All non-skipped tests PASS. UI view tests are skipped with clear message.

- [ ] **Step 10: Commit**

```bash
git add tests/ vitest.config.ts
git commit -m "test: update all test imports for monorepo structure"
```

---

## Task 9: Handle UI view files for M1

The 10 UI files (`src/ui/view/*.ts`, `src/ui/interactions/*.ts`) don't belong in core or plugin. In M2 they move to `packages/desktop/src-webview/ui/`. For M1, we need a clean state.

**Files:**
- Move: `src/ui/view/` and `src/ui/interactions/` → `packages/desktop-staging/ui/` (temporary holding area)

- [ ] **Step 1: Create staging directory**

```bash
mkdir -p packages/desktop-staging/ui/view
mkdir -p packages/desktop-staging/ui/interactions
```

- [ ] **Step 2: Move UI view and interaction files**

```bash
cp src/ui/view/render-board.ts packages/desktop-staging/ui/view/
cp src/ui/view/render-card.ts packages/desktop-staging/ui/view/
cp src/ui/view/render-column.ts packages/desktop-staging/ui/view/
cp src/ui/view/render-details.ts packages/desktop-staging/ui/view/
cp src/ui/view/render-task-form.ts packages/desktop-staging/ui/view/
cp src/ui/interactions/details-panel.ts packages/desktop-staging/ui/interactions/
cp src/ui/interactions/drag-drop.ts packages/desktop-staging/ui/interactions/
cp src/ui/interactions/keyboard-shortcuts.ts packages/desktop-staging/ui/interactions/
cp src/ui/interactions/task-form.ts packages/desktop-staging/ui/interactions/
```

Note: These files are already removed from `src/` in Task 7. This step preserves them for M2.

- [ ] **Step 3: Commit**

```bash
git add packages/desktop-staging/
git commit -m "chore: stage UI view files for M2 desktop migration"
```

**Implementation note:** Task 7 deletes `src/` entirely. The implementer should copy these UI files to staging BEFORE deleting `src/`. Adjust task ordering: do Step 2 here BEFORE Task 7 Step 2.

---

## Task 10: Verify full build + test cycle

**Files:** None (verification only)

- [ ] **Step 1: Clean install**

```bash
rm -rf node_modules packages/core/node_modules packages/plugin/node_modules packages/core/dist packages/plugin/dist
npm install
```
Expected: Exits 0.

- [ ] **Step 2: Full build**

Run: `npm run build`
Expected: Exits 0. `packages/core/dist/` and `packages/plugin/dist/` populated.

- [ ] **Step 3: Full typecheck**

Run: `npm run typecheck`
Expected: Exits 0 (tsc -b with no errors).

- [ ] **Step 4: Full test suite**

Run: `npm run test`
Expected: All non-skipped tests pass. UI view tests show as skipped.

- [ ] **Step 5: Verify workspace symlinks**

Run: `ls node_modules/@neon-tiger/core` (or `dir` on Windows)
Expected: Symlink to `packages/core`

Run: `ls node_modules/@neon-tiger/plugin` (or `dir` on Windows)
Expected: Symlink to `packages/plugin`

- [ ] **Step 6: Commit if any adjustments were needed**

```bash
git add -A
git commit -m "fix: resolve build/test issues from monorepo migration"
```

---

## Task 11: Add README and finalize package metadata

**Files:**
- Create: `README.md`
- Create: `packages/core/README.md`
- Create: `packages/plugin/README.md`
- Verify: `packages/plugin/package.json` has correct metadata

- [ ] **Step 1: Create root README.md**

```markdown
# neon-tiger

Kanban plugin for agentic IDEs. File-first task management for AI agents.

## Packages

| Package | Description |
|---------|-------------|
| `@neon-tiger/core` | Domain logic: types, schemas, transitions, repository, discovery, watch |
| `@neon-tiger/plugin` | OpenCode plugin: tool registration, host adapter |
| `@neon-tiger/desktop` | Tauri desktop app (coming in M2) |

## Quick Start

```bash
# Install the OpenCode plugin
opencode plugin install neon-tiger/neon-tiger

# Tools available to agents:
# kanban_load_board    — load board state
# kanban_move_task     — move task to new status
# kanban_create_task   — create a new task
# kanban_get_task      — get task details
# kanban_list_tasks    — list tasks with filters
# kanban_open_board    — open visual board (requires desktop app)
```

## Development

```bash
npm install
npm run build
npm run test
npm run typecheck
```

## Architecture

`.tasks/` directory is the single source of truth. All components read/write task files. No database, no server.

See [Architecture Spec](docs/superpowers/specs/2026-04-07-kanban-dual-architecture-design.md) for details.
```

- [ ] **Step 2: Create packages/plugin/README.md**

```markdown
# @neon-tiger/plugin

OpenCode plugin for kanban task management. Provides tools for AI agents to create, read, update, and manage tasks.

## Installation

```bash
opencode plugin install neon-tiger/neon-tiger
```

## Tools

| Tool | Description |
|------|-------------|
| `kanban_load_board` | Load board state from task files |
| `kanban_move_task` | Move task to new status |
| `kanban_create_task` | Create a new task |
| `kanban_get_task` | Get task details |
| `kanban_list_tasks` | List tasks with filters |
| `kanban_open_board` | Open visual kanban board |
```

- [ ] **Step 3: Verify plugin package.json has repository field**

Add to `packages/plugin/package.json`:

```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/neon-tiger/neon-tiger.git",
    "directory": "packages/plugin"
  },
  "license": "MIT",
  "keywords": ["opencode", "kanban", "plugin", "task-management"]
}
```

- [ ] **Step 4: Commit**

```bash
git add README.md packages/core/README.md packages/plugin/README.md packages/plugin/package.json
git commit -m "docs: add README files and finalize package metadata"
```

---

## Execution Order Summary

| Order | Task | Description | Dependency |
|-------|------|-------------|------------|
| 1 | Task 1 | Workspace root scaffold | — |
| 2 | Task 2 | Core package scaffold | Task 1 |
| 3 | Task 3 | Move domain files to core | Task 2 |
| 4 | Task 4 | Plugin package scaffold + host files | Task 2 |
| 5 | Task 9 | Stage UI files (BEFORE deleting src/) | Task 3 |
| 6 | Task 5 | Extract + write new tools | Task 3, Task 4 |
| 7 | Task 6 | Rewrite plugin entry point | Task 5 |
| 8 | Task 7 | Delete dead code + old src/ | Task 5, Task 6, Task 9 |
| 9 | Task 8 | Update all test imports | Task 7 |
| 10 | Task 10 | Full verification | Task 8 |
| 11 | Task 11 | README + metadata | Task 10 |

**Total estimated time:** 60-90 minutes with TDD flow.
