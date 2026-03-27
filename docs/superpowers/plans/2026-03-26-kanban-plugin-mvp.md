# Kanban Plugin MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Собрать рабочий MVP `Kanban Plugin for Agentic IDEs` для `OpenCode Desktop` с file-first source of truth, canonical `.tasks/board.yml` + `.tasks/tasks/*.md`, preflight transitions и operational board interactions.

**Architecture:** План идёт от стабильного file-first core к host integration и UI. Сначала реализуются schema-first domain contracts, discovery и repository adapters, затем watcher/orchestrator bridge, затем capability-guarded OpenCode adapter и UI renderer. Любые неподтверждённые host surfaces валидируются отдельным slice и не блокируют core.

**Tech Stack:** Node.js 22.19.0, npm 10.9.3, TypeScript 5.x, Vitest, Zod, `yaml`, `gray-matter`, `fast-glob`, `chokidar`, `@opencode-ai/plugin@1.3.0`, lightweight DOM renderer with `happy-dom` for UI tests.

---

## Verified environment and execution notes

- Verified locally: `node v22.19.0`, `npm 10.9.3`
- Verified locally: `bun` отсутствует, поэтому все scripts и verification команды должны быть npm/node-based
- Verified locally: текущая git branch = `master`, поэтому перед кодингом нужен isolated feature workspace
- Required before Task 1 execution: использовать `@using-git-worktrees` или, если это невозможно, как минимум создать feature branch и не писать в `master`

## Proposed file structure

### Root config

- Create: `package.json` — scripts, dependencies, plugin package metadata
- Create: `tsconfig.json` — TypeScript build config
- Create: `vitest.config.ts` — test config, включая `happy-dom` для UI tests
- Create: `.gitignore` entry for generated build output and optional project-local worktree path if выбран `.worktrees/`

### Source tree

- Create: `src/plugin.ts` — OpenCode plugin entrypoint and dependency wiring
- Create: `src/core/types.ts` — canonical types
- Create: `src/core/schemas.ts` — zod schemas for board/task/events
- Create: `src/core/status/transition.ts` — transition rules and results
- Create: `src/core/preflight/run-preflight.ts` — preflight engine
- Create: `src/core/events/task-event.ts` — event payload factory and idempotency helpers
- Create: `src/core/contract/enforce-kanban.ts` — kanban execution contract enforcement helpers
- Create: `src/core/agents/resolve-agent-registry.ts` — project/host/ad hoc precedence rules
- Create: `src/core/agents/merge-agent-sources.ts` — conflict merge and warnings
- Create: `src/discovery/list-source-candidates.ts` — scan supported sources
- Create: `src/discovery/select-primary-source.ts` — priority + tie-break + degraded mode logic
- Create: `src/discovery/source-override.ts` — manual source override contract
- Create: `src/repository/contracts.ts` — repository boundary interfaces
- Create: `src/repository/canonical/board-yaml-repository.ts` — `.tasks/board.yml` read/write
- Create: `src/repository/canonical/task-markdown-repository.ts` — `.tasks/tasks/*.md` read/write
- Create: `src/repository/fallback/tasks-yml-repository.ts` — `.tasks/tasks.yml` adapter
- Create: `src/repository/fallback/kanban-json-repository.ts` — `.kanban/board.json` adapter
- Create: `src/repository/fallback/markdown-glob-repository.ts` — `tasks/**/*.md`, `issues/**/*.md` adapter
- Create: `src/repository/write/atomic-write.ts` — safe write helper
- Create: `src/repository/write/create-task.ts` — create task use case
- Create: `src/repository/write/update-task.ts` — metadata updates
- Create: `src/repository/write/update-task-status.ts` — status transition persistence
- Create: `src/watch/board-watcher.ts` — file watcher bridge to state refresh
- Create: `src/bridge/orchestrator/publish-task-event.ts` — runtime event publish facade
- Create: `src/bridge/orchestrator/runtime-publisher.ts` — capability-dependent runtime publisher
- Create: `src/host/opencode/probe-capabilities.ts` — capability matrix generation
- Create: `src/host/opencode/emit-capability-matrix.ts` — writes evidence-based capability report
- Create: `src/host/opencode/adapter.ts` — OpenCode-specific glue
- Create: `src/host/opencode/register-commands.ts` — board commands
- Create: `src/host/opencode/register-hotkeys.ts` — hotkey bridge/fallback
- Create: `src/host/opencode/runtime-context.ts` — theme/font/runtime capability lookup
- Create: `src/ui/state/board-store.ts` — board state and refresh orchestration
- Create: `src/ui/view/render-board.ts` — board shell renderer
- Create: `src/ui/view/render-column.ts` — columns
- Create: `src/ui/view/render-card.ts` — cards
- Create: `src/ui/view/render-details.ts` — details/tooltip panel
- Create: `src/ui/view/render-task-form.ts` — create/edit form renderer
- Create: `src/ui/interactions/drag-drop.ts` — status drag-and-drop handlers
- Create: `src/ui/interactions/keyboard-shortcuts.ts` — keyboard navigation
- Create: `src/ui/interactions/task-form.ts` — create/edit flows
- Create: `src/ui/interactions/details-panel.ts` — details opening and updates

### Tests and fixtures

- Create: `tests/smoke/plugin-entry.test.ts`
- Create: `tests/unit/core/*.test.ts`
- Create: `tests/unit/core/agent-registry-sync.test.ts`
- Create: `tests/unit/discovery/*.test.ts`
- Create: `tests/integration/repository/*.test.ts`
- Create: `tests/integration/repository/partial-parse-failure.test.ts`
- Create: `tests/integration/watch/*.test.ts`
- Create: `tests/unit/host/opencode/*.test.ts`
- Create: `tests/ui/*.test.ts`
- Create: `tests/ui/degraded-board.test.ts`
- Create: `tests/e2e/*.test.ts`
- Create: `tests/fixtures/canonical/.tasks/board.yml`
- Create: `tests/fixtures/canonical/.tasks/tasks/task-001.md`
- Create: `tests/fixtures/fallback/.tasks/tasks.yml`
- Create: `tests/fixtures/fallback/.kanban/board.json`
- Create: `tests/fixtures/fallback/tasks/sample-task.md`

