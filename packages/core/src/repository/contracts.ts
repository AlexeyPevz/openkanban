import { z } from "zod"

import { TaskCardSchema, TaskStatusSchema } from "../schemas.js"
import type { TaskCard, TaskStatus } from "../types.js"
import type { ResourceAssignment } from "../resources/types.js"

export const BoardColumnSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
})

export const AgentRecordSchema = z.object({
  id: z.string().min(1),
  label: z.string().optional(),
})

export const AgentRegistrySchema = z.object({
  local: z.array(AgentRecordSchema).default([]),
  host: z.array(AgentRecordSchema).default([]),
  ad_hoc: z.array(AgentRecordSchema).default([]),
})

export const BoardSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  columns: z.array(BoardColumnSchema).min(1),
  readOnly: z.boolean().optional(),
  agent_registry: AgentRegistrySchema.default({ local: [], host: [], ad_hoc: [] }),
})

export type BoardColumn = z.infer<typeof BoardColumnSchema>
export type AgentRecord = z.infer<typeof AgentRecordSchema>
export type AgentRegistry = z.infer<typeof AgentRegistrySchema>
export type Board = z.infer<typeof BoardSchema>

export const StatusWriteInputSchema = z.object({
  from: TaskStatusSchema,
  to: TaskStatusSchema,
  blocked_reason: z.string().optional(),
})

export interface StatusWriteInput {
  from: TaskStatus
  to: TaskStatus
  blocked_reason?: string
}

export interface TaskPatch {
  title?: string
  metadata?: Record<string, unknown>
  blocked_reason?: string
  updated_at?: string
  resources?: ResourceAssignment[]
}

export interface CreateTaskInput {
  id: string
  title: string
  status: TaskStatus
  source_file: string
  updated_at: string
  required_agents?: string[]
  required_skills?: string[]
  resources?: ResourceAssignment[]
  artifacts?: string[]
  blocked_reason?: string
  metadata?: Record<string, unknown>
}

export interface BoardRepository {
  loadBoard(): Promise<Board>
}

export interface TaskRepository {
  loadTasks(): Promise<TaskCard[]>
  loadTaskById(id: string): Promise<TaskCard | null>
  writeTaskStatus(id: string, input: StatusWriteInput): Promise<TaskCard>
  writeTaskMetadata(id: string, input: TaskPatch): Promise<TaskCard>
  createTask(input: CreateTaskInput): Promise<TaskCard>
}

export function parseTaskCard(input: unknown): TaskCard {
  return TaskCardSchema.parse(input)
}
