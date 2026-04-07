import { describe, it, expect } from 'vitest';
import { normalizeResources } from '../../packages/core/src/resources/normalize.js';
import { createResourceRegistry } from '../../packages/core/src/resources/registry.js';
import type { ResourceAssignment, ResourceRecord } from '../../packages/core/src/resources/types.js';

describe('normalizeResources', () => {
  it('returns empty array when all inputs are undefined', () => {
    expect(normalizeResources()).toEqual([]);
  });

  it('passes through resources array unchanged', () => {
    const resources: ResourceAssignment[] = [
      { kind: 'agent', name: 'backend', required: true },
    ];
    expect(normalizeResources(resources)).toEqual(resources);
  });

  it('converts required_agents to agent assignments', () => {
    const result = normalizeResources(undefined, ['backend', 'frontend']);
    expect(result).toEqual([
      { kind: 'agent', name: 'backend', required: true },
      { kind: 'agent', name: 'frontend', required: true },
    ]);
  });

  it('converts required_skills to skill assignments', () => {
    const result = normalizeResources(undefined, undefined, ['tdd', 'review']);
    expect(result).toEqual([
      { kind: 'skill', name: 'tdd', required: true },
      { kind: 'skill', name: 'review', required: true },
    ]);
  });

  it('merges all sources and deduplicates', () => {
    const resources: ResourceAssignment[] = [
      { kind: 'agent', name: 'backend', required: true },
      { kind: 'mcp', name: 'tavily', required: false },
    ];
    const result = normalizeResources(resources, ['backend', 'frontend'], ['tdd']);
    expect(result).toHaveLength(4);
    expect(result[0]).toEqual({ kind: 'agent', name: 'backend', required: true });
    expect(result[1]).toEqual({ kind: 'mcp', name: 'tavily', required: false });
    expect(result[2]).toEqual({ kind: 'agent', name: 'frontend', required: true });
    expect(result[3]).toEqual({ kind: 'skill', name: 'tdd', required: true });
  });

  it('resources array wins over legacy fields for duplicates', () => {
    const resources: ResourceAssignment[] = [
      { kind: 'agent', name: 'backend', required: false },
    ];
    const result = normalizeResources(resources, ['backend']);
    expect(result).toHaveLength(1);
    expect(result[0].required).toBe(false);
  });
});

describe('createResourceRegistry', () => {
  const records: ResourceRecord[] = [
    { kind: 'agent', name: 'backend', available: true },
    { kind: 'agent', name: 'frontend', available: false },
    { kind: 'skill', name: 'tdd', available: true },
    { kind: 'mcp', name: 'tavily', available: true },
  ];
  const registry = createResourceRegistry(records);

  it('all() returns copy of all records', () => {
    const all = registry.all();
    expect(all).toHaveLength(4);
    expect(all).not.toBe(records);
  });

  it('byKind() filters correctly', () => {
    expect(registry.byKind('agent')).toHaveLength(2);
    expect(registry.byKind('skill')).toHaveLength(1);
    expect(registry.byKind('tool')).toHaveLength(0);
  });

  it('find() returns matching record', () => {
    expect(registry.find('agent', 'backend')).toEqual(records[0]);
  });

  it('find() returns undefined for missing', () => {
    expect(registry.find('agent', 'devops')).toBeUndefined();
  });

  it('available() filters by available flag', () => {
    const avail = registry.available();
    expect(avail).toHaveLength(3);
    expect(avail.every(r => r.available)).toBe(true);
  });
});
