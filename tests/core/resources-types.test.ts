import { describe, it, expect } from 'vitest';
import {
  ResourceKindSchema,
  ResourceRecordSchema,
  ResourceAssignmentSchema,
} from '@openkanban/core';

describe('ResourceKindSchema', () => {
  it('accepts valid kinds', () => {
    for (const kind of ['agent', 'skill', 'mcp', 'tool']) {
      expect(ResourceKindSchema.parse(kind)).toBe(kind);
    }
  });

  it('rejects invalid kind', () => {
    expect(() => ResourceKindSchema.parse('plugin')).toThrow();
  });
});

describe('ResourceRecordSchema', () => {
  it('parses a full record', () => {
    const input = {
      kind: 'agent',
      name: 'backend',
      description: 'Backend agent',
      available: true,
      meta: { model: 'gpt-5' },
    };
    const result = ResourceRecordSchema.parse(input);
    expect(result).toEqual(input);
  });

  it('parses minimal record (no optional fields)', () => {
    const result = ResourceRecordSchema.parse({
      kind: 'mcp',
      name: 'tavily',
      available: false,
    });
    expect(result.kind).toBe('mcp');
    expect(result.description).toBeUndefined();
    expect(result.meta).toBeUndefined();
  });

  it('rejects record with empty name', () => {
    expect(() =>
      ResourceRecordSchema.parse({ kind: 'tool', name: '', available: true }),
    ).toThrow();
  });

  it('rejects record without required fields', () => {
    expect(() => ResourceRecordSchema.parse({ kind: 'agent' })).toThrow();
  });
});

describe('ResourceAssignmentSchema', () => {
  it('parses with explicit required', () => {
    const result = ResourceAssignmentSchema.parse({
      kind: 'skill',
      name: 'tdd',
      required: false,
    });
    expect(result.required).toBe(false);
  });

  it('defaults required to true', () => {
    const result = ResourceAssignmentSchema.parse({
      kind: 'agent',
      name: 'frontend',
    });
    expect(result.required).toBe(true);
  });

  it('rejects assignment with invalid kind', () => {
    expect(() =>
      ResourceAssignmentSchema.parse({ kind: 'x', name: 'y', required: true }),
    ).toThrow();
  });
});
