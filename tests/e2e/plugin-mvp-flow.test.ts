/**
 * E2E plugin MVP flow — exercises all 5 data tools against real filesystem.
 * Uses temp directories, no mocks. The 6th tool (open_board) spawns a binary
 * and is covered by unit tests instead.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { mkdtemp, mkdir, rm, writeFile, readFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import {
  BoardYamlRepository,
  TaskMarkdownRepository,
  loadBoardWithDiagnostics,
  updateTaskStatus,
  createTaskEvent,
  publishTaskEvent,
  type RuntimePublisher,
} from "@openkanban/core"

import { makeCreateTaskHandler } from "../../packages/plugin/src/tools/create-task.js"
import { makeGetTaskHandler } from "../../packages/plugin/src/tools/get-task.js"
import { makeListTasksHandler } from "../../packages/plugin/src/tools/list-tasks.js"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createCanonicalWorkspace(rootDir: string) {
  const tasksDir = join(rootDir, ".tasks", "tasks")
  await mkdir(tasksDir, { recursive: true })

  await writeFile(
    join(rootDir, ".tasks", "board.yml"),
    [
      "board:",
      "  id: e2e-board",
      "  title: E2E Test Board",
      "  columns:",
      "    - id: planned",
      "      title: Planned",
      "    - id: active",
      "      title: Active",
      "    - id: review",
      "      title: Review",
      "    - id: done",
      "      title: Done",
      "    - id: blocked",
      "      title: Blocked",
      "",
    ].join("\n"),
    "utf8",
  )

  await writeFile(
    join(tasksDir, "seed-task.md"),
    [
      "---",
      "id: seed-task",
      "title: Seed task for E2E",
      "status: planned",
      "source_file: .tasks/tasks/seed-task.md",
      "updated_at: 2026-04-08T00:00:00Z",
      "---",
      "",
      "This is a seed task created for the E2E test suite.",
      "",
    ].join("\n"),
    "utf8",
  )
}

function noopPublisher(): RuntimePublisher {
  return { publish: async () => {} }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("plugin MVP e2e flow", () => {
  let rootDir: string
  let taskRepo: InstanceType<typeof TaskMarkdownRepository>
  let createTask: ReturnType<typeof makeCreateTaskHandler>
  let getTask: ReturnType<typeof makeGetTaskHandler>
  let listTasks: ReturnType<typeof makeListTasksHandler>

  beforeEach(async () => {
    rootDir = await mkdtemp(join(tmpdir(), "kanban-e2e-plugin-"))
    await createCanonicalWorkspace(rootDir)
    taskRepo = new TaskMarkdownRepository(rootDir)
    createTask = makeCreateTaskHandler(taskRepo)
    getTask = makeGetTaskHandler(taskRepo)
    listTasks = makeListTasksHandler(taskRepo)
  })

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true })
  })

  // -----------------------------------------------------------------------
  // 1. Full CRUD cycle
  // -----------------------------------------------------------------------
  describe("full CRUD cycle", () => {
    it("loads board with correct structure", async () => {
      const boardState = await loadBoardWithDiagnostics(rootDir)
      expect(boardState.state).toBe("success")
      expect(boardState.board.columns).toBeDefined()
      expect(boardState.board.columns.length).toBeGreaterThanOrEqual(4)
    })

    it("creates a task, lists it, gets it by id, moves it, and filters", async () => {
      // Create
      const createResult = JSON.parse(await createTask({ title: "Fix login bug" }))
      expect(createResult.id).toBe("fix-login-bug")
      expect(createResult.status).toBe("planned")
      expect(createResult.title).toBe("Fix login bug")

      // List — should include seed + new task
      const allTasks = JSON.parse(await listTasks({}))
      expect(allTasks.length).toBeGreaterThanOrEqual(2)
      const ids = allTasks.map((t: { id: string }) => t.id)
      expect(ids).toContain("fix-login-bug")
      expect(ids).toContain("seed-task")

      // Get by id
      const fetched = JSON.parse(await getTask({ taskId: "fix-login-bug" }))
      expect(fetched.id).toBe("fix-login-bug")
      expect(fetched.title).toBe("Fix login bug")

      // Move planned → active
      const moved = await updateTaskStatus(taskRepo, "fix-login-bug", {
        from: "planned",
        to: "active",
      })
      expect(moved.status).toBe("active")

      // Verify event creation doesn't throw
      const event = createTaskEvent({
        task: moved,
        from: "planned",
        to: "active",
        initiator: "agent",
        correlationId: `fix-login-bug:${Date.now()}`,
        preflightResult: "passed",
      })
      expect(event.task_id).toBe("fix-login-bug")
      expect(event.from_status).toBe("planned")
      expect(event.to_status).toBe("active")

      const publishedIds = new Set<string>()
      await publishTaskEvent({
        runtimePublisher: noopPublisher(),
        event,
        publishedEventIds: publishedIds,
      })
      expect(publishedIds.size).toBe(1)

      // Verify move persisted on disk
      const reloaded = JSON.parse(await getTask({ taskId: "fix-login-bug" }))
      expect(reloaded.status).toBe("active")

      // Filter by status
      const activeTasks = JSON.parse(await listTasks({ status: "active" }))
      expect(activeTasks.every((t: { status: string }) => t.status === "active")).toBe(true)
      expect(activeTasks.some((t: { id: string }) => t.id === "fix-login-bug")).toBe(true)
    })
  })

  // -----------------------------------------------------------------------
  // 2. Error handling
  // -----------------------------------------------------------------------
  describe("error handling", () => {
    it("throws when getting a non-existent task", async () => {
      await expect(getTask({ taskId: "does-not-exist" })).rejects.toThrow(
        "Task not found: does-not-exist",
      )
    })

    it("throws when moving a non-existent task", async () => {
      await expect(
        updateTaskStatus(taskRepo, "ghost-task", { from: "planned", to: "active" }),
      ).rejects.toThrow()
    })
  })

  // -----------------------------------------------------------------------
  // 3. Create task with metadata (priority)
  // -----------------------------------------------------------------------
  describe("task metadata", () => {
    it("creates a task with priority and persists it", async () => {
      const result = JSON.parse(
        await createTask({ title: "Urgent fix", priority: "high" }),
      )
      expect(result.id).toBe("urgent-fix")

      // Reload from disk and check priority was persisted
      const loaded = await taskRepo.loadTaskById("urgent-fix")
      expect(loaded).toBeDefined()
      // Priority is stored in metadata
      expect(loaded!.metadata?.priority).toBe("high")
    })

    it("creates a task with assignee", async () => {
      const result = JSON.parse(
        await createTask({ title: "Assigned task", assignee: "alice" }),
      )
      expect(result.id).toBe("assigned-task")

      const loaded = await taskRepo.loadTaskById("assigned-task")
      expect(loaded).toBeDefined()
      // Assignee stored in metadata
      expect(loaded!.metadata?.assignee).toBe("alice")
    })
  })

  // -----------------------------------------------------------------------
  // 4. Multi-task board state
  // -----------------------------------------------------------------------
  describe("multi-task board state", () => {
    it("handles multiple tasks with different statuses", async () => {
      // Create 3 tasks
      await createTask({ title: "Task Alpha", status: "planned" })
      await createTask({ title: "Task Beta", status: "active" })
      await createTask({ title: "Task Gamma", status: "review" })

      // List all — seed + 3 new = 4
      const all = JSON.parse(await listTasks({}))
      expect(all).toHaveLength(4)

      // Filter planned — seed + alpha
      const planned = JSON.parse(await listTasks({ status: "planned" }))
      expect(planned).toHaveLength(2)
      const plannedIds = planned.map((t: { id: string }) => t.id)
      expect(plannedIds).toContain("seed-task")
      expect(plannedIds).toContain("task-alpha")

      // Filter active — beta only
      const active = JSON.parse(await listTasks({ status: "active" }))
      expect(active).toHaveLength(1)
      expect(active[0].id).toBe("task-beta")

      // Filter review — gamma only
      const review = JSON.parse(await listTasks({ status: "review" }))
      expect(review).toHaveLength(1)
      expect(review[0].id).toBe("task-gamma")
    })

    it("move task to blocked with reason", async () => {
      const moved = await updateTaskStatus(taskRepo, "seed-task", {
        from: "planned",
        to: "blocked",
        blocked_reason: "Waiting for API access",
      })
      expect(moved.status).toBe("blocked")

      const loaded = await taskRepo.loadTaskById("seed-task")
      expect(loaded!.status).toBe("blocked")
      expect(loaded!.blocked_reason).toBe("Waiting for API access")
    })
  })
})
