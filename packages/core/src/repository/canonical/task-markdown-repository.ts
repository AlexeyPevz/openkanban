import { mkdir, readFile } from "node:fs/promises"
import { join, relative } from "node:path"

import fg from "fast-glob"
import matter from "gray-matter"

import {
  type CreateTaskInput,
  parseTaskCard,
  type StatusWriteInput,
  type TaskPatch,
  type TaskRepository,
} from "../contracts.js"
import type { TaskCard } from "../../types.js"
import { atomicWrite } from "../write/atomic-write.js"

export interface TaskRepositoryDiagnostic {
  severity: "warning" | "error"
  source: string
  message: string
}

function normalizePath(value: string): string {
  return value.replaceAll("\\", "/")
}

function normalizeUpdatedAt(value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString()
  }

  return value
}

async function parseTaskFile(rootDir: string, match: string): Promise<TaskCard> {
  const absolutePath = join(rootDir, match)
  const rawTask = await readFile(absolutePath, "utf8")
  const parsed = matter(rawTask)

  return parseTaskCard({
    ...parsed.data,
    updated_at: normalizeUpdatedAt(parsed.data.updated_at),
    source_file: parsed.data.source_file ?? normalizePath(relative(rootDir, absolutePath)),
  })
}

export async function loadCanonicalTasksWithDiagnostics(rootDir: string): Promise<{
  tasks: TaskCard[]
  diagnostics: TaskRepositoryDiagnostic[]
}> {
  const matches = await fg(".tasks/tasks/*.md", {
    cwd: rootDir,
    dot: true,
    onlyFiles: true,
    unique: true,
  })

  const tasks: TaskCard[] = []
  const diagnostics: TaskRepositoryDiagnostic[] = []

  for (const match of matches) {
    try {
      tasks.push(await parseTaskFile(rootDir, match))
    } catch (error) {
      diagnostics.push({
        severity: "warning",
        source: normalizePath(match),
        message: `Failed to parse ${normalizePath(match)}: ${String(error)}`,
      })
    }
  }

  return {
    tasks: tasks.sort((left, right) => left.id.localeCompare(right.id)),
    diagnostics,
  }
}

function toFrontmatterTask(input: TaskCard): Record<string, unknown> {
  return {
    id: input.id,
    title: input.title,
    status: input.status,
    source_file: input.source_file,
    updated_at: input.updated_at,
    required_agents: input.required_agents ?? [],
    required_skills: input.required_skills ?? [],
    artifacts: input.artifacts ?? [],
    ...(input.blocked_reason ? { blocked_reason: input.blocked_reason } : {}),
    metadata: input.metadata ?? {},
  }
}

export class TaskMarkdownRepository implements TaskRepository {
  constructor(private readonly rootDir: string) {}

  private getTasksDir(): string {
    return join(this.rootDir, ".tasks", "tasks")
  }

  private toAbsoluteTaskPath(sourceFile: string): string {
    return join(this.rootDir, sourceFile)
  }

  private async getExistingTask(id: string): Promise<TaskCard> {
    const task = await this.loadTaskById(id)
    if (!task) {
      throw new Error(`Task not found: ${id}`)
    }

    return task
  }

  private async writeTaskFile(task: TaskCard, content = ""): Promise<TaskCard> {
    const absolutePath = this.toAbsoluteTaskPath(task.source_file)
    await mkdir(join(absolutePath, ".."), { recursive: true })
    const serialized = matter.stringify(content, toFrontmatterTask(task))
    await atomicWrite(absolutePath, serialized)
    return task
  }

  async loadTasks(): Promise<TaskCard[]> {
    const result = await loadCanonicalTasksWithDiagnostics(this.rootDir)
    return result.tasks
  }

  async loadTaskById(id: string): Promise<TaskCard | null> {
    const tasks = await this.loadTasks()
    return tasks.find((task) => task.id === id) ?? null
  }

  async writeTaskStatus(id: string, input: StatusWriteInput): Promise<TaskCard> {
    const task = await this.getExistingTask(id)
    const rawTask = await readFile(this.toAbsoluteTaskPath(task.source_file), "utf8")
    const parsed = matter(rawTask)

    const updatedTask = parseTaskCard({
      ...task,
      ...parsed.data,
      status: input.to,
      blocked_reason: input.blocked_reason,
      updated_at: new Date().toISOString(),
      source_file: task.source_file,
    })

    return this.writeTaskFile(updatedTask, parsed.content)
  }

  async writeTaskMetadata(id: string, input: TaskPatch): Promise<TaskCard> {
    const task = await this.getExistingTask(id)
    const rawTask = await readFile(this.toAbsoluteTaskPath(task.source_file), "utf8")
    const parsed = matter(rawTask)

    const updatedTask = parseTaskCard({
      ...task,
      ...parsed.data,
      ...input,
      metadata: {
        ...(task.metadata ?? {}),
        ...(parsed.data.metadata as Record<string, unknown> | undefined),
        ...(input.metadata ?? {}),
      },
      updated_at: input.updated_at ?? new Date().toISOString(),
      source_file: task.source_file,
    })

    return this.writeTaskFile(updatedTask, parsed.content)
  }

  async createTask(input: CreateTaskInput): Promise<TaskCard> {
    await mkdir(this.getTasksDir(), { recursive: true })

    const createdTask = parseTaskCard({
      ...input,
      required_agents: input.required_agents ?? [],
      required_skills: input.required_skills ?? [],
      artifacts: input.artifacts ?? [],
      metadata: input.metadata ?? {},
    })

    return this.writeTaskFile(createdTask)
  }
}