### Docs produced during implementation

- Create: `docs/kanban-plugin/opencode-capability-matrix.md`
- Create: `docs/kanban-plugin/USAGE.md`
- Modify: `docs/kanban-plugin/MVP_TASK_LIST.md` only if implementation reveals required re-slicing

## Implementation order

1. Bootstrap TypeScript plugin package and test harness
2. Build core domain contracts and TDD-proven transition/preflight logic
3. Build discovery and source selection, включая manual override contract
4. Build canonical repository and write paths
5. Add fallback adapters and normalization
6. Add watcher and orchestration bridge with dedupe and correlation checks
7. Implement agent registry sync policy
8. Probe OpenCode capabilities and freeze host adapter contract using evidence
9. Build board state and renderer
10. Add degraded diagnostics and partial-failure resilience
11. Add board interactions: DnD, keyboard, create/edit, details
12. Wire plugin entry, run deterministic end-to-end verification, update docs, package MVP

---

### Task 1: Bootstrap package, scripts and plugin entry smoke test

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `src/plugin.ts`
- Create: `tests/smoke/plugin-entry.test.ts`

- [ ] **Step 1: Create Node/npm package scaffold**

```json
{
  "name": "opencode-kanban-plugin",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "probe:opencode": "npm run build && node dist/host/opencode/emit-capability-matrix.js",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run: `npm install @opencode-ai/plugin zod yaml gray-matter fast-glob chokidar`

Run: `npm install -D typescript vitest happy-dom @types/node`

Expected: install completes without `bun` dependency assumptions

- [ ] **Step 3: Write the failing smoke test**

```ts
import { describe, expect, it } from "vitest"
import { plugin } from "../../src/plugin"

describe("plugin entry", () => {
  it("returns a hooks object", async () => {
    const hooks = await plugin({} as never)
    expect(hooks).toBeTypeOf("object")
  })
})
```

- [ ] **Step 4: Run smoke test to verify it fails**

Run: `npm run test -- tests/smoke/plugin-entry.test.ts`

Expected: FAIL because `src/plugin.ts` or exported `plugin` is missing

- [ ] **Step 5: Write minimal plugin entry implementation**

```ts
import type { Plugin } from "@opencode-ai/plugin"

export const plugin: Plugin = async () => {
  return {
    tool: {},
  }
}
```

- [ ] **Step 6: Run smoke test, typecheck and build**

Run: `npm run test -- tests/smoke/plugin-entry.test.ts && npm run typecheck && npm run build`

Expected: PASS, zero type errors, build output generated

- [ ] **Step 7: Commit scaffold**

```bash
git add package.json tsconfig.json vitest.config.ts src/plugin.ts tests/smoke/plugin-entry.test.ts package-lock.json
git commit -m "feat: scaffold kanban plugin package"
```

---

### Task 2: Build canonical schemas, transitions, preflight and kanban contract

**Files:**
- Create: `src/core/types.ts`
- Create: `src/core/schemas.ts`
- Create: `src/core/status/transition.ts`
- Create: `src/core/preflight/run-preflight.ts`
- Create: `src/core/events/task-event.ts`
- Create: `src/core/contract/enforce-kanban.ts`
- Test: `tests/unit/core/transition.test.ts`
- Test: `tests/unit/core/preflight.test.ts`
- Test: `tests/unit/core/task-event.test.ts`

- [ ] **Step 1: Write failing transition and preflight tests**

```ts
it("blocks planned to active when title is missing", () => {
  const result = runPreflight({
    task: { id: "t1", title: "", status: "planned", source_file: ".tasks/tasks/t1.md", updated_at: "2026-03-26T00:00:00Z" },
    targetStatus: "active",
  })

  expect(result.ok).toBe(false)
  expect(result.nextStatus).toBe("blocked")
})

it("rejects active to done direct transition", () => {
  expect(canTransition("active", "done")).toEqual({ ok: false })
})

it("blocks active to review when no evidence artifacts are attached", () => {
  const result = enforceKanbanContract({
    task: { id: "t2", title: "Ship", status: "active", artifacts: [], source_file: ".tasks/tasks/t2.md", updated_at: "2026-03-26T00:00:00Z" },
    targetStatus: "review",
  })

  expect(result.ok).toBe(false)
  expect(result.nextStatus).toBe("blocked")
  expect(result.reason).toMatch(/evidence/i)
})

it("marks side-channel execution as an exception that must be synced back to the task source", () => {
  const result = enforceKanbanContract({
    task: { id: "t3", title: "Investigate", status: "planned", source_file: ".tasks/tasks/t3.md", updated_at: "2026-03-26T00:00:00Z" },
    targetStatus: "active",
    executionMode: "side-channel",
  })

  expect(result.exception).toBe(true)
  expect(result.patch.metadata?.execution_exception).toBe("side-channel")
})

it("blocks activation when required skills or agents are missing", () => {
  const result = runPreflight({
    task: {
      id: "t4",
      title: "UI task",
      status: "planned",
      required_agents: ["frontend"],
      required_skills: ["accessibility"],
      source_file: ".tasks/tasks/t4.md",
      updated_at: "2026-03-26T00:00:00Z",
    },
    targetStatus: "active",
    availableAgents: ["backend"],
    availableSkills: ["testing-tdd"],
    gateResults: [{ key: "ui-review", ok: false, reason: "UI review gate missing" }],
  })

  expect(result.ok).toBe(false)
  expect(result.nextStatus).toBe("blocked")
  expect(result.reason).toMatch(/required|gate/i)
})

