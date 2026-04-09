import { describe, it, expect } from 'vitest';
import { getTaskResources } from '../../packages/desktop/src/lib/task-resources.js';
import type { TaskCard } from '@openkanban/core';

describe('desktop task resources helper', () => {
  it('normalizes legacy agent and skill fields without importing core runtime barrel', () => {
    const task = {
      id: 'task-1',
      title: 'Fix desktop bundle',
      status: 'planned',
      required_agents: ['frontend'],
      required_skills: ['tdd'],
    } as TaskCard;

    expect(getTaskResources(task)).toEqual([
      { kind: 'agent', name: 'frontend', required: true },
      { kind: 'skill', name: 'tdd', required: true },
    ]);
  });
});
