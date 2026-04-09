import { describe, it, expect } from 'vitest';
import {
  TaskCardSchema,
  getTaskResources,
  normalizeResources,
  type TaskCard,
  type ResourceAssignment,
} from '@openkanban/core';

describe('TaskCard with resources', () => {
  it('parses TaskCard with resources field', () => {
    const input = {
      id: 'task-1',
      title: 'Test task',
      status: 'planned',
      source_file: '.tasks/tasks/task-1.md',
      updated_at: '2026-04-07T00:00:00Z',
      resources: [
        { kind: 'agent', name: 'backend', required: true },
        { kind: 'mcp', name: 'tavily', required: false },
      ],
    };
    const result = TaskCardSchema.parse(input);
    expect(result.resources).toHaveLength(2);
    expect(result.resources[0].kind).toBe('agent');
  });

  it('defaults resources to empty array', () => {
    const input = {
      id: 'task-2',
      title: 'No resources',
      status: 'active',
      source_file: '.tasks/tasks/task-2.md',
      updated_at: '2026-04-07T00:00:00Z',
    };
    const result = TaskCardSchema.parse(input);
    expect(result.resources).toEqual([]);
  });
});

describe('getTaskResources', () => {
  it('returns normalized resources from task', () => {
    const task: TaskCard = {
      id: 'task-3',
      title: 'Mixed',
      status: 'planned',
      source_file: '.tasks/tasks/task-3.md',
      updated_at: '2026-04-07T00:00:00Z',
      required_agents: ['backend'],
      required_skills: ['tdd'],
      resources: [{ kind: 'mcp', name: 'tavily', required: true }],
    };
    const result = getTaskResources(task);
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.name).sort()).toEqual(['backend', 'tavily', 'tdd']);
  });

  it('returns empty array for task with no resources or legacy fields', () => {
    const task: TaskCard = {
      id: 'task-4',
      title: 'Plain',
      status: 'done',
      source_file: '.tasks/tasks/task-4.md',
      updated_at: '2026-04-07T00:00:00Z',
    };
    const result = getTaskResources(task);
    expect(result).toEqual([]);
  });
});
