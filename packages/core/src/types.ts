import type { ResourceAssignment, ResourceRecord } from "./resources/types.js"

export const TASK_STATUSES = [
  "planned",
  "active",
  "review",
  "done",
  "blocked",
  "parked",
  "cancelled",
] as const

export type TaskStatus = (typeof TASK_STATUSES)[number]

export interface TaskCard {
  id: string
  title: string
  status: TaskStatus
  source_file: string
  updated_at: string
  description?: string
  priority?: "low" | "medium" | "high"
  assignees?: string[]
  required_agents?: string[]
  required_skills?: string[]
  resources?: ResourceAssignment[]
  progress?: number
  artifacts?: string[]
  blocked_reason?: string
  metadata?: Record<string, unknown>
}

export interface GateResult {
  key: string
  ok: boolean
  reason?: string
}

export interface PreflightInput {
  task: TaskCard
  targetStatus: TaskStatus
  availableAgents?: string[]
  availableSkills?: string[]
  availableResources?: ResourceRecord[]
  gateResults?: GateResult[]
}

export interface PreflightResult {
  ok: boolean
  nextStatus: TaskStatus
  reason?: string
}

export interface TransitionResult {
  ok: boolean
  nextStatus?: TaskStatus
  reason?: string
}

export type ActorMode = "orchestrator" | "single-agent"
export type ExecutionMode = "in-band" | "side-channel"

export interface ContractPatch {
  blocked_reason?: string
  metadata?: Record<string, unknown>
}

export interface EnforceKanbanContractInput {
  task: TaskCard
  targetStatus: TaskStatus
  actorMode?: ActorMode
  executionMode?: ExecutionMode
}

export interface ContractResult {
  ok: boolean
  nextStatus: TaskStatus
  reason?: string
  exception?: boolean
  patch: ContractPatch
}

export const TASK_EVENT_PREFLIGHT_RESULTS = ["passed", "failed", "skipped"] as const

export type TaskEventInitiator = "user" | "agent" | "system"
export type TaskEventPreflightResult = (typeof TASK_EVENT_PREFLIGHT_RESULTS)[number]

export interface TaskEvent {
  event_id: string
  correlation_id: string
  task_id: string
  from_status: TaskStatus
  to_status: TaskStatus
  timestamp: string
  source_file: string
  initiator: TaskEventInitiator
  preflight_result: TaskEventPreflightResult
}

export interface CreateTaskEventInput {
  task: TaskCard
  from: TaskStatus
  to: TaskStatus
  correlationId: string
  initiator: TaskEventInitiator
  preflightResult: TaskEventPreflightResult
  now?: () => string
  eventIdFactory?: () => string
}