it("applies the same lifecycle contract to orchestrator and single-agent mode", () => {
  const orchestratorResult = enforceKanbanContract({ task, targetStatus: "review", actorMode: "orchestrator" })
  const singleAgentResult = enforceKanbanContract({ task, targetStatus: "review", actorMode: "single-agent" })
  expect(singleAgentResult).toEqual(orchestratorResult)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- tests/unit/core/transition.test.ts tests/unit/core/preflight.test.ts tests/unit/core/task-event.test.ts`

Expected: FAIL because transition/preflight/event helpers do not exist yet

- [ ] **Step 3: Implement minimal schemas and rules**

```ts
export const TaskStatusSchema = z.enum([
  "planned",
  "active",
  "review",
  "done",
  "blocked",
  "parked",
  "cancelled",
])

const ALLOWED_TRANSITIONS = {
  planned: ["active", "parked", "cancelled"],
  active: ["review", "blocked"],
  blocked: ["active"],
  review: ["done", "blocked"],
} as const
```

```ts
export function runPreflight(input: PreflightInput): PreflightResult {
  if (input.targetStatus !== "active") return { ok: true, nextStatus: input.targetStatus }
  if (!input.task.title.trim()) return { ok: false, nextStatus: "blocked", reason: "Task title is required before activation" }
  if (!input.task.source_file) return { ok: false, nextStatus: "blocked", reason: "Source file is required before activation" }
  const missingAgents = (input.task.required_agents ?? []).filter((agentId) => !input.availableAgents.includes(agentId))
  if (missingAgents.length > 0) {
    return { ok: false, nextStatus: "blocked", reason: "Required agents are not available for activation" }
  }
  const missingSkills = (input.task.required_skills ?? []).filter((skillId) => !input.availableSkills.includes(skillId))
  if (missingSkills.length > 0) {
    return { ok: false, nextStatus: "blocked", reason: "Required skills are not available for activation" }
  }
  const failingGate = input.gateResults?.find((gate) => !gate.ok)
  if (failingGate) {
    return { ok: false, nextStatus: "blocked", reason: failingGate.reason ?? `Gate failed: ${failingGate.key}` }
  }
  return { ok: true, nextStatus: "active" }
}
```

- [ ] **Step 4: Add task event and kanban enforcement helpers**

```ts
export function createTaskEvent(input: CreateTaskEventInput): TaskEvent {
  return {
    event_id: crypto.randomUUID(),
    correlation_id: input.correlationId,
    task_id: input.task.id,
    from_status: input.from,
    to_status: input.to,
    timestamp: new Date().toISOString(),
    source_file: input.task.source_file,
    initiator: input.initiator,
    preflight_result: input.preflightResult,
  }
}
```

```ts
export function enforceKanbanContract(input: EnforceKanbanContractInput): ContractResult {
  if (input.executionMode === "side-channel") {
    return {
      ok: true,
      exception: true,
      nextStatus: input.targetStatus,
      reason: "Side-channel execution must be synced back to the task source",
      patch: { metadata: { execution_exception: "side-channel" } },
    }
  }

  if (input.targetStatus === "review" && (input.task.artifacts?.length ?? 0) === 0) {
    return {
      ok: false,
      nextStatus: "blocked",
      reason: "Evidence artifacts are required before review",
      patch: { blocked_reason: "Evidence artifacts are required before review" },
    }
  }

  return { ok: true, nextStatus: input.targetStatus, patch: {} }
}
```

- [ ] **Step 5: Run focused unit tests**

Run: `npm run test -- tests/unit/core/transition.test.ts tests/unit/core/preflight.test.ts tests/unit/core/task-event.test.ts`

Expected: PASS for blocked activation, transition rules, event payload schema

- [ ] **Step 6: Run typecheck**

Run: `npm run typecheck`

Expected: PASS

- [ ] **Step 7: Commit core contracts**

```bash
git add src/core tests/unit/core
git commit -m "feat: add kanban domain contracts"
```

---

### Task 3: Implement discovery, source selection and degraded mode rules

**Files:**
- Create: `src/discovery/list-source-candidates.ts`
- Create: `src/discovery/select-primary-source.ts`
- Create: `src/discovery/source-override.ts`
- Test: `tests/unit/discovery/list-source-candidates.test.ts`
- Test: `tests/unit/discovery/select-primary-source.test.ts`
- Create: `tests/fixtures/canonical/.tasks/board.yml`
- Create: `tests/fixtures/fallback/.tasks/tasks.yml`
- Create: `tests/fixtures/fallback/.kanban/board.json`
- Create: `tests/fixtures/fallback/tasks/sample-task.md`

- [ ] **Step 1: Write failing discovery tests for priority and tie-breaks**

```ts
it("prefers .tasks/board.yml over fallback sources", async () => {
  const candidates = await listSourceCandidates(fixtureRoot)
  const selected = selectPrimarySource(candidates)
  expect(selected.kind).toBe("canonical-board-yaml")
})

it("enters degraded mode when same-priority candidates conflict", () => {
  const result = selectPrimarySource(conflictingCandidates)
  expect(result.mode).toBe("degraded")
  expect(result.readOnly).toBe(true)
})

it("prefers the most complete metadata when same-priority candidates are both valid", () => {
  const result = selectPrimarySource(metadataCompletenessCandidates)
  expect(result.path).toBe(metadataCompletenessCandidates[1].path)
})

it("prefers canonical format when completeness is equal", () => {
  const result = selectPrimarySource(equalCompletenessCandidates)
  expect(result.kind).toBe("canonical-board-yaml")
})

it("respects manual source override when provided", () => {
  const result = selectPrimarySource(candidates, { manualOverridePath: ".kanban/board.json" })
  expect(result.path).toBe(".kanban/board.json")
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- tests/unit/discovery/list-source-candidates.test.ts tests/unit/discovery/select-primary-source.test.ts`

Expected: FAIL because discovery modules are missing

- [ ] **Step 3: Implement source candidate scanner**

```ts
const SOURCE_PATTERNS = [
  { kind: "canonical-board-yaml", pattern: ".tasks/board.yml", priority: 1 },
  { kind: "tasks-yml", pattern: ".tasks/tasks.yml", priority: 2 },
  { kind: "kanban-json", pattern: ".kanban/board.json", priority: 3 },
  { kind: "tasks-markdown", pattern: "tasks/**/*.md", priority: 4 },
  { kind: "issues-markdown", pattern: "issues/**/*.md", priority: 5 },
] as const
```

- [ ] **Step 4: Implement primary-source selection**

```ts
export function selectPrimarySource(candidates: SourceCandidate[], input?: { manualOverridePath?: string }): SelectedSource {
  if (input?.manualOverridePath) {
    const overridden = candidates.find((item) => item.path === input.manualOverridePath)
    if (overridden) return { ...overridden, mode: "manual-override", readOnly: false }
  }

  const sorted = [...candidates].sort((a, b) => a.priority - b.priority)
  const best = sorted[0]
  const peers = sorted.filter((item) => item.priority === best.priority)

  if (peers.length === 1) return { ...best, mode: "normal", readOnly: false }

  const fullyValid = peers.filter((item) => item.validity === "valid")
  if (fullyValid.length === 1) return { ...fullyValid[0], mode: "normal", readOnly: false }

  const mostComplete = [...fullyValid].sort((a, b) => b.metadataCompleteness - a.metadataCompleteness)
  if (mostComplete[0] && mostComplete[0].metadataCompleteness !== mostComplete[1]?.metadataCompleteness) {
    return { ...mostComplete[0], mode: "normal", readOnly: false }
  }

  const canonicalPreferred = peers.find((item) => item.kind === "canonical-board-yaml")
  if (canonicalPreferred) return { ...canonicalPreferred, mode: "normal", readOnly: false }

  return { ...peers[0], mode: "degraded", readOnly: true, warning: "Conflicting same-priority task sources detected" }
}
```

- [ ] **Step 5: Run focused discovery tests**

Run: `npm run test -- tests/unit/discovery/list-source-candidates.test.ts tests/unit/discovery/select-primary-source.test.ts`

Expected: PASS for priority, tie-break and degraded mode

- [ ] **Step 6: Commit discovery layer**

```bash
git add src/discovery tests/unit/discovery tests/fixtures
git commit -m "feat: add task source discovery"
```

---

### Task 4: Implement canonical repositories and create/edit/status write paths

**Files:**
- Create: `src/repository/contracts.ts`
- Create: `src/repository/canonical/board-yaml-repository.ts`
- Create: `src/repository/canonical/task-markdown-repository.ts`
- Create: `src/repository/write/atomic-write.ts`
- Create: `src/repository/write/create-task.ts`
- Create: `src/repository/write/update-task.ts`
- Create: `src/repository/write/update-task-status.ts`
- Test: `tests/integration/repository/canonical-repository.test.ts`

- [ ] **Step 1: Write failing repository integration tests**

```ts
it("creates a new task markdown file in canonical storage", async () => {
  const created = await createTask(repository, {
    title: "New task",
    status: "planned",
  })

  expect(created.source_file).toMatch(/\.tasks\/tasks\/.+\.md$/)
})

it("updates task status and persists blocked reason", async () => {
  await updateTaskStatus(repository, "task-001", {
    from: "planned",
    to: "blocked",
    blocked_reason: "Missing required skills",
  })

  const task = await repository.loadTaskById("task-001")
  expect(task?.blocked_reason).toBe("Missing required skills")
})

it("persists side-channel execution exception metadata back to the task source", async () => {
  await updateTask(repository, "task-001", {
    metadata: { execution_exception: "side-channel" },
  })

  const task = await repository.loadTaskById("task-001")
  expect(task?.metadata?.execution_exception).toBe("side-channel")
})
```

- [ ] **Step 2: Run repository tests to verify they fail**

Run: `npm run test -- tests/integration/repository/canonical-repository.test.ts`

Expected: FAIL because repository implementation does not exist yet

- [ ] **Step 3: Implement repository contract and atomic write helper**

```ts
export interface TaskRepository {
  loadBoard(): Promise<Board>
  loadTasks(): Promise<TaskCard[]>
  loadTaskById(id: string): Promise<TaskCard | null>
  writeTaskStatus(id: string, input: StatusWriteInput): Promise<TaskCard>
  writeTaskMetadata(id: string, input: TaskPatch): Promise<TaskCard>
  createTask(input: CreateTaskInput): Promise<TaskCard>
}
```

```ts
export async function atomicWrite(filePath: string, content: string) {
  const tempPath = `${filePath}.tmp`
  await fs.writeFile(tempPath, content, "utf8")
  await fs.rename(tempPath, filePath)
}
```

- [ ] **Step 4: Implement board/task canonical repositories**

```ts
export async function createTask(repository: TaskRepository, input: CreateTaskInput) {
  return repository.createTask({
    ...input,
    id: slugify(input.title),
    updated_at: new Date().toISOString(),
  })
}
```

- [ ] **Step 5: Run repository integration tests**

Run: `npm run test -- tests/integration/repository/canonical-repository.test.ts`

Expected: PASS for create, edit and status persistence in `.tasks/tasks/*.md`

- [ ] **Step 6: Run typecheck**

Run: `npm run typecheck`

Expected: PASS

- [ ] **Step 7: Commit canonical repository layer**

```bash
git add src/repository tests/integration/repository
git commit -m "feat: add canonical task repositories"
```

---

### Task 5: Add fallback adapters and normalization into canonical model

**Files:**
- Create: `src/repository/fallback/tasks-yml-repository.ts`
- Create: `src/repository/fallback/kanban-json-repository.ts`
- Create: `src/repository/fallback/markdown-glob-repository.ts`
- Modify: `src/core/schemas.ts`
- Test: `tests/unit/repository/fallback-normalization.test.ts`

- [ ] **Step 1: Write failing normalization tests for legacy formats**

```ts
it("defaults missing optional fields when loading legacy task yaml", async () => {
  const tasks = await repository.loadTasks()
  expect(tasks[0].priority).toBe("medium")
  expect(tasks[0].required_skills).toEqual([])
})

it("marks fallback markdown sources as read-only when write format is unknown", async () => {
  expect((await repository.loadBoard()).readOnly).toBe(true)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- tests/unit/repository/fallback-normalization.test.ts`

Expected: FAIL because fallback adapters are missing

- [ ] **Step 3: Implement normalization defaults**

```ts
function normalizeTask(input: Partial<TaskCard> & Pick<TaskCard, "id" | "title" | "status" | "source_file" | "updated_at">): TaskCard {
  return {
    description: "",
    priority: "medium",
    assignees: [],
    required_agents: [],
    required_skills: [],
    progress: 0,
    artifacts: [],
    ...input,
  }
}
```

- [ ] **Step 4: Implement fallback repositories**

```ts
export class MarkdownGlobRepository implements TaskRepository {
  async createTask() {
    throw new Error("Read-only fallback source; migrate to canonical .tasks/tasks/*.md to enable writes")
  }
}
```

- [ ] **Step 5: Run focused fallback tests**

Run: `npm run test -- tests/unit/repository/fallback-normalization.test.ts`

Expected: PASS for defaults, read-only behavior and normalization

- [ ] **Step 6: Commit fallback adapter slice**

```bash
git add src/repository/fallback src/core/schemas.ts tests/unit/repository
git commit -m "feat: add fallback task adapters"
```

---

### Task 6: Implement watcher, event publishing and reconcile flow

**Files:**
- Create: `src/watch/board-watcher.ts`
- Create: `src/bridge/orchestrator/publish-task-event.ts`
- Create: `src/bridge/orchestrator/runtime-publisher.ts`
- Test: `tests/integration/watch/board-watcher.test.ts`
- Test: `tests/integration/bridge/publish-task-event.test.ts`

- [ ] **Step 1: Write failing watcher and event tests**

```ts
it("refreshes board state when a task file changes", async () => {
  const refresh = vi.fn()
  const watcher = createBoardWatcher({ rootDir, onRefresh: refresh })
  await touch(taskFile)
  await waitFor(() => expect(refresh).toHaveBeenCalled())
  await watcher.close()
})

it("keeps file write successful even when runtime event publish fails", async () => {
  const result = await publishTaskEvent({ runtimePublisher: failingPublisher, event })
  expect(result.fileWriteCommitted).toBe(true)
  expect(result.runtimePublished).toBe(false)
})

it("does not publish the same event twice", async () => {
  await publishTaskEvent({ runtimePublisher, event, publishedEventIds })
  const second = await publishTaskEvent({ runtimePublisher, event, publishedEventIds })
  expect(second.deduplicated).toBe(true)
})

it("keeps correlation id stable between write and publish path", async () => {
  const result = await publishTaskEvent({ runtimePublisher, event, publishedEventIds })
  expect(result.correlation_id).toBe(event.correlation_id)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- tests/integration/watch/board-watcher.test.ts tests/integration/bridge/publish-task-event.test.ts`

Expected: FAIL because watcher and bridge do not exist yet

- [ ] **Step 3: Implement board watcher**

```ts
export function createBoardWatcher(input: CreateBoardWatcherInput) {
  const watcher = chokidar.watch(input.patterns, { cwd: input.rootDir, ignoreInitial: true })
  watcher.on("add", input.onRefresh)
  watcher.on("change", input.onRefresh)
  watcher.on("unlink", input.onRefresh)
  return watcher
}
```

- [ ] **Step 4: Implement idempotent event publish facade**

```ts
export async function publishTaskEvent(input: PublishTaskEventInput) {
  if (input.publishedEventIds.has(input.event.event_id)) {
    return { fileWriteCommitted: true, runtimePublished: false, deduplicated: true, correlation_id: input.event.correlation_id }
  }

  try {
    await input.runtimePublisher.publish(input.event)
    input.publishedEventIds.add(input.event.event_id)
    return { fileWriteCommitted: true, runtimePublished: true, correlation_id: input.event.correlation_id }
  } catch (error) {
    return { fileWriteCommitted: true, runtimePublished: false, warning: String(error), correlation_id: input.event.correlation_id }
  }
}
```

- [ ] **Step 5: Run focused integration tests**

Run: `npm run test -- tests/integration/watch/board-watcher.test.ts tests/integration/bridge/publish-task-event.test.ts`

Expected: PASS for refresh, best-effort runtime publish, dedupe by `event_id` and stable `correlation_id`

- [ ] **Step 6: Commit watcher and bridge**

```bash
git add src/watch src/bridge tests/integration/watch tests/integration/bridge
git commit -m "feat: add board watcher and event bridge"
```

---

### Task 6A: Implement agent registry sync policy

**Files:**
- Create: `src/core/agents/resolve-agent-registry.ts`
- Create: `src/core/agents/merge-agent-sources.ts`
- Modify: `src/repository/canonical/board-yaml-repository.ts`
- Test: `tests/unit/core/agent-registry-sync.test.ts`

- [ ] **Step 1: Write failing agent registry tests**

```ts
it("prefers local project agents over host and ad hoc agents", () => {
  const result = resolveAgentRegistry({ localAgents, hostAgents, adHocAgents })
  expect(result.byId.frontend.source).toBe("local")
})

it("persists ad hoc agents next to board metadata without overwriting local agents", async () => {
  const updatedBoard = await saveAdHocAgent(boardRepository, adHocAgent)
  expect(updatedBoard.agent_registry.ad_hoc[0].id).toBe(adHocAgent.id)
})

it("emits a warning when ids conflict across sources", () => {
  const result = mergeAgentSources({ localAgents, hostAgents, adHocAgents })
  expect(result.warnings[0]).toMatch(/conflict/i)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- tests/unit/core/agent-registry-sync.test.ts`

Expected: FAIL because registry merge logic is missing

- [ ] **Step 3: Implement precedence and conflict rules**

```ts
const SOURCE_PRIORITY = { local: 1, host: 2, adHoc: 3 } as const

export function resolveAgentRegistry(input: ResolveAgentRegistryInput) {
  return mergeAgentSources(input, SOURCE_PRIORITY)
}
```

- [ ] **Step 4: Persist ad hoc agents next to board metadata**

```ts
export async function saveAdHocAgent(boardRepository: BoardYamlRepository, agent: AgentRecord) {
  return boardRepository.updateAgentRegistry((registry) => ({
    ...registry,
    ad_hoc: [...registry.ad_hoc, agent],
  }))
}
```

- [ ] **Step 5: Run registry tests**

Run: `npm run test -- tests/unit/core/agent-registry-sync.test.ts`

Expected: PASS for precedence `local > host > ad hoc`, persistence and warnings

- [ ] **Step 6: Commit agent registry sync policy**

```bash
git add src/core/agents src/repository/canonical/board-yaml-repository.ts tests/unit/core/agent-registry-sync.test.ts
git commit -m "feat: add agent registry sync policy"
```

---

### Task 7: Freeze OpenCode capability matrix and host adapter boundary

**Files:**
- Create: `src/host/opencode/probe-capabilities.ts`
- Create: `src/host/opencode/emit-capability-matrix.ts`
- Create: `src/host/opencode/adapter.ts`
- Create: `src/host/opencode/register-commands.ts`
- Create: `src/host/opencode/register-hotkeys.ts`
- Create: `src/host/opencode/runtime-context.ts`
- Create: `docs/kanban-plugin/opencode-capability-matrix.md`
- Test: `tests/unit/host/opencode/probe-capabilities.test.ts`
- Test: `tests/unit/host/opencode/register-commands.test.ts`
- Test: `tests/unit/host/opencode/register-hotkeys.test.ts`

- [ ] **Step 1: Write failing tests for capability classification**

```ts
it("records evidence for each host surface instead of hardcoding support", async () => {
  const matrix = await probeCapabilities(installedPluginSurface)
  expect(matrix.overlay.evidence.length).toBeGreaterThan(0)
  expect(matrix.overlay.verified_at).toMatch(/^2026|^20/)
})

it("marks canonical fallback for every unverified or unsupported surface", async () => {
  const matrix = await probeCapabilities(installedPluginSurface)
  expect(matrix.commands.fallback).toBeTruthy()
  expect(matrix.runtimeEvents.fallback).toBeTruthy()
})

it("registers open, close and manual rescan board commands", async () => {
  const commands = registerBoardCommands(fakeAdapter)
  expect(commands.openBoard.id).toBe("kanban.openBoard")
  expect(commands.closeBoard.id).toBe("kanban.closeBoard")
  expect(commands.manualRescan.id).toBe("kanban.manualRescan")
})

it("registers a hotkey that opens the board", () => {
  const hotkeys = registerBoardHotkeys(fakeAdapter)
  expect(hotkeys.openBoard.id).toBe("kanban.hotkey.openBoard")
  expect(hotkeys.toggleBoard.id).toBe("kanban.hotkey.toggleBoard")
  expect(hotkeys.openDetails.id).toBe("kanban.hotkey.openDetails")
  expect(hotkeys.manualRescan.id).toBe("kanban.hotkey.manualRescan")
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- tests/unit/host/opencode/probe-capabilities.test.ts`

Expected: FAIL because probe logic is missing

- [ ] **Step 3: Implement evidence-based capability probe and fallback mapping**

```ts
export async function probeCapabilities(surface: InstalledPluginSurface): Promise<CapabilityMatrix> {
  const verifiedAt = new Date().toISOString()
  const exportKeys = Object.keys(await import("@opencode-ai/plugin"))

  return {
    overlay: {
      status: exportKeys.some((key) => key.toLowerCase().includes("overlay")) ? "verified" : "unsupported",
      evidence: [`exports=${exportKeys.join(",")}`],
      fallback: "command-panel",
      verified_at: verifiedAt,
    },
    commands: {
      status: exportKeys.some((key) => key.toLowerCase().includes("command")) ? "unverified" : "unsupported",
      evidence: ["No explicit command registration export verified in installed package surface"],
      fallback: "tool-triggered open board flow",
      verified_at: verifiedAt,
    },
    hotkeys: {
      status: "unverified",
      evidence: ["Requires live OpenCode host validation"],
      fallback: "keyboard handling inside mounted board surface only",
      verified_at: verifiedAt,
    },
    runtimeEvents: {
      status: "unverified",
      evidence: ["Plugin hooks are present, but runtime publish path must be host-validated"],
      fallback: "file-change-first orchestration",
      verified_at: verifiedAt,
    },
    themeContext: {
      status: "unverified",
      evidence: ["No theme/font lookup API verified from installed package exports"],
      fallback: "plugin-default monochrome theme tokens",
      verified_at: verifiedAt,
    },
  }
}
```

- [ ] **Step 4: Implement minimal host adapter and capability report emitter**

```ts
export function createOpenCodeAdapter(matrix: CapabilityMatrix): OpenCodeAdapter {
  return {
    preferredBoardSurface: matrix.overlay.status === "verified" ? "overlay" : "command-panel",
    supportsRuntimeEvents: matrix.runtimeEvents.status === "verified",
  }
}
```

```ts
export async function emitCapabilityMatrix(filePath: string, matrix: CapabilityMatrix) {
  const markdown = renderCapabilityMatrixMarkdown(matrix)
  await fs.writeFile(filePath, markdown, "utf8")
}
```

```ts
export function registerBoardCommands(adapter: OpenCodeAdapter) {
  return {
    openBoard: { id: "kanban.openBoard", run: () => adapter.openBoard() },
    closeBoard: { id: "kanban.closeBoard", run: () => adapter.closeBoard() },
    manualRescan: { id: "kanban.manualRescan", run: () => adapter.rescanBoard() },
  }
}
```

```ts
export function registerBoardHotkeys(adapter: OpenCodeAdapter) {
  return {
    openBoard: { id: "kanban.hotkey.openBoard", run: () => adapter.openBoard() },
    toggleBoard: { id: "kanban.hotkey.toggleBoard", run: () => adapter.toggleBoard() },
    openDetails: { id: "kanban.hotkey.openDetails", run: () => adapter.openSelectedTaskDetails() },
    manualRescan: { id: "kanban.hotkey.manualRescan", run: () => adapter.rescanBoard() },
  }
}
```

- [ ] **Step 5: Run probe tests, build and emit matrix report**

Run: `npm run test -- tests/unit/host/opencode/probe-capabilities.test.ts tests/unit/host/opencode/register-commands.test.ts tests/unit/host/opencode/register-hotkeys.test.ts && npm run typecheck && npm run probe:opencode`

Expected: PASS; `docs/kanban-plugin/opencode-capability-matrix.md` contains `status`, `evidence`, `fallback`, `verified_at`

- [ ] **Step 6: Run live OpenCode host verification for critical surfaces**

Procedure: load the built plugin into OpenCode dev instance, run the capability probe entry, then execute `kanban.openBoard`, `kanban.closeBoard`, `kanban.manualRescan`, `kanban.hotkey.openBoard`, `kanban.hotkey.toggleBoard`, `kanban.hotkey.manualRescan` and append host-observed evidence to `docs/kanban-plugin/opencode-capability-matrix.md`

Expected: board-open surface, open-board command, open-board hotkey, toggle-board hotkey, close-board command, manual-rescan command and manual-rescan hotkey end with status `verified` or `unsupported` only; no critical surface remains `unverified`

- [ ] **Step 7: Enforce capability exit criteria before continuing**

Rule: do not proceed to board UI execution tasks while any critical surface (`preferred board surface`, `open board command`, `open board hotkey`, `toggle board hotkey`, `manual rescan command`, `manual rescan hotkey`, `runtime event publish path`) remains `unverified`

Fallback: if live OpenCode host is unavailable in the execution environment, classify every still-`unverified` critical surface as `unsupported-by-environment`, record the missing evidence in `docs/kanban-plugin/opencode-capability-matrix.md`, switch MVP to command-first/file-first mode, and continue only with the documented fallback path

- [ ] **Step 8: Commit host capability slice**

```bash
git add src/host/opencode docs/kanban-plugin/opencode-capability-matrix.md tests/unit/host/opencode
git commit -m "feat: add opencode capability matrix"
```

---

### Task 8: Build board state layer and renderer states

**Files:**
- Create: `src/ui/state/board-store.ts`
- Create: `src/ui/view/render-board.ts`
- Create: `src/ui/view/render-column.ts`
- Create: `src/ui/view/render-card.ts`
- Create: `src/ui/view/render-details.ts`
- Test: `tests/ui/render-board.test.ts`

- [ ] **Step 1: Write failing UI state tests**

```ts
it("renders loading, empty, error and success states", () => {
  const root = document.createElement("div")
  renderBoard(root, { state: "loading" })
  expect(root.textContent).toContain("Loading")
})

it("renders task cards with blocker and agent metadata", () => {
  const root = document.createElement("div")
  renderBoard(root, successState)
  expect(root.textContent).toContain("blocked")
  expect(root.textContent).toContain("frontend")
})
```

- [ ] **Step 2: Run UI tests to verify they fail**

Run: `npm run test -- tests/ui/render-board.test.ts`

Expected: FAIL because renderer modules do not exist yet

- [ ] **Step 3: Implement board store and shell renderer**

```ts
export type BoardViewState =
  | { state: "loading" }
  | { state: "empty"; message: string }
  | { state: "error"; message: string }
  | { state: "success"; board: Board; tasks: TaskCard[] }
```

- [ ] **Step 4: Implement column, card and details renderers**

```ts
export function renderCard(task: TaskCard) {
  const el = document.createElement("article")
  el.dataset.taskId = task.id
  el.textContent = `${task.title} ${task.status}`
  return el
}
```

- [ ] **Step 5: Run focused UI tests**

Run: `npm run test -- tests/ui/render-board.test.ts`

Expected: PASS for state rendering and card metadata visibility

- [ ] **Step 6: Commit board renderer shell**

```bash
git add src/ui/state src/ui/view tests/ui/render-board.test.ts
git commit -m "feat: add kanban board renderer"
```

---

### Task 8A: Add degraded diagnostics and partial-failure resilience

**Files:**
- Modify: `src/ui/state/board-store.ts`
- Modify: `src/ui/view/render-board.ts`
- Test: `tests/integration/repository/partial-parse-failure.test.ts`
- Test: `tests/ui/degraded-board.test.ts`

- [ ] **Step 1: Write failing resilience tests**

```ts
it("keeps the board readable when one task file fails to parse", async () => {
  const board = await loadBoardWithDiagnostics(fixtureWithBrokenTask)
  expect(board.tasks.length).toBeGreaterThan(0)
  expect(board.diagnostics[0].severity).toBe("warning")
})

it("renders degraded diagnostics instead of crashing the whole board", () => {
  const root = document.createElement("div")
  renderBoard(root, degradedState)
  expect(root.textContent).toContain("warning")
})
```

- [ ] **Step 2: Run resilience tests to verify they fail**

Run: `npm run test -- tests/integration/repository/partial-parse-failure.test.ts tests/ui/degraded-board.test.ts`

Expected: FAIL because degraded diagnostics path does not exist yet

- [ ] **Step 3: Implement diagnostic aggregation for partial parse failures**

```ts
export function toDegradedBoardState(board: Board, diagnostics: BoardDiagnostic[]): BoardViewState {
  return { state: "success", board, tasks: board.tasks, diagnostics }
}
```

- [ ] **Step 4: Run resilience tests**

Run: `npm run test -- tests/integration/repository/partial-parse-failure.test.ts tests/ui/degraded-board.test.ts`

Expected: PASS; one broken file no longer breaks the entire board

- [ ] **Step 5: Commit resilience slice**

```bash
git add src/ui/state/board-store.ts src/ui/view/render-board.ts tests/integration/repository/partial-parse-failure.test.ts tests/ui/degraded-board.test.ts
git commit -m "feat: add degraded board diagnostics"
```

---

### Task 9: Add interactions for drag-drop, keyboard, create/edit and details

**Files:**
- Create: `src/ui/view/render-task-form.ts`
- Create: `src/ui/interactions/drag-drop.ts`
- Create: `src/ui/interactions/keyboard-shortcuts.ts`
- Create: `src/ui/interactions/task-form.ts`
- Create: `src/ui/interactions/details-panel.ts`
- Test: `tests/ui/task-interactions.test.ts`

- [ ] **Step 1: Write failing interaction tests**

```ts
it("moves a card to blocked after failed preflight", async () => {
  const result = await handleDrop({ task, targetStatus: "active" })
  expect(result.nextStatus).toBe("blocked")
})

it("creates a task from form input and persists it", async () => {
  await submitTaskForm({ title: "Write docs", status: "planned" })
  expect(repository.createTask).toHaveBeenCalled()
})

it("supports keyboard navigation, quick status change and opening details", async () => {
  const controller = createKeyboardController(deps)
  expect(controller.handle("ArrowRight")).toBe("focus-next-card")
  expect(controller.handle("ArrowLeft")).toBe("focus-previous-card")
  expect(controller.handle("KeyR")).toBe("set-status-review")
  expect(controller.handle("Enter")).toBe("open-details")
  expect(controller.handle("KeyU")).toBe("manual-rescan")
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- tests/ui/task-interactions.test.ts`

Expected: FAIL because interaction handlers are missing

- [ ] **Step 3: Implement drag/drop and keyboard actions**

```ts
export async function handleDrop(input: HandleDropInput) {
  const preflight = runPreflight({ task: input.task, targetStatus: input.targetStatus })
  const nextStatus = preflight.ok ? input.targetStatus : "blocked"
  return input.updateTaskStatus(input.task.id, { from: input.task.status, to: nextStatus, blocked_reason: preflight.reason })
}
```

- [ ] **Step 4: Implement create/edit form flows and details panel**

```ts
export async function submitTaskForm(input: SubmitTaskFormInput) {
  if (input.taskId) return input.updateTask(input.taskId, input.patch)
  return input.createTask(input.patch)
}
```

- [ ] **Step 5: Run focused interaction tests**

Run: `npm run test -- tests/ui/task-interactions.test.ts`

Expected: PASS for DnD, keyboard navigation, quick status actions, create/edit flows and details updates

- [ ] **Step 6: Commit board interactions**

```bash
git add src/ui/interactions src/ui/view/render-task-form.ts tests/ui/task-interactions.test.ts
git commit -m "feat: add kanban board interactions"
```

---

### Task 10: Wire plugin entry, verify end-to-end flow, update docs and package MVP

**Files:**
- Modify: `src/plugin.ts`
- Test: `tests/e2e/plugin-mvp-flow.test.ts`
- Create: `docs/kanban-plugin/USAGE.md`
- Modify: `docs/kanban-plugin/MVP_TASK_LIST.md` if implementation slicing changed
- Modify: `package.json`

- [ ] **Step 1: Write failing end-to-end test**

```ts
it("moves a valid planned task to active", async () => {
  const app = await createPluginApp(validFixtureRoot)
  await app.moveTask("task-valid", "active")
  const after = await app.loadBoard()
  expect(after.tasks.find((task) => task.id === "task-valid")?.status).toBe("active")
})

it("moves an invalid planned task to blocked and writes blocked_reason", async () => {
  const app = await createPluginApp(invalidFixtureRoot)
  await app.moveTask("task-invalid", "active")
  const after = await app.loadBoard()
  expect(after.tasks.find((task) => task.id === "task-invalid")?.status).toBe("blocked")
  expect(after.tasks.find((task) => task.id === "task-invalid")?.blocked_reason).toMatch(/required/i)
})
```

- [ ] **Step 2: Run end-to-end test to verify it fails**

Run: `npm run test -- tests/e2e/plugin-mvp-flow.test.ts`

Expected: FAIL because plugin wiring is incomplete

- [ ] **Step 3: Wire plugin entry to discovery, repositories, watcher, host adapter and UI store**

```ts
export const plugin: Plugin = async (input) => {
  const matrix = await probeCapabilities({ directory: input.directory })
  const adapter = createOpenCodeAdapter(matrix)
  const app = await createPluginApp({ directory: input.directory, adapter, client: input.client })

  return {
    tool: app.tools,
    event: app.handleEvent,
  }
}
```

- [ ] **Step 4: Write usage documentation and packaging notes**

```md
1. Install dependencies with `npm install`
2. Run `npm run test`
3. Run `npm run build`
4. Point OpenCode plugin loader at the built entry file
```

- [ ] **Step 5: Run full verification suite**

Run: `npm run test && npm run typecheck && npm run build`

Expected: all tests pass, zero type errors, build succeeds

- [ ] **Step 6: Commit integrated MVP**

```bash
git add src tests docs/kanban-plugin/USAGE.md package.json package-lock.json
git commit -m "feat: deliver kanban plugin mvp"
```

---

## Review and execution protocol

### Before implementation starts

- Use `@using-git-worktrees` to create isolated workspace if possible
- Create feature branch such as `feature/kanban-plugin-mvp`
- Re-read `.tasks/in-progress/task-002-kanban-implementation-plan.md`

### During implementation

- One plan task at a time
- Fresh implementer subagent per task
- After each task: spec compliance review, then code quality review
- No task marked complete until its focused verification command passes

### After final implementation task

- Run one final whole-plan review
- Use `@finishing-a-development-branch`
- Only create commit/PR when appropriate and after verification
