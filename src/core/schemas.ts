import { z } from "zod"

import { TASK_EVENT_PREFLIGHT_RESULTS, TASK_STATUSES } from "./types.js"

export const TaskStatusSchema = z.enum(TASK_STATUSES)

export const TaskPrioritySchema = z.enum(["low", "medium", "high"])

export const TaskCardSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  status: TaskStatusSchema,
  source_file: z.string(),
  updated_at: z.string().min(1),
  description: z.string().default(""),
  priority: TaskPrioritySchema.default("medium"),
  assignees: z.array(z.string()).default([]),
  required_agents: z.array(z.string()).default([]),
  required_skills: z.array(z.string()).default([]),
  progress: z.number().default(0),
  artifacts: z.array(z.string()).default([]),
  blocked_reason: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
})

export const GateResultSchema = z.object({
  key: z.string().min(1),
  ok: z.boolean(),
  reason: z.string().optional(),
})

export const PreflightInputSchema = z.object({
  task: TaskCardSchema,
  targetStatus: TaskStatusSchema,
  availableAgents: z.array(z.string()).default([]),
  availableSkills: z.array(z.string()).default([]),
  gateResults: z.array(GateResultSchema).default([]),
})

export const PreflightResultSchema = z.object({
  ok: z.boolean(),
  nextStatus: TaskStatusSchema,
  reason: z.string().optional(),
})

export const TaskEventSchema = z.object({
  event_id: z.string().min(1),
  correlation_id: z.string().min(1),
  task_id: z.string().min(1),
  from_status: TaskStatusSchema,
  to_status: TaskStatusSchema,
  timestamp: z.string().min(1),
  source_file: z.string().min(1),
  initiator: z.enum(["user", "agent", "system"]),
  preflight_result: z.enum(TASK_EVENT_PREFLIGHT_RESULTS),
})

export const CreateTaskEventInputSchema = z.object({
  task: TaskCardSchema,
  from: TaskStatusSchema,
  to: TaskStatusSchema,
  correlationId: z.string().min(1),
  initiator: z.enum(["user", "agent", "system"]),
  preflightResult: z.enum(TASK_EVENT_PREFLIGHT_RESULTS),
})

export const EnforceKanbanContractInputSchema = z.object({
  task: TaskCardSchema,
  targetStatus: TaskStatusSchema,
  actorMode: z.enum(["orchestrator", "single-agent"]).default("single-agent"),
  executionMode: z.enum(["in-band", "side-channel"]).default("in-band"),
})

export const ContractPatchSchema = z.object({
  blocked_reason: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
})

export const ContractResultSchema = z.object({
  ok: z.boolean(),
  nextStatus: TaskStatusSchema,
  reason: z.string().optional(),
  exception: z.boolean().default(false),
  patch: ContractPatchSchema,
})
